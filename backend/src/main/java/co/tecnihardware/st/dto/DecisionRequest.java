package co.tecnihardware.st.dto;

import jakarta.validation.constraints.NotNull;

import co.tecnihardware.st.model.DecisionCliente;

/** RF-06 · AUTORIZA o NO_AUTORIZA. */
public record DecisionRequest(@NotNull(message = "Indica la respuesta del cliente.") DecisionCliente decision) {
}
