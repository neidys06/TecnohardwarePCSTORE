package co.tecnihardware.st.dto;

/** La contraseña temporal se muestra solo esta vez; en la BD queda su resumen (RNF-09). */
public record ClienteCreadoDTO(ClienteDTO cliente, String contrasenaTemporal) {
}
