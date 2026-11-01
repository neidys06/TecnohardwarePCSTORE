package co.tecnihardware.st.exception;

import java.time.LocalDateTime;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Respuesta de error estandarizada. {@code mensaje} es el texto
 * para el usuario; {@code campos} indica el error de cada campo del formulario.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiError(int status, String error, String mensaje, LocalDateTime timestamp, String path,
        Map<String, String> campos) {

    public static ApiError de(int status, String error, String mensaje, String path, Map<String, String> campos) {
        return new ApiError(status, error, mensaje, LocalDateTime.now(), path, campos);
    }
}
