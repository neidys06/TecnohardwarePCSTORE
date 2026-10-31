package co.tecnihardware.st.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import co.tecnihardware.st.model.RecordatorioMantenimiento;

public interface RecordatorioMantenimientoRepository extends JpaRepository<RecordatorioMantenimiento, Long> {

    /** Fecha del último recordatorio de cada equipo: filas [idEquipo, fecha]. */
    @Query("SELECT r.equipo.id, MAX(r.fechaGeneracion) FROM RecordatorioMantenimiento r GROUP BY r.equipo.id")
    List<Object[]> ultimoPorEquipo();

    default java.util.Map<Long, LocalDateTime> mapaUltimoPorEquipo() {
        java.util.Map<Long, LocalDateTime> m = new java.util.HashMap<>();
        for (Object[] fila : ultimoPorEquipo()) {
            m.put((Long) fila[0], (LocalDateTime) fila[1]);
        }
        return m;
    }
}
