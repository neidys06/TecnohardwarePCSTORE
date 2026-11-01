package co.tecnihardware.st.exception;

import org.springframework.http.HttpStatus;

/** IDOR: el recurso existe pero no pertenece al usuario (403). */
public class AccesoDenegadoException extends NegocioException {

    public AccesoDenegadoException() {
        super("No tienes permiso para ver esta información.");
    }

    @Override
    public HttpStatus getEstado() {
        return HttpStatus.FORBIDDEN;
    }
}
