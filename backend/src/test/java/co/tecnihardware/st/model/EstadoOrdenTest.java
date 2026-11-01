package co.tecnihardware.st.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;

@DisplayName("RF-18 · Tabla de estados de la orden")
class EstadoOrdenTest {

    @ParameterizedTest(name = "{0} → {1} está permitida")
    @CsvSource({
            "EN_DIAGNOSTICO, PENDIENTE_AUTORIZACION",
            "PENDIENTE_AUTORIZACION, AUTORIZADA",
            "PENDIENTE_AUTORIZACION, CERRADA_SOLO_DIAGNOSTICO",
            "AUTORIZADA, FINALIZADA",
            "AUTORIZADA, EN_ESPERA_AUTORIZACION_ADICIONAL",
            "EN_ESPERA_AUTORIZACION_ADICIONAL, AUTORIZADA",
            "FINALIZADA, ENTREGADA"
    })
    void transicionesPermitidas(EstadoOrden desde, EstadoOrden hacia) {
        assertThat(desde.puedeCambiarA(hacia)).isTrue();
    }

    @Test
    @DisplayName("Solo existen las 7 transiciones del FP-15")
    void soloSieteTransiciones() {
        int permitidas = 0;
        for (EstadoOrden desde : EstadoOrden.values()) {
            for (EstadoOrden hacia : EstadoOrden.values()) {
                if (desde.puedeCambiarA(hacia)) {
                    permitidas++;
                }
            }
        }
        assertThat(permitidas).isEqualTo(7);
    }

    @ParameterizedTest
    @EnumSource(value = EstadoOrden.class, names = { "ENTREGADA", "CERRADA_SOLO_DIAGNOSTICO" })
    void losEstadosFinalesNoCambian(EstadoOrden finalizado) {
        for (EstadoOrden otro : EstadoOrden.values()) {
            assertThat(finalizado.puedeCambiarA(otro)).isFalse();
        }
        assertThat(finalizado.esCerrado()).isTrue();
    }

    @Test
    void estadosAbiertos() {
        assertThat(EstadoOrden.abiertos()).isEqualTo(Set.of(EstadoOrden.EN_DIAGNOSTICO,
                EstadoOrden.PENDIENTE_AUTORIZACION, EstadoOrden.AUTORIZADA,
                EstadoOrden.EN_ESPERA_AUTORIZACION_ADICIONAL));
        assertThat(EstadoOrden.FINALIZADA.esAbierto()).isFalse();
    }

    @Test
    void codigosDeLaInterfaz() {
        assertThat(EstadoOrden.EN_ESPERA_AUTORIZACION_ADICIONAL.getCodigo()).isEqualTo("espera");
        assertThat(EstadoOrden.CERRADA_SOLO_DIAGNOSTICO.getTexto()).isEqualTo("Cerrada · solo diagnóstico");
    }
}
