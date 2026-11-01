package co.tecnihardware.st.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NotaRequest(
        @NotBlank(message = "Escribe la nota.") @Size(min = 3, max = 300, message = "La nota debe tener entre 3 y 300 caracteres.") String texto) {
}
