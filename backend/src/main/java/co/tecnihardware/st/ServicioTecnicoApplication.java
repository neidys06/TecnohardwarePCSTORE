package co.tecnihardware.st;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Software de gestión y seguimiento del servicio técnico · TecniHardware PC Store.
 * Arquitectura por capas: controller → service → repository → model.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class ServicioTecnicoApplication {

    public static void main(String[] args) {
        SpringApplication.run(ServicioTecnicoApplication.class, args);
    }
}
