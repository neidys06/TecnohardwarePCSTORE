package co.tecnihardware.st.dto;

public record EquipoDTO(Long id, Long idCliente, String tipo, boolean esOtro, String marcaModelo, String serial,
        String observaciones, Integer periodo) {
}
