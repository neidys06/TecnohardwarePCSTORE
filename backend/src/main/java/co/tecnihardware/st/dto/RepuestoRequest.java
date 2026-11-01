package co.tecnihardware.st.dto;

/** Repuesto usado (RF-07). Llega como JSON dentro del formulario multipart. */
public record RepuestoRequest(String nombre, Integer cantidad) {
}
