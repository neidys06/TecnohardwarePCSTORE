package co.tecnihardware.st.service;

import java.math.BigDecimal;
import java.time.LocalDate;

import co.tecnihardware.st.util.Formato;

/**
 * Patrón Factory: centraliza cómo se redacta cada aviso del sistema
 * (RF-10). La clave evita duplicados: el mismo aviso se renueva en lugar de repetirse.
 */
public final class AvisoFactory {

    /** Contenido de un aviso antes de asignarle destinatario. */
    public record Aviso(String clave, String titulo, String detalle, String enlace, Long idEquipo) {
    }

    private AvisoFactory() {
    }

    public static Aviso autorizacionPendiente(String codigo, BigDecimal costo) {
        return new Aviso(claveAutorizacion(codigo), codigo + " espera la respuesta del cliente",
                "Diagnóstico enviado · " + Formato.pesos(costo), "/admin/ordenes/" + codigo, null);
    }

    public static Aviso adicionalPendiente(String codigo, String descripcion, BigDecimal costo) {
        String corta = descripcion.length() > 60 ? descripcion.substring(0, 60) : descripcion;
        return new Aviso(claveAdicional(codigo), "Autorización adicional pendiente en " + codigo,
                corta + " · +" + Formato.pesos(costo), "/admin/ordenes/" + codigo, null);
    }

    public static Aviso solicitudContrasena(Long idCliente, String nombre) {
        return new Aviso(claveContrasena(idCliente), "Solicitud de contraseña: " + nombre,
                "Pidió restablecer su contraseña desde el inicio de sesión", "/admin/clientes/" + idCliente, null);
    }

    public static Aviso listaPrecios(LocalDate mes) {
        return new Aviso("lista-precios", "Ya está la lista de precios de " + Formato.mes(mes),
                "Puedes verla o descargarla en «Lista de precios».", "/portal/precios", null);
    }

    public static Aviso mantenimientosVencidosAdmin(int cantidad) {
        return new Aviso("mant-vencidos", "Mantenimientos vencidos",
                cantidad + (cantidad == 1 ? " equipo ya pasó" : " equipos ya pasaron") + " su fecha de mantenimiento",
                "/admin/mantenimientos", null);
    }

    public static Aviso mantenimientosProximosAdmin(int cantidad) {
        return new Aviso("mant-proximos", "Mantenimientos próximos",
                cantidad + (cantidad == 1 ? " equipo vence" : " equipos vencen") + " en los próximos días",
                "/admin/mantenimientos", null);
    }

    public static Aviso mantenimientoCliente(Long idEquipo, String equipo, boolean vencido, long diasRestantes) {
        String titulo = vencido ? "El mantenimiento de tu " + equipo + " está vencido"
                : "Se acerca el mantenimiento de tu " + equipo;
        String detalle = vencido ? "Venció hace " + (-diasRestantes) + " días. Escríbenos para agendarlo."
                : "Faltan " + diasRestantes + " días. Escríbenos para agendarlo.";
        return new Aviso("mant-" + idEquipo, titulo, detalle, "/portal/equipos", idEquipo);
    }

    public static String claveAutorizacion(String codigo) {
        return "aut-" + codigo;
    }

    public static String claveAdicional(String codigo) {
        return "adic-" + codigo;
    }

    public static String claveContrasena(Long idCliente) {
        return "clave-" + idCliente;
    }
}
