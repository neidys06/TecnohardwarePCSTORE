package co.tecnihardware.st.exception;

import org.springframework.http.HttpStatus;

public class CredencialesInvalidasException extends NegocioException {

    public CredencialesInvalidasException() {
        super("Usuario o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.");
    }

    @Override
    public HttpStatus getEstado() {
        return HttpStatus.UNAUTHORIZED;
    }
}
