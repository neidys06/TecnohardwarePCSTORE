package co.tecnihardware.st.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import co.tecnihardware.st.model.DecisionCliente;
import co.tecnihardware.st.model.EstadoOrden;
import co.tecnihardware.st.model.MomentoEvidencia;
import co.tecnihardware.st.model.TipoAutorizacion;

/** Orden de servicio completa (RF-04 a RF-08, RF-18). */
public record OrdenDTO(Long idOrden, String codigo, Long idEquipo, Long idCliente, LocalDate fechaIngreso,
        String falla, String diagnostico, BigDecimal costoEstimado, EstadoOrden estado, BigDecimal montoTotal,
        BigDecimal montoCobrado, LocalDate fechaEntrega, String recibidoPor, String recibioEquipo,
        String entregoEquipo, List<AutorizacionDTO> autorizaciones,
        MantenimientoRealizadoDTO mantenimiento, List<EvidenciaDTO> evidencias, List<CambioDTO> historial) {

    public record AutorizacionDTO(Long id, TipoAutorizacion tipo, String descripcion, BigDecimal costo,
            DecisionCliente decision, LocalDateTime fechaRegistro, LocalDateTime fechaRespuesta) {
    }

    public record MantenimientoRealizadoDTO(String trabajo, String responsable, LocalDate fecha,
            List<RepuestoDTO> repuestos) {
    }

    public record RepuestoDTO(String nombre, int cantidad) {
    }

    public record EvidenciaDTO(Long id, MomentoEvidencia momento, String nota, LocalDateTime fecha, String url) {
    }

    /** {@code usuario} se omite en el portal: el cliente no ve quién de la tienda hizo el cambio. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CambioDTO(LocalDateTime fechaHora, EstadoOrden estadoAnterior, EstadoOrden estadoNuevo,
            String observacion, String usuario) {
    }
}
