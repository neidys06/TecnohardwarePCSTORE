package co.tecnihardware.st.exception;

import org.springframework.http.HttpStatus;

/** RNF-09 · Bloqueo temporal tras varios intentos fallidos (423 Locked). */
public class CuentaBloqueadaException extends NegocioException {

    public CuentaBloqueadaException(String mensaje) {
        super(mensaje);
    }

    @Override
    public HttpStatus getEstado() {
        return HttpStatus.LOCKED;
    }
}
