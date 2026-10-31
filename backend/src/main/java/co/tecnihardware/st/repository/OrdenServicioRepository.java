package co.tecnihardware.st.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import co.tecnihardware.st.model.EstadoOrden;
import co.tecnihardware.st.model.OrdenServicio;

public interface OrdenServicioRepository extends JpaRepository<OrdenServicio, Long> {

    /** Las colecciones (autorizaciones, evidencias, historial) se cargan por lotes: sin N+1. */
    @Query("SELECT o FROM OrdenServicio o JOIN FETCH o.equipo e ORDER BY o.fechaIngreso DESC, o.id DESC")
    List<OrdenServicio> listarTodas();

    @Query("SELECT o FROM OrdenServicio o JOIN FETCH o.equipo e WHERE o.estado = :estado ORDER BY o.fechaIngreso DESC, o.id DESC")
    List<OrdenServicio> listarPorEstado(@Param("estado") EstadoOrden estado);

    @Query("SELECT o FROM OrdenServicio o JOIN FETCH o.equipo e WHERE e.cliente.id = :idCliente ORDER BY o.fechaIngreso DESC, o.id DESC")
    List<OrdenServicio> listarDeCliente(@Param("idCliente") Long idCliente);

    /** Bloquea la fila para que dos acciones simultáneas sobre la orden no se pisen. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM OrdenServicio o WHERE o.id = :id")
    Optional<OrdenServicio> bloquear(@Param("id") Long id);

    /** Un equipo solo puede tener una orden abierta a la vez. */
    boolean existsByEquipoIdAndEstadoIn(Long idEquipo, Collection<EstadoOrden> estados);
}
