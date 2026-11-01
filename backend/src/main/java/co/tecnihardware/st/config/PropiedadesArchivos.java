package co.tecnihardware.st.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Carpeta y límites de los archivos subidos (app.archivos.*). */
@ConfigurationProperties(prefix = "app.archivos")
public record PropiedadesArchivos(String carpeta, long fotoMaxBytes, long pdfMaxBytes, int fotosPorCarga) {
}
