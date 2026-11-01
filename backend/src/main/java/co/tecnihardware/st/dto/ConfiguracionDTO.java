package co.tecnihardware.st.dto;

import java.math.BigDecimal;

public record ConfiguracionDTO(BigDecimal valorDiagnostico, int umbral, String plantilla, String whatsapp,
        String local, String color) {
}
