package co.tecnihardware.st.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Todos los campos son opcionales: se guarda solo lo que llega. */
public record ConfiguracionRequest(
        @DecimalMin(value = "1000", message = "El valor del diagnóstico debe ser de al menos $1.000.")
        @DecimalMax(value = "100000000", message = "Valor demasiado alto.") BigDecimal valorDiagnostico,
        @Min(value = 1, message = "Mínimo 1 día.") @Max(value = 90, message = "Máximo 90 días.") Integer umbral,
        @Size(min = 20, max = 1000, message = "La plantilla debe tener entre 20 y 1000 caracteres.") String plantilla,
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Color no válido.") String color) {
}
