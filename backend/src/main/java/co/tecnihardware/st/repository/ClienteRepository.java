package co.tecnihardware.st.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import co.tecnihardware.st.model.Cliente;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    @Query("SELECT c FROM Cliente c JOIN FETCH c.usuario u ORDER BY u.nombre")
    List<Cliente> listarTodos();

    @Query("SELECT c FROM Cliente c JOIN FETCH c.usuario WHERE c.id = :id")
    Optional<Cliente> buscarConUsuario(@Param("id") Long id);

    Optional<Cliente> findByUsuarioId(Long idUsuario);

    boolean existsByCedula(String cedula);

    boolean existsByCedulaAndIdNot(String cedula, Long id);
}
