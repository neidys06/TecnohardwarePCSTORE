package co.tecnihardware.st.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Reloj del sistema en la hora de Colombia. Se inyecta en los servicios (en lugar de
 * llamar a LocalDate.now()) para que las pruebas puedan fijar la fecha.
 */
@Configuration
public class TiempoConfig {

    @Bean
    public Clock reloj(@Value("${app.zona-horaria:America/Bogota}") String zona) {
        return Clock.system(ZoneId.of(zona));
    }
}
