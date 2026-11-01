package co.tecnihardware.st.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import co.tecnihardware.st.model.Cliente;
import co.tecnihardware.st.model.Equipo;
import co.tecnihardware.st.model.EstadoOrden;
import co.tecnihardware.st.model.Notificacion;
import co.tecnihardware.st.model.OrdenServicio;
import co.tecnihardware.st.model.Rol;
import co.tecnihardware.st.model.Usuario;

/** Capa de persistencia con H2 en memoria. */
@DataJpaTest
@ActiveProfiles("test")
class RepositoriosTest {

    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 10, 26, 10, 0);

    @Autowired
    private TestEntityManager em;
    @Autowired
    private OrdenServicioRepository ordenes;
    @Autowired
    private UsuarioRepository usuarios;
    @Autowired
    private NotificacionRepository notificaciones;

    private Usuario admin;
    private Usuario cuentaCliente;
    private Equipo equipo;

    @BeforeEach
    void setUp() {
        admin = em.persist(new Usuario("admin", "$2a$x", Rol.ADMINISTRADOR, "Gloria Rojas", AHORA));
        cuentaCliente = em.persist(new Usuario("cmendoza", "$2a$x", Rol.CLIENTE, "Carlos Mendoza", AHORA));
        Cliente c = em.persist(new Cliente(cuentaCliente, "1090456781", "3105550142", AHORA.toLocalDate()));
        equipo = em.persist(new Equipo(c, "Lenovo IdeaPad 3", AHORA));
        em.flush();
    }

    @Test
    void unEquipoConOrdenAbierta_esDetectado() {
        OrdenServicio o = ordenes.save(OrdenServicio.abrir(equipo, "No enciende", LocalDate.of(2026, 10, 20), admin, AHORA));
        em.flush();

        assertThat(ordenes.existsByEquipoIdAndEstadoIn(equipo.getId(), EstadoOrden.abiertos())).isTrue();

        o.forzarEstadoHistorico(EstadoOrden.ENTREGADA);
        em.flush();
        assertThat(ordenes.existsByEquipoIdAndEstadoIn(equipo.getId(), EstadoOrden.abiertos())).isFalse();
    }

    @Test
    void elHistorialSeGuardaEnCascadaConLaOrden() {
        OrdenServicio o = ordenes.save(OrdenServicio.abrir(equipo, "No enciende", LocalDate.of(2026, 10, 20), admin, AHORA));
        o.cambiarEstado(EstadoOrden.PENDIENTE_AUTORIZACION, "Diagnóstico registrado", admin, AHORA.plusHours(1));
        em.flush();
        em.clear();

        OrdenServicio leida = ordenes.findById(o.getId()).orElseThrow();
        assertThat(leida.getHistorial()).extracting(c -> c.getEstadoNuevo())
                .containsExactly(EstadoOrden.EN_DIAGNOSTICO, EstadoOrden.PENDIENTE_AUTORIZACION);
        assertThat(ordenes.listarDeCliente(equipo.getCliente().getId())).hasSize(1);
    }

    @Test
    void usuarioSeBuscaEnMinusculasYSoloActivo() {
        assertThat(usuarios.findByUsuarioAndActivoTrue("cmendoza")).isPresent();
        cuentaCliente.setActivo(false);
        em.flush();
        assertThat(usuarios.findByUsuarioAndActivoTrue("cmendoza")).isEmpty();
    }

    @Test
    void marcarLeida_soloAfectaAvisosDelPropioUsuario() {
        Notificacion delAdmin = new Notificacion(admin, "aut-OS-0001");
        delAdmin.renovar("OS-0001 espera la respuesta", "", "/admin/ordenes/OS-0001", null, AHORA);
        em.persist(delAdmin);
        em.flush();

        int afectadas = notificaciones.marcarLeida(cuentaCliente.getId(), delAdmin.getId());

        assertThat(afectadas).isZero();
    }
}
