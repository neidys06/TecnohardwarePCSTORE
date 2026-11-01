package co.tecnihardware.st.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** RF-17 · En el primer ingreso «actual» no se pide: ya se validó al iniciar sesión. */
public record CambiarContrasenaRequest(
        @Size(max = 200) String actual,
        @NotBlank(message = "Escribe la contraseña nueva.") @Size(max = 72, message = "Máximo 72 caracteres.") String nueva,
        @NotBlank(message = "Confirma la contraseña nueva.") String confirmacion) {
}
