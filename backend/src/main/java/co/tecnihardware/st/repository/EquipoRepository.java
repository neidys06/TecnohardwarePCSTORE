package co.tecnihardware.st.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import co.tecnihardware.st.model.Equipo;

public interface EquipoRepository extends JpaRepository<Equipo, Long> {

    @Query("SELECT e FROM Equipo e JOIN FETCH e.cliente c JOIN FETCH c.usuario LEFT JOIN FETCH e.tipo ORDER BY e.id")
    List<Equipo> listarTodos();

    @Query("SELECT e FROM Equipo e LEFT JOIN FETCH e.tipo WHERE e.cliente.id = :idCliente ORDER BY e.id")
    List<Equipo> listarDeCliente(@Param("idCliente") Long idCliente);

    @Query("SELECT e FROM Equipo e LEFT JOIN FETCH e.tipo WHERE e.cliente.id IN :ids ORDER BY e.id")
    List<Equipo> listarDeClientes(@Param("ids") List<Long> ids);

    long countByClienteId(Long idCliente);
}
