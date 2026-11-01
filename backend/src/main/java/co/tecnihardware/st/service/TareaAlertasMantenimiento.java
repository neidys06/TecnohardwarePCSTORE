package co.tecnihardware.st.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * RF-10 · Evalúa los mantenimientos al iniciar la aplicación y luego todos los días a
 * las 6:00 a. m. (hora de Colombia), sin intervención de la administradora.
 */
@Component
@ConditionalOnProperty(name = "app.tareas.habilitadas", havingValue = "true", matchIfMissing = true)
public class TareaAlertasMantenimiento {

    private static final Logger log = LoggerFactory.getLogger(TareaAlertasMantenimiento.class);

    private final MantenimientoService mantenimientos;

    public TareaAlertasMantenimiento(MantenimientoService mantenimientos) {
        this.mantenimientos = mantenimientos;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void alIniciar() {
        evaluar();
    }

    @Scheduled(cron = "0 0 6 * * *", zone = "America/Bogota")
    public void diaria() {
        evaluar();
    }

    private void evaluar() {
        try {
            mantenimientos.evaluarAlertas();
        } catch (RuntimeException e) {
            log.error("No se pudieron evaluar las alertas de mantenimiento", e);
        }
    }
}
