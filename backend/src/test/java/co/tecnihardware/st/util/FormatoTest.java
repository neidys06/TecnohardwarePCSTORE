package co.tecnihardware.st.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import org.junit.jupiter.api.Test;

class FormatoTest {

    @Test
    void pesosConPuntoDeMiles() {
        assertThat(Formato.pesos(new BigDecimal("1250000.00"))).isEqualTo("$1.250.000");
        assertThat(Formato.pesos(new BigDecimal("950"))).isEqualTo("$950");
    }

    @Test
    void cedulaYTelefono() {
        assertThat(Formato.cedula("1090456781")).isEqualTo("1.090.456.781");
        assertThat(Formato.telefono("3105550142")).isEqualTo("310 555 0142");
    }

    @Test
    void mes() {
        assertThat(Formato.mes(LocalDate.of(2026, 10, 1))).isEqualTo("Octubre 2026");
        assertThat(Formato.mesDesdeTexto("octubre 2026")).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(Formato.mesDesdeTexto("2026-11")).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(Formato.mesDesdeTexto("Brumario 2026")).isNull();
    }

    @Test
    void normalizarQuitaTildesYMayusculas() {
        assertThat(Formato.normalizar("  Laura GÓMEZ ")).isEqualTo("laura gomez");
    }

    @Test
    void plantillaDelRecordatorio() {
        String t = Formato.llenarPlantilla("Hola {nombre}, tu {equipo} {estado} el {fecha}. {otro}",
                Map.of("nombre", "Carlos", "equipo", "Epson L3250", "estado", "vence", "fecha", "5 nov 2026"));
        assertThat(t).isEqualTo("Hola Carlos, tu Epson L3250 vence el 5 nov 2026. {otro}");
    }

    @Test
    void enlaceWhatsAppConIndicativoDeColombia() {
        assertThat(Formato.enlaceWhatsApp("310 555 0142", null)).isEqualTo("https://wa.me/573105550142");
        assertThat(Formato.enlaceWhatsApp("3105550142", "Hola Carlos")).isEqualTo("https://wa.me/573105550142?text=Hola%20Carlos");
    }
}
