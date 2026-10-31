package co.tecnihardware.st.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import co.tecnihardware.st.model.Rol;
import co.tecnihardware.st.model.Usuario;

/** DAO de cuentas (patrón DAO con Spring Data JPA). */
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsuarioAndActivoTrue(String usuario);

    Optional<Usuario> findByIdAndActivoTrue(Long id);

    boolean existsByUsuario(String usuario);

    List<Usuario> findByRolAndActivoTrue(Rol rol);

    boolean existsByRolAndActivoTrue(Rol rol);
}
