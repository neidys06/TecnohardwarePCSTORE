package co.tecnihardware.st.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record ListaPreciosDTO(Long id, LocalDate mes, String mesTexto, String nombre, long tamano,
        LocalDateTime fecha, String url) {
}
