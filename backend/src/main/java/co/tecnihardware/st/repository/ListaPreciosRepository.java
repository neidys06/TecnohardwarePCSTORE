package co.tecnihardware.st.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import co.tecnihardware.st.model.ListaPrecios;

public interface ListaPreciosRepository extends JpaRepository<ListaPrecios, Long> {

    Optional<ListaPrecios> findFirstByVigenteTrueOrderBySubidaEnDesc();
}
