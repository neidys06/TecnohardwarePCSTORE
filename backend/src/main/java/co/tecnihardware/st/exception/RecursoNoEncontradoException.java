package co.tecnihardware.st.exception;

import org.springframework.http.HttpStatus;

public class RecursoNoEncontradoException extends NegocioException {

    /** @param que por ejemplo «La orden», «El cliente». */
    public RecursoNoEncontradoException(String que) {
        super(que + " no existe.");
    }

    @Override
    public HttpStatus getEstado() {
        return HttpStatus.NOT_FOUND;
    }
}
