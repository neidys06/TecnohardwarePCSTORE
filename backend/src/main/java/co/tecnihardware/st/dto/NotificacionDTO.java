package co.tecnihardware.st.dto;

import java.time.LocalDateTime;

public record NotificacionDTO(Long id, String titulo, String detalle, String enlace, boolean leida,
        LocalDateTime fecha) {
}
