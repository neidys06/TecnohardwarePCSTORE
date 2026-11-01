package co.tecnihardware.st.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Component;

import co.tecnihardware.st.model.EstadoMantenimiento;
import co.tecnihardware.st.model.OrdenServicio;

/**
 * Semáforo del mantenimiento preventivo (RF-10, RF-15, RF-16, RF-19). Es lógica pura
 * (sin base de datos), por eso se prueba con pruebas unitarias rápidas.
 */
@Component
public class CalculadoraMantenimiento {

    public record Resultado(LocalDate ultimoServicio, LocalDate proximoMantenimiento, Long diasRestantes,
            EstadoMantenimiento estado) {
    }

    /**
     * @param periodoMeses   3, 6 o 12; null si el equipo no tiene periodo
     * @param ultimoServicio fecha del último servicio; null si nunca ha tenido uno
     * @param umbralDias     días antes del vencimiento en que pasa a «próximo»
     */
    public Resultado calcular(Integer periodoMeses, LocalDate ultimoServicio, LocalDate hoy, int umbralDias) {
        if (periodoMeses == null || ultimoServicio == null) {
            return new Resultado(ultimoServicio, null, null, EstadoMantenimiento.SIN_PERIODO);
        }
        LocalDate proximo = ultimoServicio.plusMonths(periodoMeses);
        long dias = ChronoUnit.DAYS.between(hoy, proximo);
        EstadoMantenimiento estado;
        if (dias < 0) {
            estado = EstadoMantenimiento.VENCIDO;
        } else if (dias <= umbralDias) {
            estado = EstadoMantenimiento.PROXIMO;
        } else {
            estado = EstadoMantenimiento.VIGENTE;
        }
        return new Resultado(ultimoServicio, proximo, dias, estado);
    }

    /** Último servicio: la orden finalizada, entregada o cerrada más reciente del equipo. */
    public LocalDate ultimoServicio(List<OrdenServicio> ordenes) {
        return ordenes.stream()
                .filter(o -> o.getEstado().cuentaComoServicio())
                .max(Comparator
                        .comparing((OrdenServicio o) -> o.getFechaEntrega() != null ? o.getFechaEntrega() : o.getFechaIngreso())
                        .thenComparing(OrdenServicio::getId, Comparator.nullsFirst(Comparator.naturalOrder())))
                .map(OrdenServicio::fechaServicio)
                .orElse(null);
    }
}
