package co.tecnihardware.st.dto;

import java.time.LocalDate;

import co.tecnihardware.st.model.EstadoMantenimiento;

/** RF-19 · Equipo del cliente con su semáforo de mantenimiento. */
public record EquipoPortalDTO(Long id, String tipo, String marcaModelo, LocalDate ultimoServicio,
        LocalDate proximoMantenimiento, Long diasRestantes, EstadoMantenimiento estadoMantenimiento) {
}
