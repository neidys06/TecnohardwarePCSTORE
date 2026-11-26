package co.tecnihardware.st.dto;

import java.math.BigDecimal;
import java.util.List;

/** Resultado de la entrega conjunta: las órdenes entregadas y el total cobrado en un solo pago. */
public record EntregaConjuntaDTO(List<OrdenDTO> ordenes, BigDecimal totalCobrado) {
}
