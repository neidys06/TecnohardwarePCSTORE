package co.tecnihardware.st.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Escribe tu usuario.") @Size(max = 40, message = "Usuario no válido.") String usuario,
        @NotBlank(message = "Escribe tu contraseña.") @Size(max = 200, message = "Contraseña no válida.") String contrasena) {
}
