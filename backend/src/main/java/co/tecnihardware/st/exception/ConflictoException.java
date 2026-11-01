package co.tecnihardware.st.exception;

import org.springframework.http.HttpStatus;

/** La acción no corresponde al estado actual del registro (409), p. ej. una transición del RF-18. */
public class ConflictoException extends NegocioException {

    public ConflictoException(String mensaje) {
        super(mensaje);
    }

    @Override
    public HttpStatus getEstado() {
        return HttpStatus.CONFLICT;
    }
}
