package co.tecnihardware.st.config;

import java.io.IOException;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Sirve el frontend compilado desde {@code src/main/resources/static}. Las rutas de la
 * interfaz (/admin/clientes, /portal/equipos…) devuelven index.html para que, al
 * recargar la página, el enrutador del navegador muestre la pantalla correcta.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String ruta, Resource ubicacion) throws IOException {
                        Resource archivo = ubicacion.createRelative(ruta);
                        if (archivo.exists() && archivo.isReadable()) {
                            return archivo;
                        }
                        // La API y los archivos con extensión que no existen sí deben dar 404.
                        if (ruta.startsWith("api/") || ruta.startsWith("actuator") || ruta.contains(".")) {
                            return null;
                        }
                        Resource index = new ClassPathResource("/static/index.html");
                        return index.exists() ? index : null;
                    }
                });
    }
}
