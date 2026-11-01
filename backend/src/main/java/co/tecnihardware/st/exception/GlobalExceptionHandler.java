package co.tecnihardware.st.exception;

import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Manejo centralizado de errores: el cliente nunca recibe trazas
 * internas, y cada caso se traduce a un código HTTP y un mensaje comprensible.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Restricciones de la base de datos → mensaje para el usuario. */
    private static final Map<String, String> RESTRICCIONES = Map.of(
            "uk_usuario_usuario", "Ese usuario ya existe. Escribe otro.",
            "uk_cliente_cedula", "Ya hay un cliente registrado con esa cédula.",
            "uk_notificacion_usuario_clave", "El aviso ya existe.",
            "uk_tipo_equipo_nombre", "Esa categoría ya existe.");

    @ExceptionHandler(NegocioException.class)
    public ResponseEntity<ApiError> negocio(NegocioException ex, HttpServletRequest req) {
        HttpStatus s = ex.getEstado();
        return ResponseEntity.status(s)
                .body(ApiError.de(s.value(), s.getReasonPhrase(), ex.getMessage(), req.getRequestURI(), ex.getCampos()));
    }

    /** @Valid sobre el cuerpo JSON (Bean Validation). */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validacion(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe -> campos.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
        String primero = campos.values().stream().findFirst().orElse("Revisa los datos del formulario.");
        return respuesta(HttpStatus.BAD_REQUEST, primero, req, campos);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> restriccion(ConstraintViolationException ex, HttpServletRequest req) {
        String m = ex.getConstraintViolations().stream().map(v -> v.getMessage()).findFirst()
                .orElse("Revisa los datos del formulario.");
        return respuesta(HttpStatus.BAD_REQUEST, m, req, Map.of());
    }

    @ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class, MissingServletRequestPartException.class })
    public ResponseEntity<ApiError> malFormada(Exception ex, HttpServletRequest req) {
        return respuesta(HttpStatus.BAD_REQUEST, "Solicitud mal formada. Revisa los datos enviados.", req, Map.of());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> archivoGrande(MaxUploadSizeExceededException ex, HttpServletRequest req) {
        return respuesta(HttpStatus.PAYLOAD_TOO_LARGE,
                "El archivo supera el tamaño máximo permitido (fotos 5 MB, lista de precios 3 MB).", req, Map.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> integridad(DataIntegrityViolationException ex, HttpServletRequest req) {
        String detalle = String.valueOf(ex.getMostSpecificCause().getMessage()).toLowerCase();
        String mensaje = RESTRICCIONES.entrySet().stream()
                .filter(e -> detalle.contains(e.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse("El registro ya existe o está relacionado con otro.");
        log.warn("Restricción de la base de datos en {}: {}", req.getRequestURI(), ex.getMostSpecificCause().getMessage());
        return respuesta(HttpStatus.CONFLICT, mensaje, req, Map.of());
    }

    /** @PreAuthorize que no se cumple. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> prohibido(AccessDeniedException ex, HttpServletRequest req) {
        return respuesta(HttpStatus.FORBIDDEN, "No tienes permiso para ver esta información.", req, Map.of());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> metodo(HttpRequestMethodNotSupportedException ex, HttpServletRequest req) {
        return respuesta(HttpStatus.METHOD_NOT_ALLOWED, "Método no permitido.", req, Map.of());
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiError> tipoContenido(HttpMediaTypeNotSupportedException ex, HttpServletRequest req) {
        return respuesta(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Formato de la solicitud no admitido.", req, Map.of());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> rutaInexistente(NoResourceFoundException ex, HttpServletRequest req) {
        return respuesta(HttpStatus.NOT_FOUND, "Ruta no encontrada.", req, Map.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> inesperado(Exception ex, HttpServletRequest req) {
        log.error("Error inesperado en {} {}", req.getMethod(), req.getRequestURI(), ex);
        return respuesta(HttpStatus.INTERNAL_SERVER_ERROR, "Ocurrió un error inesperado. Inténtalo de nuevo.", req,
                Map.of());
    }

    private ResponseEntity<ApiError> respuesta(HttpStatus s, String mensaje, HttpServletRequest req,
            Map<String, String> campos) {
        return ResponseEntity.status(s)
                .body(ApiError.de(s.value(), s.getReasonPhrase(), mensaje, req.getRequestURI(), campos));
    }
}
