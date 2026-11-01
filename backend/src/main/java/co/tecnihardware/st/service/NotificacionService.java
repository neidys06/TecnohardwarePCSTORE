package co.tecnihardware.st.service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.tecnihardware.st.dto.NotificacionDTO;
import co.tecnihardware.st.model.Notificacion;
import co.tecnihardware.st.model.Rol;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.NotificacionRepository;
import co.tecnihardware.st.repository.UsuarioRepository;
import co.tecnihardware.st.service.AvisoFactory.Aviso;

/** Avisos del sistema para la administradora y para el portal de cada cliente (RF-10). */
@Service
@Transactional(readOnly = true)
public class NotificacionService {

    private final NotificacionRepository notificaciones;
    private final UsuarioRepository usuarios;
    private final Clock reloj;

    public NotificacionService(NotificacionRepository notificaciones, UsuarioRepository usuarios, Clock reloj) {
        this.notificaciones = notificaciones;
        this.usuarios = usuarios;
        this.reloj = reloj;
    }

    @Transactional
    public void notificarAdministradores(Aviso aviso) {
        for (Usuario admin : usuarios.findByRolAndActivoTrue(Rol.ADMINISTRADOR)) {
            notificar(admin, aviso);
        }
    }

    /** Crea el aviso o, si ya existe con la misma clave, lo renueva y lo deja sin leer. */
    @Transactional
    public void notificar(Usuario destinatario, Aviso aviso) {
        Notificacion n = notificaciones.findByUsuarioIdAndClave(destinatario.getId(), aviso.clave())
                .orElseGet(() -> new Notificacion(destinatario, aviso.clave()));
        n.renovar(aviso.titulo(), aviso.detalle(), aviso.enlace(), aviso.idEquipo(), LocalDateTime.now(reloj));
        notificaciones.save(n);
    }

    /** Retira un aviso que ya no aplica (p. ej. el cliente ya respondió). */
    @Transactional
    public void retirar(String clave) {
        notificaciones.borrarPorClave(clave);
    }

    @Transactional
    public void retirarAvisosMantenimientoExcepto(Collection<Long> equiposConAviso) {
        if (equiposConAviso.isEmpty()) {
            notificaciones.borrarAvisosMantenimientoDeEquipos();
        } else {
            notificaciones.borrarAvisosMantenimientoExcepto(equiposConAviso);
        }
    }

    public List<NotificacionDTO> listar(Long idUsuario) {
        return notificaciones.findTop50ByUsuarioIdOrderByLeidaAscCreadaEnDesc(idUsuario).stream()
                .map(NotificacionService::aDTO)
                .toList();
    }

    /** Las más recientes primero (para la campana de la interfaz). */
    public List<Notificacion> recientes(Long idUsuario) {
        return notificaciones.findTop50ByUsuarioIdOrderByCreadaEnDesc(idUsuario);
    }

    /** Marca como leída una notificación propia o, sin id, todas. */
    @Transactional
    public void marcarLeidas(Long idUsuario, Long id) {
        if (id == null) {
            notificaciones.marcarTodasLeidas(idUsuario);
        } else {
            notificaciones.marcarLeida(idUsuario, id);
        }
    }

    static NotificacionDTO aDTO(Notificacion n) {
        return new NotificacionDTO(n.getId(), n.getTitulo(), n.getDetalle(), n.getEnlace(), n.isLeida(),
                n.getCreadaEn());
    }
}
