package co.tecnihardware.st.model;

import java.util.EnumSet;
import java.util.Set;

/**
 * RF-18 · Estados de la orden de servicio y transiciones permitidas.
 * Cada estado conoce su código corto (el que usa la interfaz) y su texto.
 */
public enum EstadoOrden {
    EN_DIAGNOSTICO("diag", "En diagnóstico"),
    PENDIENTE_AUTORIZACION("pend", "Pendiente de autorización"),
    AUTORIZADA("aut", "Autorizada"),
    EN_ESPERA_AUTORIZACION_ADICIONAL("espera", "En espera de autorización adicional"),
    FINALIZADA("fin", "Finalizada"),
    ENTREGADA("ent", "Entregada"),
    CERRADA_SOLO_DIAGNOSTICO("cerr", "Cerrada · solo diagnóstico");

    private final String codigo;
    private final String texto;

    EstadoOrden(String codigo, String texto) {
        this.codigo = codigo;
        this.texto = texto;
    }

    public String getCodigo() {
        return codigo;
    }

    public String getTexto() {
        return texto;
    }

    /** Tabla de transiciones del FP-15 (RF-18). */
    public boolean puedeCambiarA(EstadoOrden destino) {
        if (this == EN_DIAGNOSTICO) {
            return destino == PENDIENTE_AUTORIZACION;
        }
        if (this == PENDIENTE_AUTORIZACION) {
            return destino == AUTORIZADA || destino == CERRADA_SOLO_DIAGNOSTICO;
        }
        if (this == AUTORIZADA) {
            return destino == FINALIZADA || destino == EN_ESPERA_AUTORIZACION_ADICIONAL;
        }
        if (this == EN_ESPERA_AUTORIZACION_ADICIONAL) {
            return destino == AUTORIZADA;
        }
        if (this == FINALIZADA) {
            return destino == ENTREGADA;
        }
        return false; // ENTREGADA y CERRADA_SOLO_DIAGNOSTICO son estados finales
    }

    /** Estados en los que el equipo sigue en el taller: solo puede haber una orden abierta por equipo. */
    public static Set<EstadoOrden> abiertos() {
        return EnumSet.of(EN_DIAGNOSTICO, PENDIENTE_AUTORIZACION, AUTORIZADA, EN_ESPERA_AUTORIZACION_ADICIONAL);
    }

    public boolean esAbierto() {
        return abiertos().contains(this);
    }

    /** La orden terminó y ya no admite cambios ni fotografías. */
    public boolean esCerrado() {
        return this == ENTREGADA || this == CERRADA_SOLO_DIAGNOSTICO;
    }

    /** Cuenta como último servicio para calcular el próximo mantenimiento. */
    public boolean cuentaComoServicio() {
        return this == FINALIZADA || this == ENTREGADA || this == CERRADA_SOLO_DIAGNOSTICO;
    }
}
