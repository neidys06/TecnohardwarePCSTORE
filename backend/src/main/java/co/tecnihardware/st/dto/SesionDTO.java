package co.tecnihardware.st.dto;

public record SesionDTO(String rol, String nombre, String usuario, Long idCliente, boolean debeCambiarContrasena) {
}
