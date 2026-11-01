package co.tecnihardware.st.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** RF-01 · El usuario solo se envía al registrar; al actualizar no cambia. */
public record ClienteRequest(
        @Schema(example = "Carlos Mendoza")
        @NotBlank(message = "Escribe el nombre.") @Size(min = 3, max = 120, message = "El nombre debe tener entre 3 y 120 caracteres.") String nombre,
        @Schema(example = "310 555 0142") @Size(max = 25) String telefono,
        @Schema(example = "1.090.456.781") @Size(max = 25) String cedula,
        @Schema(example = "cmendoza")
        @Pattern(regexp = "^[a-zA-Z0-9._]{4,20}$", message = "Usa de 4 a 20 letras minúsculas o números, sin espacios ni tildes.") String usuario) {
}
