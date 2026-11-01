package co.tecnihardware.st.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;

/** Datos que no cumplen una regla del FP-15 (422). */
public class ReglaDeNegocioException extends NegocioException {

    public ReglaDeNegocioException(String mensaje) {
        super(mensaje);
    }

    public ReglaDeNegocioException(String mensaje, String campo, String detalle) {
        super(mensaje, Map.of(campo, detalle));
    }

    @Override
    public HttpStatus getEstado() {
        return HttpStatus.UNPROCESSABLE_ENTITY;
    }
}
