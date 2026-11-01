package co.tecnihardware.st.dto;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Cliente para el listado y la ficha (RF-01, RF-12). En las búsquedas trae el cuadro de mantenimiento. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ClienteDTO(Long id, String nombre, String cedula, String telefono, String usuario,
        LocalDate fechaRegistro, boolean contrasenaTemporal, long equipos, List<MantenimientoDTO> mantenimientos) {

    public ClienteDTO conMantenimientos(List<MantenimientoDTO> m) {
        return new ClienteDTO(id, nombre, cedula, telefono, usuario, fechaRegistro, contrasenaTemporal, equipos, m);
    }
}
