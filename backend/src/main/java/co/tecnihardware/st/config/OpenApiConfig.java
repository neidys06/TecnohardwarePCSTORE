package co.tecnihardware.st.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;

import org.springframework.context.annotation.Configuration;

/** Documentación de la API en /swagger-ui.html. Deshabilitada en producción. */
@Configuration
@OpenAPIDefinition(info = @Info(
        title = "API · Servicio técnico TecniHardware PC Store",
        version = "1.0.0",
        description = "Clientes, equipos, órdenes de servicio, mantenimientos, lista de precios y portal del cliente. "
                + "Trazable a los RF-01…RF-19 del FP-15."))
public class OpenApiConfig {
}
