package co.tecnihardware.st.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EntregaRequest(
        @NotBlank(message = "Escribe quién recibe el equipo.") @Size(min = 3, max = 120, message = "Entre 3 y 120 caracteres.") String recibidoPor,
        @NotBlank(message = "Elige quién entregó el equipo.") String entregadoPor) {
}
