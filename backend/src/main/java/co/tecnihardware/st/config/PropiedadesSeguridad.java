package co.tecnihardware.st.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Parámetros de seguridad (app.seguridad.* en application.properties). */
@ConfigurationProperties(prefix = "app.seguridad")
public record PropiedadesSeguridad(String jwtSecreto, int sesionHoras, boolean cookieSegura, int bcryptCosto,
        int maxIntentos, int minutosBloqueo) {

    public PropiedadesSeguridad {
        if (jwtSecreto == null || jwtSecreto.length() < 32) {
            throw new IllegalStateException("app.seguridad.jwt-secreto (JWT_SECRETO) debe tener al menos 32 caracteres");
        }
    }
}
