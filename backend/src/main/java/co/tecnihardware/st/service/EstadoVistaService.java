package co.tecnihardware.st.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.tecnihardware.st.config.PropiedadesTienda;
import co.tecnihardware.st.dto.EstadoVistaDTO;
import co.tecnihardware.st.dto.EstadoVistaDTO.AdicionalVista;
import co.tecnihardware.st.dto.EstadoVistaDTO.ClienteVista;
import co.tecnihardware.st.dto.EstadoVistaDTO.EquipoVista;
import co.tecnihardware.st.dto.EstadoVistaDTO.FotoProcesoVista;
import co.tecnihardware.st.dto.EstadoVistaDTO.FotosVista;
import co.tecnihardware.st.dto.EstadoVistaDTO.ListaPdfVista;
import co.tecnihardware.st.dto.EstadoVistaDTO.NotificacionVista;
import co.tecnihardware.st.dto.EstadoVistaDTO.OrdenVista;
import co.tecnihardware.st.dto.EstadoVistaDTO.SesionVista;
import co.tecnihardware.st.model.Cliente;
import co.tecnihardware.st.model.ConfiguracionSistema;
import co.tecnihardware.st.model.DecisionCliente;
import co.tecnihardware.st.model.Equipo;
import co.tecnihardware.st.model.Evidencia;
import co.tecnihardware.st.model.MomentoEvidencia;
import co.tecnihardware.st.model.OrdenServicio;
import co.tecnihardware.st.model.Rol;
import co.tecnihardware.st.model.TipoAutorizacion;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.ClienteRepository;
import co.tecnihardware.st.repository.EquipoRepository;
import co.tecnihardware.st.repository.ListaPreciosRepository;
import co.tecnihardware.st.repository.OrdenServicioRepository;
import co.tecnihardware.st.repository.UsuarioRepository;
import co.tecnihardware.st.security.UsuarioPrincipal;
import co.tecnihardware.st.util.Formato;

/** Arma el estado inicial de la interfaz, filtrado en el servidor según el rol (RNF-10). */
@Service
@Transactional(readOnly = true)
public class EstadoVistaService {

    private final ClienteRepository clientes;
    private final EquipoRepository equipos;
    private final OrdenServicioRepository ordenes;
    private final UsuarioRepository usuarios;
    private final ListaPreciosRepository listas;
    private final ConfiguracionService configuracion;
    private final NotificacionService notificaciones;
    private final PropiedadesTienda tienda;

    public EstadoVistaService(ClienteRepository clientes, EquipoRepository equipos, OrdenServicioRepository ordenes,
            UsuarioRepository usuarios, ListaPreciosRepository listas, ConfiguracionService configuracion,
            NotificacionService notificaciones, PropiedadesTienda tienda) {
        this.tienda = tienda;
        this.clientes = clientes;
        this.equipos = equipos;
        this.ordenes = ordenes;
        this.usuarios = usuarios;
        this.listas = listas;
        this.configuracion = configuracion;
        this.notificaciones = notificaciones;
    }

    public EstadoVistaDTO para(UsuarioPrincipal p) {
        boolean admin = p.esAdministrador();
        ConfiguracionSistema cfg = configuracion.actual();

        List<Cliente> listaClientes = admin ? clientes.listarTodos()
                : clientes.buscarConUsuario(p.getIdCliente()).map(List::of).orElse(List.of());
        List<Equipo> listaEquipos = admin ? equipos.listarTodos() : equipos.listarDeCliente(p.getIdCliente());
        List<OrdenServicio> listaOrdenes = admin ? ordenes.listarTodas() : ordenes.listarDeCliente(p.getIdCliente());

        Usuario cuentaAdmin = usuarios.findByRolAndActivoTrue(Rol.ADMINISTRADOR).stream().findFirst().orElse(null);
        String fotoAdmin = cuentaAdmin != null && cuentaAdmin.getFotoPerfil() != null
                ? CuentaService.urlFoto(cuentaAdmin.getId()) : null;
        String fotoCliente = null;
        if (!admin) {
            fotoCliente = usuarios.findById(p.getId()).filter(u -> u.getFotoPerfil() != null)
                    .map(u -> CuentaService.urlFoto(u.getId())).orElse(null);
        }
        ListaPdfVista listaPdf = listas.findFirstByVigenteTrueOrderBySubidaEnDesc()
                .map(l -> new ListaPdfVista(Formato.mes(l.getMes()), l.getNombreArchivo(),
                        ListaPreciosService.URL_ARCHIVO, l.getTamanoBytes(), Formato.fecha(l.getSubidaEn().toLocalDate())))
                .orElse(null);

        return new EstadoVistaDTO(
                new SesionVista(admin ? "admin" : "cliente", p.getNombre(), p.getUsername(),
                        p.getIdCliente() == null ? null : String.valueOf(p.getIdCliente())),
                listaClientes.stream().map(EstadoVistaService::cliente).toList(),
                listaEquipos.stream().map(EstadoVistaService::equipo).toList(),
                listaOrdenes.stream().map(EstadoVistaService::orden).toList(),
                cfg.getValorDiagnostico(), cfg.getUmbralProximoDias(), cfg.getPlantillaRecordatorio(),
                cfg.getColorSistema(),
                notificaciones.recientes(p.getId()).stream()
                        .map(n -> new NotificacionVista(String.valueOf(n.getId()), n.getTitulo(), n.getDetalle(),
                                n.getEnlace(), n.isLeida()))
                        .toList(),
                fotoAdmin, fotoCliente, listaPdf, admin ? tienda.personal() : List.of());
    }

    private static ClienteVista cliente(Cliente c) {
        return new ClienteVista(String.valueOf(c.getId()), c.getNombre(), Formato.cedula(c.getCedula()),
                Formato.telefono(c.getTelefono()), c.getUsuario().getUsuario(), Formato.fecha(c.getFechaRegistro()));
    }

    private static EquipoVista equipo(Equipo e) {
        return new EquipoVista(String.valueOf(e.getId()), String.valueOf(e.getCliente().getId()), e.getNombreTipo(),
                e.getMarcaModelo(), e.getSerial() == null ? "" : e.getSerial(), e.getObservaciones(),
                e.getPeriodoMantenimientoMeses());
    }

    private static OrdenVista orden(OrdenServicio o) {
        List<AdicionalVista> adicionales = o.getAutorizaciones().stream()
                .filter(a -> a.getTipo() == TipoAutorizacion.ADICIONAL)
                .map(a -> new AdicionalVista(a.getDescripcion() == null ? "" : a.getDescripcion(), a.getCosto(),
                        a.getDecision() == DecisionCliente.PENDIENTE ? null : a.getDecision() == DecisionCliente.AUTORIZA))
                .toList();
        FotosVista fotos = new FotosVista(
                urls(o, MomentoEvidencia.INGRESO),
                o.getEvidencias().stream().filter(e -> e.getMomento() == MomentoEvidencia.PROCESO)
                        .map(e -> new FotoProcesoVista(OrdenMapper.urlEvidencia(e.getId()),
                                e.getNota() == null ? "" : e.getNota(), Formato.fechaHora(e.getFechaCarga())))
                        .toList(),
                urls(o, MomentoEvidencia.SALIDA));
        var m = o.getMantenimiento();
        List<List<Object>> repuestos = m == null ? null
                : m.getRepuestos().stream().map(r -> List.<Object>of(r.getNombre(), r.getCantidad())).toList();
        List<List<String>> log = o.getHistorial().stream()
                .map(c -> List.of(Formato.fechaHora(c.getFechaHora()), c.getEstadoNuevo().getTexto(), c.getObservacion()))
                .toList();
        return new OrdenVista(o.getCodigo(), String.valueOf(o.getEquipo().getId()), Formato.fecha(o.getFechaIngreso()),
                o.getFallaReportada(), o.getEstado().getCodigo(), o.getDiagnostico() == null ? "" : o.getDiagnostico(),
                o.getCostoEstimado(), adicionales, m == null ? null : m.getTrabajoRealizado(), repuestos,
                m == null ? null : m.getResponsable(), fotos,
                o.getFechaEntrega() == null ? null : Formato.fecha(o.getFechaEntrega()), o.getMontoCobrado(), log,
                o.getRecibioEquipo(), o.getEntregoEquipo());
    }

    private static List<String> urls(OrdenServicio o, MomentoEvidencia momento) {
        return o.getEvidencias().stream().filter(e -> e.getMomento() == momento).map(Evidencia::getId)
                .map(OrdenMapper::urlEvidencia).toList();
    }
}
