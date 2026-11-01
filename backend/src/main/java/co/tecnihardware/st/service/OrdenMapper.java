package co.tecnihardware.st.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Component;

import co.tecnihardware.st.dto.OrdenDTO;
import co.tecnihardware.st.dto.OrdenDTO.AutorizacionDTO;
import co.tecnihardware.st.dto.OrdenDTO.CambioDTO;
import co.tecnihardware.st.dto.OrdenDTO.EvidenciaDTO;
import co.tecnihardware.st.dto.OrdenDTO.MantenimientoRealizadoDTO;
import co.tecnihardware.st.dto.OrdenDTO.RepuestoDTO;
import co.tecnihardware.st.model.Mantenimiento;
import co.tecnihardware.st.model.OrdenServicio;

/** Patrón DTO: la API nunca expone las entidades JPA. */
@Component
public class OrdenMapper {

    public static String urlEvidencia(Long idEvidencia) {
        return "/api/evidencias/" + idEvidencia + "/archivo";
    }

    /**
     * @param conUsuario falso en el portal: el cliente no ve quién de la tienda hizo cada cambio
     */
    public OrdenDTO aDTO(OrdenServicio o, BigDecimal valorDiagnostico, boolean conUsuario) {
        List<AutorizacionDTO> autorizaciones = o.getAutorizaciones().stream()
                .map(a -> new AutorizacionDTO(a.getId(), a.getTipo(), a.getDescripcion(), a.getCosto(),
                        a.getDecision(), a.getFechaRegistro(), a.getFechaRespuesta()))
                .toList();
        List<EvidenciaDTO> evidencias = o.getEvidencias().stream()
                .map(e -> new EvidenciaDTO(e.getId(), e.getMomento(), e.getNota(), e.getFechaCarga(),
                        urlEvidencia(e.getId())))
                .toList();
        List<CambioDTO> historial = o.getHistorial().stream()
                .map(c -> new CambioDTO(c.getFechaHora(), c.getEstadoAnterior(), c.getEstadoNuevo(),
                        c.getObservacion(), conUsuario && c.getUsuario() != null ? c.getUsuario().getNombre() : null))
                .toList();
        return new OrdenDTO(o.getId(), o.getCodigo(), o.getEquipo().getId(), o.getEquipo().getCliente().getId(),
                o.getFechaIngreso(), o.getFallaReportada(), o.getDiagnostico(), o.getCostoEstimado(), o.getEstado(),
                o.calcularMonto(valorDiagnostico), o.getMontoCobrado(), o.getFechaEntrega(), o.getRecibidoPor(),
                o.getRecibioEquipo(), o.getEntregoEquipo(),
                autorizaciones, mantenimiento(o.getMantenimiento()), evidencias, historial);
    }

    private static MantenimientoRealizadoDTO mantenimiento(Mantenimiento m) {
        if (m == null) {
            return null;
        }
        List<RepuestoDTO> repuestos = m.getRepuestos().stream()
                .map(r -> new RepuestoDTO(r.getNombre(), r.getCantidad()))
                .toList();
        return new MantenimientoRealizadoDTO(m.getTrabajoRealizado(), m.getResponsable(), m.getFecha(), repuestos);
    }
}
