package co.tecnihardware.st.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/** Entrega en un solo pago de varios equipos del mismo cliente (Acta 6). */
public record EntregaConjuntaRequest(
        @NotEmpty(message = "Elige al menos una orden para entregar.") @Size(max = 20, message = "Máximo 20 órdenes a la vez.") List<String> codigos,
        @NotBlank(message = "Escribe quién recibe los equipos.") @Size(min = 3, max = 120, message = "Entre 3 y 120 caracteres.") String recibidoPor,
        @NotBlank(message = "Elige quién entregó los equipos.") String entregadoPor) {
}
