package co.tecnihardware.st.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;

/**
 * Excepción base de negocio. El mensaje está pensado para
 * mostrarse tal cual a la administradora o al cliente.
 */
public abstract class NegocioException extends RuntimeException {

    private final Map<String, String> campos;

    protected NegocioException(String mensaje) {
        this(mensaje, Map.of());
    }

    protected NegocioException(String mensaje, Map<String, String> campos) {
        super(mensaje);
        this.campos = campos == null ? Map.of() : Map.copyOf(campos);
    }

    public abstract HttpStatus getEstado();

    public Map<String, String> getCampos() {
        return campos;
    }
}
