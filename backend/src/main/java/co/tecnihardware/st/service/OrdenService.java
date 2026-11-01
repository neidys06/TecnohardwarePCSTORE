package co.tecnihardware.st.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import co.tecnihardware.st.config.PropiedadesTienda;
import co.tecnihardware.st.dto.AdicionalRequest;
import co.tecnihardware.st.dto.DiagnosticoRequest;
import co.tecnihardware.st.dto.OrdenDTO;
import co.tecnihardware.st.dto.RepuestoRequest;
import co.tecnihardware.st.exception.ConflictoException;
import co.tecnihardware.st.exception.RecursoNoEncontradoException;
import co.tecnihardware.st.exception.ReglaDeNegocioException;
import co.tecnihardware.st.model.Autorizacion;
import co.tecnihardware.st.model.DecisionCliente;
import co.tecnihardware.st.model.Equipo;
import co.tecnihardware.st.model.EstadoOrden;
import co.tecnihardware.st.model.Evidencia;
import co.tecnihardware.st.model.Mantenimiento;
import co.tecnihardware.st.model.MomentoEvidencia;
import co.tecnihardware.st.model.OrdenServicio;
import co.tecnihardware.st.model.TipoAutorizacion;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.EquipoRepository;
import co.tecnihardware.st.repository.OrdenServicioRepository;
import co.tecnihardware.st.repository.UsuarioRepository;
import co.tecnihardware.st.util.Formato;

/**
 * Ciclo de vida de la orden de servicio (RF-04 a RF-08 y RF-18). Cada método es una
 * transacción: si algo falla, no queda nada a medias (ni registros ni archivos).
 */
@Service
@Transactional(readOnly = true)
public class OrdenService {

    private static final Logger log = LoggerFactory.getLogger(OrdenService.class);

    private final OrdenServicioRepository ordenes;
    private final EquipoRepository equipos;
    private final UsuarioRepository usuarios;
    private final ArchivoService archivos;
    private final NotificacionService notificaciones;
    private final ConfiguracionService configuracion;
    private final OrdenMapper mapper;
    private final ObjectMapper json;
    private final Clock reloj;
    private final PropiedadesTienda tienda;

    public OrdenService(OrdenServicioRepository ordenes, EquipoRepository equipos, UsuarioRepository usuarios,
            ArchivoService archivos, NotificacionService notificaciones, ConfiguracionService configuracion,
            OrdenMapper mapper, ObjectMapper json, Clock reloj, PropiedadesTienda tienda) {
        this.tienda = tienda;
        this.ordenes = ordenes;
        this.equipos = equipos;
        this.usuarios = usuarios;
        this.archivos = archivos;
        this.notificaciones = notificaciones;
        this.configuracion = configuracion;
        this.mapper = mapper;
        this.json = json;
        this.reloj = reloj;
    }

    // ----- Consultas ---------------------------------------------------------------------

    public List<OrdenDTO> listar(EstadoOrden estado) {
        BigDecimal diag = configuracion.actual().getValorDiagnostico();
        List<OrdenServicio> lista = estado == null ? ordenes.listarTodas() : ordenes.listarPorEstado(estado);
        return lista.stream().map(o -> mapper.aDTO(o, diag, true)).toList();
    }

    public OrdenDTO obtener(String codigo) {
        return aDTO(buscar(codigo));
    }

    // ----- RF-04 · Nueva orden -----------------------------------------------------------

    /**
     * Nueva orden con la falla reportada y quién de la tienda recibió el equipo. Las fotos de
     * ingreso pueden adjuntarse ahora o después, pero antes del diagnóstico (Acta 5).
     */
    @Transactional
    public OrdenDTO crear(Long idEquipo, String falla, String accesorios, LocalDate fechaIngreso, String recibio,
            List<MultipartFile> fotos, Long idUsuario) {
        String fallaLimpia = falla == null ? "" : falla.trim();
        if (fallaLimpia.length() < 5 || fallaLimpia.length() > 2000) {
            throw new ReglaDeNegocioException("Describe la falla reportada (entre 5 y 2000 caracteres).", "falla",
                    "Entre 5 y 2000 caracteres.");
        }
        String quienRecibe = personalDeLaTienda(recibio, "recibio", "Elige quién recibió el equipo.");
        List<byte[]> imagenes = leerImagenes(fotos);
        Equipo equipo = equipos.findById(idEquipo).orElseThrow(() -> new RecursoNoEncontradoException("El equipo"));
        if (ordenes.existsByEquipoIdAndEstadoIn(idEquipo, EstadoOrden.abiertos())) {
            throw new ConflictoException("Este equipo ya tiene una orden abierta.");
        }
        LocalDate hoy = LocalDate.now(reloj);
        LocalDate fecha = fechaIngreso == null ? hoy : fechaIngreso;
        if (fecha.isAfter(hoy)) {
            throw new ReglaDeNegocioException("La fecha de ingreso no puede ser posterior a hoy.", "fechaIngreso",
                    "Fecha posterior a hoy.");
        }
        String texto = fallaLimpia;
        if (accesorios != null && !accesorios.isBlank()) {
            texto += " Accesorios: " + accesorios.trim() + ".";
        }
        Usuario por = usuario(idUsuario);
        OrdenServicio o = ordenes.save(OrdenServicio.abrir(equipo, texto, fecha, por, ahora(), quienRecibe));
        guardarFotos(o, MomentoEvidencia.INGRESO, imagenes, null);
        log.info("Orden {} creada para el equipo id={}", o.getCodigo(), idEquipo);
        return aDTO(o);
    }

    // ----- RF-05 · Diagnóstico -----------------------------------------------------------

    /** Diagnóstico y costo estimado → «Pendiente de autorización». */
    @Transactional
    public OrdenDTO registrarDiagnostico(String codigo, DiagnosticoRequest r, Long idUsuario) {
        OrdenServicio o = bloquear(codigo);
        o.exigirEstado(EstadoOrden.EN_DIAGNOSTICO);
        if (!o.tieneEvidencia(MomentoEvidencia.INGRESO)) {
            throw new ReglaDeNegocioException("Antes de pedir la autorización adjunta las fotos de ingreso.");
        }
        o.setDiagnostico(r.diagnostico().trim());
        o.setCostoEstimado(r.costo());
        o.getAutorizaciones().add(new Autorizacion(o, TipoAutorizacion.INICIAL, null, r.costo(), ahora()));
        o.cambiarEstado(EstadoOrden.PENDIENTE_AUTORIZACION,
                "Diagnóstico registrado · costo " + Formato.pesos(r.costo()), usuario(idUsuario), ahora());
        notificaciones.notificarAdministradores(AvisoFactory.autorizacionPendiente(o.getCodigo(), r.costo()));
        return aDTO(o);
    }

    // ----- RF-06 · Autorizaciones --------------------------------------------------------

    /** Autoriza → «Autorizada»; no autoriza → cerrada y se cobra el diagnóstico general. */
    @Transactional
    public OrdenDTO responderAutorizacion(String codigo, DecisionCliente decision, Long idUsuario) {
        exigirDecision(decision);
        OrdenServicio o = bloquear(codigo);
        o.exigirEstado(EstadoOrden.PENDIENTE_AUTORIZACION);
        Usuario por = usuario(idUsuario);
        o.autorizacionInicial().ifPresent(a -> a.responder(decision, ahora()));
        if (decision == DecisionCliente.AUTORIZA) {
            o.cambiarEstado(EstadoOrden.AUTORIZADA, "El cliente autorizó", por, ahora());
        } else {
            LocalDate hoy = LocalDate.now(reloj);
            o.setFechaEntrega(hoy.isBefore(o.getFechaIngreso()) ? o.getFechaIngreso() : hoy);
            o.setMontoCobrado(configuracion.actual().getValorDiagnostico());
            o.cambiarEstado(EstadoOrden.CERRADA_SOLO_DIAGNOSTICO,
                    "El cliente no autorizó · se cobra el diagnóstico general", por, ahora());
        }
        notificaciones.retirar(AvisoFactory.claveAutorizacion(o.getCodigo()));
        return aDTO(o);
    }

    /** Nueva falla durante la reparación → «En espera de autorización adicional». */
    @Transactional
    public OrdenDTO pedirAdicional(String codigo, AdicionalRequest r, Long idUsuario) {
        OrdenServicio o = bloquear(codigo);
        o.exigirEstado(EstadoOrden.AUTORIZADA);
        String descripcion = r.descripcion().trim();
        o.getAutorizaciones().add(new Autorizacion(o, TipoAutorizacion.ADICIONAL, descripcion, r.costo(), ahora()));
        o.cambiarEstado(EstadoOrden.EN_ESPERA_AUTORIZACION_ADICIONAL, "Nueva falla · +" + Formato.pesos(r.costo()),
                usuario(idUsuario), ahora());
        notificaciones.notificarAdministradores(
                AvisoFactory.adicionalPendiente(o.getCodigo(), descripcion, r.costo()));
        return aDTO(o);
    }

    /** Respuesta a la adicional; en ambos casos la reparación continúa («Autorizada»). */
    @Transactional
    public OrdenDTO responderAdicional(String codigo, DecisionCliente decision, Long idUsuario) {
        exigirDecision(decision);
        OrdenServicio o = bloquear(codigo);
        o.exigirEstado(EstadoOrden.EN_ESPERA_AUTORIZACION_ADICIONAL);
        Autorizacion a = o.adicionalPendiente()
                .orElseThrow(() -> new ConflictoException("No hay una autorización adicional pendiente."));
        a.responder(decision, ahora());
        String obs = decision == DecisionCliente.AUTORIZA ? "Adicional autorizado · +" + Formato.pesos(a.getCosto())
                : "Adicional no autorizado";
        o.cambiarEstado(EstadoOrden.AUTORIZADA, obs, usuario(idUsuario), ahora());
        notificaciones.retirar(AvisoFactory.claveAdicional(o.getCodigo()));
        return aDTO(o);
    }

    // ----- RF-08 · Evidencias ------------------------------------------------------------

    /** Fotos de ingreso, de la reparación (con nota) o de salida. */
    @Transactional
    public OrdenDTO agregarEvidencias(String codigo, MomentoEvidencia momento, String nota,
            List<MultipartFile> fotos) {
        List<byte[]> imagenes = leerImagenes(fotos);
        if (imagenes.isEmpty()) {
            throw new ReglaDeNegocioException("Selecciona al menos una fotografía.");
        }
        String notaLimpia = nota == null ? "" : nota.trim();
        if (momento == MomentoEvidencia.PROCESO && notaLimpia.length() < 5) {
            throw new ReglaDeNegocioException("Escribe una nota de lo que se está haciendo (mínimo 5 caracteres).",
                    "nota", "Mínimo 5 caracteres.");
        }
        if (notaLimpia.length() > 500) {
            throw new ReglaDeNegocioException("La nota admite máximo 500 caracteres.", "nota", "Máximo 500 caracteres.");
        }
        OrdenServicio o = bloquear(codigo);
        if (o.getEstado().esCerrado()) {
            throw new ConflictoException("La orden ya está cerrada; no se le pueden agregar fotografías.");
        }
        guardarFotos(o, momento, imagenes, momento == MomentoEvidencia.PROCESO ? notaLimpia : null);
        return aDTO(o);
    }

    // ----- RF-07 · Mantenimiento realizado -----------------------------------------------

    /**
     * Trabajo realizado, repuestos y fotos de salida obligatorias → «Finalizada».
     * El servicio lo hace una sola persona (Reunión 5): si no llega «responsable», se registra
     * automáticamente el nombre de la cuenta que guarda el mantenimiento.
     */
    @Transactional
    public OrdenDTO registrarMantenimiento(String codigo, String trabajo, String responsable, LocalDate fecha,
            String repuestosJson, List<MultipartFile> fotos, Long idUsuario) {
        String trabajoLimpio = trabajo == null ? "" : trabajo.trim();
        String responsableLimpio = responsable == null ? "" : responsable.trim();
        if (trabajoLimpio.length() < 10 || trabajoLimpio.length() > 4000) {
            throw new ReglaDeNegocioException("Describe el trabajo realizado (entre 10 y 4000 caracteres).", "trabajo",
                    "Entre 10 y 4000 caracteres.");
        }
        if (responsableLimpio.length() > 120) {
            throw new ReglaDeNegocioException("El nombre del responsable es demasiado largo.", "responsable",
                    "Máximo 120 caracteres.");
        }
        List<RepuestoRequest> repuestos = leerRepuestos(repuestosJson);
        List<byte[]> imagenes = leerImagenes(fotos);

        OrdenServicio o = bloquear(codigo);
        o.exigirEstado(EstadoOrden.AUTORIZADA);
        if (responsableLimpio.isEmpty()) {
            responsableLimpio = usuario(idUsuario).getNombre();
        }
        guardarFotos(o, MomentoEvidencia.SALIDA, imagenes, null);
        if (!o.tieneEvidencia(MomentoEvidencia.SALIDA)) {
            throw new ReglaDeNegocioException("Las fotos de salida son obligatorias. Adjunta al menos una.");
        }
        Mantenimiento m = new Mantenimiento(o, trabajoLimpio, responsableLimpio,
                fecha == null ? LocalDate.now(reloj) : fecha);
        repuestos.forEach(rep -> m.agregarRepuesto(rep.nombre().trim(), rep.cantidad()));
        o.setMantenimiento(m);
        o.cambiarEstado(EstadoOrden.FINALIZADA, "Mantenimiento registrado por " + responsableLimpio,
                usuario(idUsuario), ahora());
        return aDTO(o);
    }

    // ----- RF-18 · Entrega y anotaciones -------------------------------------------------

    /** Entrega al cliente: solo desde «Finalizada»; se fija el monto cobrado y quién entregó. */
    @Transactional
    public OrdenDTO entregar(String codigo, String recibidoPor, String entrego, Long idUsuario) {
        String quienEntrega = personalDeLaTienda(entrego, "entregadoPor", "Elige quién entregó el equipo.");
        OrdenServicio o = bloquear(codigo);
        o.exigirEstado(EstadoOrden.FINALIZADA);
        LocalDate hoy = LocalDate.now(reloj);
        o.setFechaEntrega(hoy.isBefore(o.getFechaIngreso()) ? o.getFechaIngreso() : hoy);
        o.setRecibidoPor(recibidoPor.trim());
        o.setEntregoEquipo(quienEntrega);
        o.setMontoCobrado(o.calcularMonto(configuracion.actual().getValorDiagnostico()));
        o.cambiarEstado(EstadoOrden.ENTREGADA,
                "Entregado por " + quienEntrega + " · recibido por " + recibidoPor.trim(), usuario(idUsuario), ahora());
        log.info("Orden {} entregada", o.getCodigo());
        return aDTO(o);
    }

    /** Anotación en el historial sin cambio de estado (p. ej. «Mensaje enviado por WhatsApp»). */
    @Transactional
    public OrdenDTO anotar(String codigo, String texto, Long idUsuario) {
        OrdenServicio o = bloquear(codigo);
        o.anotar(texto.trim(), usuario(idUsuario), ahora());
        return aDTO(o);
    }

    // ----- Apoyo -------------------------------------------------------------------------

    private String personalDeLaTienda(String nombre, String campo, String mensaje) {
        String encontrado = tienda.buscar(nombre);
        if (encontrado == null) {
            throw new ReglaDeNegocioException(mensaje, campo, "Elige una persona de la lista: " + String.join(" o ", tienda.personal()) + ".");
        }
        return encontrado;
    }

    private OrdenServicio buscar(String codigo) {
        Long id = OrdenServicio.idDesdeCodigo(codigo)
                .orElseThrow(() -> new RecursoNoEncontradoException("La orden"));
        return ordenes.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("La orden"));
    }

    /** Bloquea la orden para que dos acciones simultáneas no se pisen. */
    private OrdenServicio bloquear(String codigo) {
        Long id = OrdenServicio.idDesdeCodigo(codigo)
                .orElseThrow(() -> new RecursoNoEncontradoException("La orden"));
        return ordenes.bloquear(id).orElseThrow(() -> new RecursoNoEncontradoException("La orden"));
    }

    /** Escribe los cambios pendientes para que las fotos y autorizaciones nuevas ya tengan id. */
    private OrdenDTO aDTO(OrdenServicio o) {
        ordenes.flush();
        return mapper.aDTO(o, configuracion.actual().getValorDiagnostico(), true);
    }

    private Usuario usuario(Long id) {
        return usuarios.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("La cuenta"));
    }

    private LocalDateTime ahora() {
        return LocalDateTime.now(reloj);
    }

    private static void exigirDecision(DecisionCliente decision) {
        if (decision != DecisionCliente.AUTORIZA && decision != DecisionCliente.NO_AUTORIZA) {
            throw new ReglaDeNegocioException("La respuesta debe ser AUTORIZA o NO_AUTORIZA.", "decision",
                    "Respuesta no válida.");
        }
    }

    /** Lee y valida todas las fotos antes de guardar cualquiera. */
    private List<byte[]> leerImagenes(List<MultipartFile> fotos) {
        List<byte[]> imagenes = new ArrayList<>();
        if (fotos == null) {
            return imagenes;
        }
        List<MultipartFile> validas = fotos.stream().filter(f -> f != null && !f.isEmpty()).toList();
        if (validas.size() > archivos.fotosPorCarga()) {
            throw new ReglaDeNegocioException("Puedes subir máximo " + archivos.fotosPorCarga() + " fotos a la vez.");
        }
        for (MultipartFile f : validas) {
            byte[] datos = ArchivoService.bytes(f);
            archivos.exigirImagen(datos, f.getOriginalFilename() == null ? "foto" : f.getOriginalFilename());
            imagenes.add(datos);
        }
        return imagenes;
    }

    private void guardarFotos(OrdenServicio o, MomentoEvidencia momento, List<byte[]> imagenes, String nota) {
        for (byte[] datos : imagenes) {
            ArchivoService.Tipo tipo = ArchivoService.tipoReal(datos).orElseThrow();
            String ruta = archivos.guardar("evidencias/" + o.getId(), datos, tipo);
            o.getEvidencias().add(new Evidencia(o, momento, ruta, tipo.getMime(), datos.length, nota, ahora()));
        }
    }

    private List<RepuestoRequest> leerRepuestos(String repuestosJson) {
        if (repuestosJson == null || repuestosJson.isBlank()) {
            return List.of();
        }
        List<RepuestoRequest> lista;
        try {
            lista = json.readValue(repuestosJson, new TypeReference<List<RepuestoRequest>>() {
            });
        } catch (JsonProcessingException e) {
            throw new ReglaDeNegocioException("La lista de repuestos no es válida.", "repuestos", "Formato no válido.");
        }
        if (lista.size() > 50) {
            throw new ReglaDeNegocioException("Máximo 50 repuestos por mantenimiento.");
        }
        for (RepuestoRequest r : lista) {
            if (r == null || r.nombre() == null || r.nombre().trim().length() < 2 || r.nombre().trim().length() > 120) {
                throw new ReglaDeNegocioException("Escribe el nombre de cada repuesto (2 a 120 caracteres).",
                        "repuestos", "Nombre no válido.");
            }
            if (r.cantidad() == null || r.cantidad() < 1 || r.cantidad() > 999) {
                throw new ReglaDeNegocioException("La cantidad de cada repuesto debe estar entre 1 y 999.", "repuestos",
                        "Cantidad no válida.");
            }
        }
        return lista;
    }
}
