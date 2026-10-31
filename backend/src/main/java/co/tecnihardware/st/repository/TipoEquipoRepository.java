package co.tecnihardware.st.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import co.tecnihardware.st.model.TipoEquipo;

public interface TipoEquipoRepository extends JpaRepository<TipoEquipo, Long> {

    List<TipoEquipo> findAllByOrderByOrdenAscNombreAsc();

    Optional<TipoEquipo> findByNombreIgnoreCase(String nombre);
}
