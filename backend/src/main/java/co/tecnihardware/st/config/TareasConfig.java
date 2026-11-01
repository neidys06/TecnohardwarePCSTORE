package co.tecnihardware.st.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Activa la tarea diaria de alertas de mantenimiento (RF-10). Se apaga en las pruebas. */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "app.tareas.habilitadas", havingValue = "true", matchIfMissing = true)
public class TareasConfig {
}
