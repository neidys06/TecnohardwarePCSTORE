package co.tecnihardware.st.service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.tecnihardware.st.dto.EquipoDTO;
import co.tecnihardware.st.dto.EquipoRequest;
import co.tecnihardware.st.dto.HistorialEquipoDTO;
import co.tecnihardware.st.dto.MantenimientoDTO;
import co.tecnihardware.st.dto.OrdenDTO;
import co.tecnihardware.st.dto.RecordatorioDTO;
import co.tecnihardware.st.exception.RecursoNoEncontradoException;
import co.tecnihardware.st.exception.ReglaDeNegocioException;
import co.tecnihardware.st.model.Cliente;
import co.tecnihardware.st.model.Equipo;
import co.tecnihardware.st.model.EstadoMantenimiento;
import co.tecnihardware.st.model.RecordatorioMantenimiento;
import co.tecnihardware.st.model.TipoEquipo;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.ClienteRepository;
import co.tecnihardware.st.repository.EquipoRepository;
import co.tecnihardware.st.repository.RecordatorioMantenimientoRepository;
import co.tecnihardware.st.repository.TipoEquipoRepository;
import co.tecnihardware.st.repository.UsuarioRepository;
import co.tecnihardware.st.service.CalculadoraMantenimiento.Resultado;
import co.tecnihardware.st.util.Formato;

/** Equipos de los clientes (RF-03), historial (RF-09), recordatorio (RF-10) y periodo (RF-16). */
@Service
@Transactional(readOnly = true)
public class EquipoService {

    private static final Logger log = LoggerFactory.getLogger(EquipoService.class);
    private static final Set<Integer> PERIODOS = Set.of(3, 6, 12);

    private final EquipoRepository equipos;
    private final ClienteRepository clientes;
    private final TipoEquipoRepository tipos;
    private final UsuarioRepository usuarios;
    private final RecordatorioMantenimientoRepository recordatorios;
    private final MantenimientoService mantenimientos;
    private final ConfiguracionService configuracion;
    private final OrdenMapper mapper;
    private final Clock reloj;

    public EquipoService(EquipoRepository equipos, ClienteRepository clientes, TipoEquipoRepository tipos,
            UsuarioRepository usuarios, RecordatorioMantenimientoRepository recordatorios,
            MantenimientoService mantenimientos, ConfiguracionService configuracion, OrdenMapper mapper,
            Clock reloj) {
        this.equipos = equipos;
        this.clientes = clientes;
        this.tipos = tipos;
        this.usuarios = usuarios;
        this.recordatorios = recordatorios;
        this.mantenimientos = mantenimientos;
        this.configuracion = configuracion;
        this.mapper = mapper;
        this.reloj = reloj;
    }

    /** Categorías a la vista (Acta 4) y al final «Otros». */
    public List<String> tipos() {
        List<String> nombres = new ArrayList<>(
                tipos.findAllByOrderByOrdenAscNombreAsc().stream().map(TipoEquipo::getNombre).toList());
        nombres.add(TipoEquipo.OTROS);
        return nombres;
    }

    /** RF-03 · Registro de equipo asociado a un cliente existente. */
    @Transactional
    public EquipoDTO crear(EquipoRequest r) {
        if (r.idCliente() == null) {
            throw new ReglaDeNegocioException("Selecciona o registra primero al cliente.", "idCliente",
                    "Selecciona el cliente.");
        }
        Cliente cliente = clientes.findById(r.idCliente())
                .orElseThrow(() -> new ReglaDeNegocioException("Selecciona o registra primero al cliente.",
                        "idCliente", "El cliente no existe."));
        Equipo e = new Equipo(cliente, r.marcaModelo().trim(), LocalDateTime.now(reloj));
        aplicar(e, r);
        equipos.save(e);
        log.info("Equipo registrado id={} cliente={}", e.getId(), cliente.getId());
        return aDTO(e);
    }

    @Transactional
    public EquipoDTO actualizar(Long id, EquipoRequest r) {
        Equipo e = buscar(id);
        e.setMarcaModelo(r.marcaModelo().trim());
        aplicar(e, r);
        return aDTO(e);
    }

    private void aplicar(Equipo e, EquipoRequest r) {
        resolverTipo(e, r.tipo().trim(), r.tipoOtro());
        e.setSerial(r.serial() == null || r.serial().isBlank() ? null : r.serial().trim());
        e.setObservaciones(r.observaciones() == null ? "" : r.observaciones().trim());
        e.setPeriodoMantenimientoMeses(validarPeriodo(r.periodo()));
    }

    /** Categoría de la lista, o «Otros» con el tipo escrito (si coincide con una categoría, se usa esa). */
    private void resolverTipo(Equipo e, String tipo, String tipoOtro) {
        if (TipoEquipo.OTROS.equalsIgnoreCase(tipo)) {
            String escrito = tipoOtro == null ? "" : tipoOtro.trim();
            if (escrito.length() < 2) {
                throw new ReglaDeNegocioException("Escribe el tipo de equipo.", "tipoOtro", "Escribe el tipo de equipo.");
            }
            tipos.findByNombreIgnoreCase(escrito).ifPresentOrElse(t -> e.asignarTipo(t, null),
                    () -> e.asignarTipo(null, escrito));
            return;
        }
        TipoEquipo t = tipos.findByNombreIgnoreCase(tipo)
                .orElseThrow(() -> new ReglaDeNegocioException("Elige un tipo de equipo de la lista o «Otros».", "tipo",
                        "Tipo no válido."));
        e.asignarTipo(t, null);
    }

    private static Integer validarPeriodo(Integer meses) {
        if (meses != null && !PERIODOS.contains(meses)) {
            throw new ReglaDeNegocioException("El periodo debe ser de 3, 6 o 12 meses.", "periodo",
                    "3, 6 o 12 meses.");
        }
        return meses;
    }

    /** RF-16 · Periodo del mantenimiento preventivo; devuelve el nuevo estado del mantenimiento. */
    @Transactional
    public MantenimientoDTO cambiarPeriodo(Long id, Integer meses) {
        Equipo e = buscar(id);
        e.setPeriodoMantenimientoMeses(validarPeriodo(meses));
        return mantenimientos.filaDe(e);
    }

    /** RF-09 · Historial completo del equipo en orden cronológico. */
    public HistorialEquipoDTO historial(Long id) {
        return historial(buscar(id), true);
    }

    public HistorialEquipoDTO historial(Equipo e, boolean conUsuario) {
        Resultado r = mantenimientos.estadoDe(e);
        var valorDiagnostico = configuracion.actual().getValorDiagnostico();
        List<OrdenDTO> ordenes = e.getOrdenes().stream()
                .map(o -> mapper.aDTO(o, valorDiagnostico, conUsuario))
                .toList();
        return new HistorialEquipoDTO(e.getId(), e.getCliente().getId(), e.getCliente().getNombre(),
                e.getNombreTipo(), e.getMarcaModelo(), e.getSerial(), e.getObservaciones(),
                e.getPeriodoMantenimientoMeses(), r.ultimoServicio(), r.proximoMantenimiento(), r.diasRestantes(),
                r.estado(), ordenes);
    }

    /**
     * RF-10 · Prepara el recordatorio por WhatsApp con la plantilla configurada, registra
     * la fecha en que se generó y devuelve el enlace para abrir la conversación.
     */
    @Transactional
    public RecordatorioDTO recordatorio(Long id, Long idUsuario) {
        Equipo e = buscar(id);
        Cliente c = e.getCliente();
        if (c.getTelefono() == null) {
            throw new ReglaDeNegocioException(
                    "El cliente no tiene teléfono registrado. Complétalo para enviar el recordatorio.");
        }
        Resultado r = mantenimientos.estadoDe(e);
        if (r.proximoMantenimiento() == null) {
            throw new ReglaDeNegocioException("El equipo no tiene periodo de mantenimiento o servicio previo.");
        }
        String mensaje = Formato.llenarPlantilla(configuracion.actual().getPlantillaRecordatorio(), Map.of(
                "nombre", c.getNombre().split(" ")[0],
                "equipo", e.getMarcaModelo(),
                "estado", r.estado() == EstadoMantenimiento.VENCIDO ? "venció" : "vence",
                "fecha", Formato.fechaLarga(r.proximoMantenimiento())));
        Usuario quien = usuarios.findById(idUsuario).orElse(null);
        recordatorios.save(new RecordatorioMantenimiento(e, quien, LocalDateTime.now(reloj),
                r.proximoMantenimiento(), mensaje));
        return new RecordatorioDTO(mensaje, Formato.enlaceWhatsApp(c.getTelefono(), mensaje));
    }

    private Equipo buscar(Long id) {
        return equipos.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("El equipo"));
    }

    static EquipoDTO aDTO(Equipo e) {
        return new EquipoDTO(e.getId(), e.getCliente().getId(), e.getNombreTipo(), e.esOtro(), e.getMarcaModelo(),
                e.getSerial(), e.getObservaciones(), e.getPeriodoMantenimientoMeses());
    }
}
