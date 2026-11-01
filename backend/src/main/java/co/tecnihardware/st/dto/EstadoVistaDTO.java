package co.tecnihardware.st.dto;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Todo lo que necesita la interfaz al abrir, con la misma forma que usa el prototipo
 * validado con la cliente (tipo {@code DB} del frontend). El servidor lo filtra según
 * el rol: un cliente solo recibe sus propios datos (RF-19, RNF-10).
 */
public record EstadoVistaDTO(SesionVista sesion, List<ClienteVista> clientes, List<EquipoVista> equipos,
        List<OrdenVista> ordenes, BigDecimal valorDiagnostico, int umbral, String plantilla, String color,
        List<NotificacionVista> notifs, String fotoAdmin, String fotoCliente, ListaPdfVista listaPdf,
        List<String> personal) {

    /** rol: «admin» o «cliente». */
    public record SesionVista(String rol, String nombre, String usuario, String idCliente) {
    }

    public record ClienteVista(String id, String nombre, String cedula, String tel, String usuario, String desde) {
    }

    public record EquipoVista(String id, String cliente, String tipo, String nombre, String serial, String nota,
            Integer periodo) {
    }

    /** Los campos que aún no aplican se omiten (en el frontend son opcionales). */
    public record OrdenVista(String id, String eq, String ingreso, String falla, String estado, String diag,
            BigDecimal costo, List<AdicionalVista> adicionales,
            @JsonInclude(JsonInclude.Include.NON_NULL) String trabajo,
            @JsonInclude(JsonInclude.Include.NON_NULL) List<List<Object>> repuestos,
            @JsonInclude(JsonInclude.Include.NON_NULL) String responsable,
            FotosVista fotos,
            @JsonInclude(JsonInclude.Include.NON_NULL) String entrega,
            @JsonInclude(JsonInclude.Include.NON_NULL) BigDecimal cobro,
            List<List<String>> log,
            @JsonInclude(JsonInclude.Include.NON_NULL) String recibio,
            @JsonInclude(JsonInclude.Include.NON_NULL) String entrego) {
    }

    /** ok: true autorizado, false no autorizado; se omite mientras está pendiente. */
    public record AdicionalVista(String desc, BigDecimal costo, @JsonInclude(JsonInclude.Include.NON_NULL) Boolean ok) {
    }

    public record FotosVista(List<String> ingreso, List<FotoProcesoVista> proceso, List<String> salida) {
    }

    public record FotoProcesoVista(String src, String nota, String fecha) {
    }

    public record NotificacionVista(String id, String titulo, String detalle, String to, boolean leida) {
    }

    public record ListaPdfVista(String mes, String nombre, String src, long tamano, String fecha) {
    }
}
