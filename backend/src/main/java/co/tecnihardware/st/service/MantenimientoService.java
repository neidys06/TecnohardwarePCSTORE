package co.tecnihardware.st.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.tecnihardware.st.dto.MantenimientoDTO;
import co.tecnihardware.st.model.Equipo;
import co.tecnihardware.st.model.EstadoMantenimiento;
import co.tecnihardware.st.repository.EquipoRepository;
import co.tecnihardware.st.repository.RecordatorioMantenimientoRepository;
import co.tecnihardware.st.service.CalculadoraMantenimiento.Resultado;

/** RF-15 · Consulta de mantenimientos próximos y vencidos; RF-10 · alertas automáticas. */
@Service
@Transactional(readOnly = true)
public class MantenimientoService {

    private static final Logger log = LoggerFactory.getLogger(MantenimientoService.class);

    private final EquipoRepository equipos;
    private final RecordatorioMantenimientoRepository recordatorios;
    private final ConfiguracionService configuracion;
    private final NotificacionService notificaciones;
    private final CalculadoraMantenimiento calculadora;
    private final Clock reloj;

    public MantenimientoService(EquipoRepository equipos, RecordatorioMantenimientoRepository recordatorios,
            ConfiguracionService configuracion, NotificacionService notificaciones,
            CalculadoraMantenimiento calculadora, Clock reloj) {
        this.equipos = equipos;
        this.recordatorios = recordatorios;
        this.configuracion = configuracion;
        this.notificaciones = notificaciones;
        this.calculadora = calculadora;
        this.reloj = reloj;
    }

    /** Estado del mantenimiento de un equipo con la fecha de hoy y el umbral configurado. */
    public Resultado estadoDe(Equipo e) {
        return estadoDe(e, LocalDate.now(reloj), configuracion.actual().getUmbralProximoDias());
    }

    private Resultado estadoDe(Equipo e, LocalDate hoy, int umbral) {
        return calculadora.calcular(e.getPeriodoMantenimientoMeses(), calculadora.ultimoServicio(e.getOrdenes()), hoy,
                umbral);
    }

    /** Sin filtro trae vencidos, próximos y vigentes (no los que no tienen periodo). */
    public List<MantenimientoDTO> listar(EstadoMantenimiento filtro) {
        LocalDate hoy = LocalDate.now(reloj);
        int umbral = configuracion.actual().getUmbralProximoDias();
        Map<Long, LocalDateTime> ultimos = recordatorios.mapaUltimoPorEquipo();
        List<MantenimientoDTO> filas = new ArrayList<>();
        for (Equipo e : equipos.listarTodos()) {
            Resultado r = estadoDe(e, hoy, umbral);
            boolean incluir = filtro == null ? r.estado() != EstadoMantenimiento.SIN_PERIODO : r.estado() == filtro;
            if (incluir) {
                filas.add(fila(e, r, ultimos.get(e.getId())));
            }
        }
        filas.sort(Comparator.comparing(MantenimientoDTO::proximoMantenimiento,
                Comparator.nullsLast(Comparator.naturalOrder())).thenComparing(MantenimientoDTO::cliente));
        return filas;
    }

    /** RF-12 · Cuadro de mantenimiento de los equipos de cada cliente encontrado (Acta 4). */
    public Map<Long, List<MantenimientoDTO>> cuadroDeClientes(List<Long> idsClientes) {
        Map<Long, List<MantenimientoDTO>> cuadro = new LinkedHashMap<>();
        if (idsClientes.isEmpty()) {
            return cuadro;
        }
        LocalDate hoy = LocalDate.now(reloj);
        int umbral = configuracion.actual().getUmbralProximoDias();
        for (Equipo e : equipos.listarDeClientes(idsClientes)) {
            Resultado r = estadoDe(e, hoy, umbral);
            cuadro.computeIfAbsent(e.getCliente().getId(), k -> new ArrayList<>()).add(fila(e, r, null));
        }
        cuadro.values().forEach(l -> l.sort(Comparator.comparing(MantenimientoDTO::proximoMantenimiento,
                Comparator.nullsLast(Comparator.naturalOrder()))));
        return cuadro;
    }

    public MantenimientoDTO filaDe(Equipo e) {
        return fila(e, estadoDe(e), null);
    }

    private static MantenimientoDTO fila(Equipo e, Resultado r, LocalDateTime ultimoRecordatorio) {
        return new MantenimientoDTO(e.getId(), e.getCliente().getId(), e.getCliente().getNombre(),
                e.getCliente().getTelefono(), e.getMarcaModelo(), r.ultimoServicio(), r.proximoMantenimiento(),
                r.diasRestantes(), r.estado(), ultimoRecordatorio);
    }

    /**
     * RF-10 · Evalúa todos los equipos y genera, sin intervención de nadie: para la
     * administradora un aviso con los vencidos y otro con los próximos; para cada cliente
     * un aviso por equipo, que ve al entrar a su portal.
     *
     * @return {vencidos, próximos}
     */
    @Transactional
    public int[] evaluarAlertas() {
        LocalDate hoy = LocalDate.now(reloj);
        int umbral = configuracion.actual().getUmbralProximoDias();
        int vencidos = 0;
        int proximos = 0;
        List<Long> conAviso = new ArrayList<>();
        for (Equipo e : equipos.listarTodos()) {
            Resultado r = estadoDe(e, hoy, umbral);
            boolean vencido = r.estado() == EstadoMantenimiento.VENCIDO;
            if (!vencido && r.estado() != EstadoMantenimiento.PROXIMO) {
                continue;
            }
            if (vencido) {
                vencidos++;
            } else {
                proximos++;
            }
            conAviso.add(e.getId());
            notificaciones.notificar(e.getCliente().getUsuario(),
                    AvisoFactory.mantenimientoCliente(e.getId(), e.getMarcaModelo(), vencido, r.diasRestantes()));
        }
        if (vencidos > 0) {
            notificaciones.notificarAdministradores(AvisoFactory.mantenimientosVencidosAdmin(vencidos));
        } else {
            notificaciones.retirar("mant-vencidos");
        }
        if (proximos > 0) {
            notificaciones.notificarAdministradores(AvisoFactory.mantenimientosProximosAdmin(proximos));
        } else {
            notificaciones.retirar("mant-proximos");
        }
        // Los equipos que ya no están próximos ni vencidos pierden su aviso.
        notificaciones.retirarAvisosMantenimientoExcepto(conAviso);
        log.info("Alertas de mantenimiento {}: {} vencidos, {} próximos", hoy, vencidos, proximos);
        return new int[] { vencidos, proximos };
    }
}
