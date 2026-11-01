package co.tecnihardware.st.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Personal de la tienda que recibe y entrega los equipos (Acta 5). Se elige de esta lista al
 * crear la orden (RF-04) y al entregar el equipo (RF-18).
 */
@ConfigurationProperties(prefix = "app.tienda")
public record PropiedadesTienda(List<String> personal) {

    public PropiedadesTienda {
        personal = personal == null ? List.of() : List.copyOf(personal);
    }

    /** Devuelve el nombre tal como está configurado, o {@code null} si no pertenece al personal. */
    public String buscar(String nombre) {
        if (nombre == null) {
            return null;
        }
        String limpio = nombre.trim();
        return personal.stream().filter(p -> p.equalsIgnoreCase(limpio)).findFirst().orElse(null);
    }
}
