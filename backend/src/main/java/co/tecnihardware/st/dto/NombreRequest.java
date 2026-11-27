package co.tecnihardware.st.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Nombre que se muestra de la cuenta del Administrador (Reunión 8: la usan Gloria y Dichel). */
public record NombreRequest(
        @NotBlank(message = "Escribe el nombre.") @Size(min = 3, max = 120, message = "El nombre debe tener entre 3 y 120 caracteres.") String nombre) {
}
