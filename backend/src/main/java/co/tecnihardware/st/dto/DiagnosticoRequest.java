package co.tecnihardware.st.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** RF-05 · Diagnóstico y costo estimado en pesos. */
public record DiagnosticoRequest(
        @NotBlank(message = "Escribe el diagnóstico.") @Size(min = 10, max = 2000, message = "El diagnóstico debe tener entre 10 y 2000 caracteres.") String diagnostico,
        @NotNull(message = "Escribe el costo estimado en pesos.") @Positive(message = "Escribe el costo estimado en pesos.")
        @DecimalMax(value = "100000000", message = "Valor demasiado alto.") BigDecimal costo) {
}
