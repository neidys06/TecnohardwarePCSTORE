package co.tecnihardware.st.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import co.tecnihardware.st.model.Notificacion;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    Optional<Notificacion> findByUsuarioIdAndClave(Long idUsuario, String clave);

    List<Notificacion> findTop50ByUsuarioIdOrderByLeidaAscCreadaEnDesc(Long idUsuario);

    List<Notificacion> findTop50ByUsuarioIdOrderByCreadaEnDesc(Long idUsuario);

    @Modifying
    @Query("DELETE FROM Notificacion n WHERE n.clave = :clave")
    int borrarPorClave(@Param("clave") String clave);

    @Modifying
    @Query("UPDATE Notificacion n SET n.leida = true WHERE n.usuario.id = :idUsuario")
    int marcarTodasLeidas(@Param("idUsuario") Long idUsuario);

    /** Solo marca el aviso si es del propio usuario (evita IDOR). */
    @Modifying
    @Query("UPDATE Notificacion n SET n.leida = true WHERE n.usuario.id = :idUsuario AND n.id = :id")
    int marcarLeida(@Param("idUsuario") Long idUsuario, @Param("id") Long id);

    /** Avisos de mantenimiento de equipos que ya no están próximos ni vencidos. */
    @Modifying
    @Query("DELETE FROM Notificacion n WHERE n.clave LIKE 'mant-%' AND n.idEquipo IS NOT NULL AND n.idEquipo NOT IN :vigentes")
    int borrarAvisosMantenimientoExcepto(@Param("vigentes") Collection<Long> vigentes);

    @Modifying
    @Query("DELETE FROM Notificacion n WHERE n.clave LIKE 'mant-%' AND n.idEquipo IS NOT NULL")
    int borrarAvisosMantenimientoDeEquipos();
}
