package co.tecnihardware.st.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** RF-06 · Nueva falla encontrada durante la reparación. */
public record AdicionalRequest(
        @NotBlank(message = "Describe la nueva falla.") @Size(min = 10, max = 2000, message = "La nueva falla debe tener entre 10 y 2000 caracteres.") String descripcion,
        @NotNull(message = "Escribe el costo adicional.") @Positive(message = "Escribe el costo adicional.")
        @DecimalMax(value = "100000000", message = "Valor demasiado alto.") BigDecimal costo) {
}
