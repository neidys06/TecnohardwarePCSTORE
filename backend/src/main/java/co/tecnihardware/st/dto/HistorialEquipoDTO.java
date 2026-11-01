package co.tecnihardware.st.dto;

import java.time.LocalDate;
import java.util.List;

import co.tecnihardware.st.model.EstadoMantenimiento;

/** RF-09 · Datos del equipo, su mantenimiento y sus órdenes en orden cronológico. */
public record HistorialEquipoDTO(Long id, Long idCliente, String cliente, String tipo, String marcaModelo,
        String serial, String observaciones, Integer periodo, LocalDate ultimoServicio,
        LocalDate proximoMantenimiento, Long diasRestantes, EstadoMantenimiento estadoMantenimiento,
        List<OrdenDTO> ordenes) {
}
