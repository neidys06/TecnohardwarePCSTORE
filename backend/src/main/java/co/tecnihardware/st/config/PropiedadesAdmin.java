package co.tecnihardware.st.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Cuenta preconfigurada del Administrador (RF-02). La clave es temporal (RF-17). */
@ConfigurationProperties(prefix = "app.admin")
public record PropiedadesAdmin(String usuario, String nombre, String claveInicial) {
}
