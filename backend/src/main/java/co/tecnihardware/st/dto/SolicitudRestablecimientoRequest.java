package co.tecnihardware.st.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudRestablecimientoRequest(
        @NotBlank(message = "Escribe tu usuario.") @Size(max = 40) String usuario) {
}
