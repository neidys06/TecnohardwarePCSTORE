package co.tecnihardware.st.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import co.tecnihardware.st.model.Evidencia;

public interface EvidenciaRepository extends JpaRepository<Evidencia, Long> {

    /** Trae también el cliente dueño, para validar el acceso (RNF-10). */
    @Query("SELECT ev FROM Evidencia ev JOIN FETCH ev.orden o JOIN FETCH o.equipo e JOIN FETCH e.cliente WHERE ev.id = :id")
    Optional<Evidencia> buscarConDueno(@Param("id") Long id);
}
