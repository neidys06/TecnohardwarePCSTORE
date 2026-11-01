package co.tecnihardware.st.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import co.tecnihardware.st.model.Cliente;
import co.tecnihardware.st.model.Equipo;
import co.tecnihardware.st.model.EstadoMantenimiento;
import co.tecnihardware.st.model.EstadoOrden;
import co.tecnihardware.st.model.OrdenServicio;
import co.tecnihardware.st.model.Rol;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.service.CalculadoraMantenimiento.Resultado;

@DisplayName("RF-10/RF-15 · Semáforo del mantenimiento preventivo")
class CalculadoraMantenimientoTest {

    private static final LocalDate HOY = LocalDate.of(2026, 10, 26);
    private final CalculadoraMantenimiento calculadora = new CalculadoraMantenimiento();

    @ParameterizedTest(name = "último {0}, cada {1} meses → {2}")
    @CsvSource({
            "2026-01-10, 6, VENCIDO",   // venció el 10/07/2026
            "2026-05-10, 6, PROXIMO",   // vence el 10/11/2026: faltan 15 días
            "2026-07-01, 6, VIGENTE",   // vence el 01/01/2027
            "2025-11-25, 12, PROXIMO",  // vence el 25/11/2026: faltan 30 días (umbral incluido)
            "2025-11-26, 12, VIGENTE"   // faltan 31 días
    })
    void calcula(LocalDate ultimo, int meses, EstadoMantenimiento esperado) {
        Resultado r = calculadora.calcular(meses, ultimo, HOY, 30);
        assertThat(r.estado()).isEqualTo(esperado);
        assertThat(r.proximoMantenimiento()).isEqualTo(ultimo.plusMonths(meses));
    }

    @Test
    void sinPeriodoOSinServicioPrevio() {
        assertThat(calculadora.calcular(null, HOY, HOY, 30).estado()).isEqualTo(EstadoMantenimiento.SIN_PERIODO);
        assertThat(calculadora.calcular(6, null, HOY, 30).estado()).isEqualTo(EstadoMantenimiento.SIN_PERIODO);
    }

    @Test
    void diasRestantesNegativosCuandoEstaVencido() {
        Resultado r = calculadora.calcular(3, LocalDate.of(2026, 7, 1), HOY, 30);
        assertThat(r.diasRestantes()).isEqualTo(-25L);
    }

    @Test
    void ultimoServicio_esLaEntregaMasReciente_eIgnoraOrdenesAbiertas() {
        LocalDateTime t = HOY.atStartOfDay();
        Usuario admin = new Usuario("admin", "$2a$x", Rol.ADMINISTRADOR, "Gloria", t);
        Equipo e = new Equipo(new Cliente(admin, null, null, HOY), "HP 240 G8", t);

        OrdenServicio vieja = OrdenServicio.abrir(e, "Falla 1", LocalDate.of(2025, 3, 1), admin, t);
        vieja.forzarEstadoHistorico(EstadoOrden.ENTREGADA);
        vieja.setFechaEntrega(LocalDate.of(2025, 3, 5));
        OrdenServicio reciente = OrdenServicio.abrir(e, "Falla 2", LocalDate.of(2026, 4, 1), admin, t);
        reciente.forzarEstadoHistorico(EstadoOrden.ENTREGADA);
        reciente.setFechaEntrega(LocalDate.of(2026, 4, 3));
        OrdenServicio abierta = OrdenServicio.abrir(e, "Falla 3", LocalDate.of(2026, 10, 20), admin, t);

        assertThat(calculadora.ultimoServicio(List.of(vieja, abierta, reciente))).isEqualTo(LocalDate.of(2026, 4, 3));
        assertThat(calculadora.ultimoServicio(List.of(abierta))).isNull();
    }
}
