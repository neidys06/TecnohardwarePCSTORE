package co.tecnihardware.st.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import co.tecnihardware.st.exception.ConflictoException;

@DisplayName("OrdenServicio · reglas del RF-06 y RF-18")
class OrdenServicioTest {

    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 10, 26, 10, 0);
    private static final BigDecimal DIAGNOSTICO = new BigDecimal("32000");

    private Usuario admin;
    private OrdenServicio orden;

    @BeforeEach
    void setUp() {
        admin = new Usuario("admin", "$2a$hash", Rol.ADMINISTRADOR, "Gloria Rojas", AHORA);
        Usuario u = new Usuario("cliente", "$2a$hash", Rol.CLIENTE, "Carlos Mendoza", AHORA);
        Cliente c = new Cliente(u, null, "3105550142", AHORA.toLocalDate());
        Equipo e = new Equipo(c, "Lenovo IdeaPad 3", AHORA);
        orden = OrdenServicio.abrir(e, "No enciende", LocalDate.of(2026, 10, 20), admin, AHORA);
    }

    @Test
    void unaOrdenNuevaIniciaEnDiagnosticoYQuedaEnElHistorial() {
        assertThat(orden.getEstado()).isEqualTo(EstadoOrden.EN_DIAGNOSTICO);
        assertThat(orden.getHistorial()).hasSize(1);
        assertThat(orden.getHistorial().get(0).getEstadoAnterior()).isNull();
        assertThat(orden.getHistorial().get(0).getObservacion()).isEqualTo("Orden creada por Gloria Rojas");
    }

    @Test
    void cambiarEstado_registraQuienYCuando() {
        orden.cambiarEstado(EstadoOrden.PENDIENTE_AUTORIZACION, "Diagnóstico registrado", admin, AHORA);

        CambioEstado ultimo = orden.getHistorial().get(1);
        assertThat(ultimo.getEstadoAnterior()).isEqualTo(EstadoOrden.EN_DIAGNOSTICO);
        assertThat(ultimo.getEstadoNuevo()).isEqualTo(EstadoOrden.PENDIENTE_AUTORIZACION);
        assertThat(ultimo.getUsuario()).isSameAs(admin);
    }

    @Test
    void cambiarEstado_transicionNoPermitida_lanzaConflicto() {
        assertThatThrownBy(() -> orden.cambiarEstado(EstadoOrden.ENTREGADA, "", admin, AHORA))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("Transición no permitida");
        assertThat(orden.getEstado()).isEqualTo(EstadoOrden.EN_DIAGNOSTICO);
        assertThat(orden.getHistorial()).hasSize(1);
    }

    @Test
    void exigirEstado_indicaElEstadoRequerido() {
        assertThatThrownBy(() -> orden.exigirEstado(EstadoOrden.FINALIZADA))
                .isInstanceOf(ConflictoException.class)
                .hasMessage("La orden está «En diagnóstico». Esta acción requiere que esté «Finalizada».");
    }

    @Test
    void anotar_noCambiaElEstado() {
        orden.anotar("Mensaje enviado por WhatsApp", admin, AHORA);
        assertThat(orden.getEstado()).isEqualTo(EstadoOrden.EN_DIAGNOSTICO);
        assertThat(orden.getHistorial()).hasSize(2);
    }

    @Test
    void monto_siNoAutorizaSeCobraSoloElDiagnostico() {
        orden.setCostoEstimado(new BigDecimal("180000"));
        orden.cambiarEstado(EstadoOrden.PENDIENTE_AUTORIZACION, "", admin, AHORA);
        orden.cambiarEstado(EstadoOrden.CERRADA_SOLO_DIAGNOSTICO, "", admin, AHORA);

        assertThat(orden.calcularMonto(DIAGNOSTICO)).isEqualByComparingTo("32000");
    }

    @Test
    void monto_sumaSoloLasAdicionalesAutorizadas() {
        orden.setCostoEstimado(new BigDecimal("95000"));
        Autorizacion si = new Autorizacion(orden, TipoAutorizacion.ADICIONAL, "Puerto de carga flojo",
                new BigDecimal("60000"), AHORA);
        si.responder(DecisionCliente.AUTORIZA, AHORA);
        Autorizacion no = new Autorizacion(orden, TipoAutorizacion.ADICIONAL, "Cambio de teclado",
                new BigDecimal("120000"), AHORA);
        no.responder(DecisionCliente.NO_AUTORIZA, AHORA);
        orden.getAutorizaciones().add(si);
        orden.getAutorizaciones().add(no);

        assertThat(orden.calcularMonto(DIAGNOSTICO)).isEqualByComparingTo("155000");
    }

    @Test
    void codigoVisible() {
        assertThat(OrdenServicio.codigoDe(139L)).isEqualTo("OS-0139");
        assertThat(OrdenServicio.idDesdeCodigo("os-0139")).contains(139L);
        assertThat(OrdenServicio.idDesdeCodigo("OS-12")).isEmpty();
        assertThat(OrdenServicio.idDesdeCodigo("1 OR 1=1")).isEmpty();
    }
}
