package co.tecnihardware.st.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import co.tecnihardware.st.model.EstadoMantenimiento;

/** Fila de la consulta de mantenimientos (RF-15) y del cuadro del cliente (RF-12). */
public record MantenimientoDTO(Long idEquipo, Long idCliente, String cliente, String telefono, String equipo,
        LocalDate ultimoServicio, LocalDate proximoMantenimiento, Long diasRestantes, EstadoMantenimiento estado,
        LocalDateTime ultimoRecordatorio) {
}
