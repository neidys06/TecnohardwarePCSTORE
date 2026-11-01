package co.tecnihardware.st.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** RF-03 · tipo = una categoría de la lista o «Otros» (con tipoOtro escrito). */
public record EquipoRequest(
        Long idCliente,
        @Schema(example = "Portátil") @NotBlank(message = "Elige el tipo de equipo.") String tipo,
        @Schema(example = "Consola de videojuegos") @Size(max = 60, message = "Máximo 60 caracteres.") String tipoOtro,
        @Schema(example = "Lenovo IdeaPad 3")
        @NotBlank(message = "Escribe la marca y el modelo.") @Size(min = 2, max = 120, message = "La marca y el modelo deben tener entre 2 y 120 caracteres.") String marcaModelo,
        @Size(max = 60, message = "Máximo 60 caracteres.") String serial,
        @Size(max = 1000, message = "Máximo 1000 caracteres.") String observaciones,
        @Schema(description = "3, 6 o 12 meses; vacío = sin periodo", example = "6") Integer periodo) {
}
