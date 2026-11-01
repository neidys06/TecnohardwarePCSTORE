package co.tecnihardware.st.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import co.tecnihardware.st.config.PropiedadesTienda;
import co.tecnihardware.st.dto.DiagnosticoRequest;
import co.tecnihardware.st.exception.ConflictoException;
import co.tecnihardware.st.exception.ReglaDeNegocioException;
import co.tecnihardware.st.model.Cliente;
import co.tecnihardware.st.model.Equipo;
import co.tecnihardware.st.model.EstadoOrden;
import co.tecnihardware.st.model.OrdenServicio;
import co.tecnihardware.st.model.Rol;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.EquipoRepository;
import co.tecnihardware.st.repository.OrdenServicioRepository;
import co.tecnihardware.st.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrdenService · reglas del flujo de la orden")
class OrdenServiceTest {

    private final Clock reloj = Clock.fixed(Instant.parse("2026-10-26T15:00:00Z"), ZoneId.of("America/Bogota"));

    @Mock
    private OrdenServicioRepository ordenes;
    @Mock
    private EquipoRepository equipos;
    @Mock
    private UsuarioRepository usuarios;
    @Mock
    private ArchivoService archivos;
    @Mock
    private NotificacionService notificaciones;
    @Mock
    private ConfiguracionService configuracion;

    private OrdenService servicio;
    private Usuario admin;
    private Equipo equipo;

    @BeforeEach
    void setUp() {
        servicio = new OrdenService(ordenes, equipos, usuarios, archivos, notificaciones, configuracion,
                new OrdenMapper(), new ObjectMapper(), reloj,
                new PropiedadesTienda(List.of("Gloria Rojas Rivera", "Dichel Susana Rojas Rivera")));
        LocalDateTime ahora = LocalDateTime.now(reloj);
        admin = new Usuario("admin", "$2a$x", Rol.ADMINISTRADOR, "Gloria Rojas", ahora);
        Usuario u = new Usuario("cmendoza", "$2a$x", Rol.CLIENTE, "Carlos Mendoza", ahora);
        equipo = new Equipo(new Cliente(u, null, "3105550142", ahora.toLocalDate()), "Lenovo IdeaPad 3", ahora);
    }

    @Test
    void crear_sinQuienRecibeElEquipo_seRechaza() {
        assertThatThrownBy(() -> servicio.crear(1L, "No enciende el equipo", null, null, "Pedro Pérez", List.of(), 1L))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessage("Elige quién recibió el equipo.");
        verify(ordenes, never()).save(any());
    }

    @Test
    void crear_conOrdenAbierta_seRechaza() {
        MockMultipartFile foto = new MockMultipartFile("fotos", "a.png", "image/png", new byte[] { 1 });
        when(archivos.fotosPorCarga()).thenReturn(10);
        when(equipos.findById(1L)).thenReturn(Optional.of(equipo));
        when(ordenes.existsByEquipoIdAndEstadoIn(anyLong(), any())).thenReturn(true);

        assertThatThrownBy(() -> servicio.crear(1L, "No enciende el equipo", null, null, "Gloria Rojas Rivera",
                List.of(foto), 1L))
                .isInstanceOf(ConflictoException.class)
                .hasMessage("Este equipo ya tiene una orden abierta.");
    }

    @Test
    void crear_conFechaFutura_seRechaza() {
        MockMultipartFile foto = new MockMultipartFile("fotos", "a.png", "image/png", new byte[] { 1 });
        when(archivos.fotosPorCarga()).thenReturn(10);
        when(equipos.findById(1L)).thenReturn(Optional.of(equipo));

        assertThatThrownBy(() -> servicio.crear(1L, "No enciende el equipo", null, LocalDate.of(2026, 12, 1),
                "Dichel Susana Rojas Rivera", List.of(foto), 1L))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessageContaining("posterior a hoy");
    }

    @Test
    void diagnostico_sinFotosDeIngreso_seRechaza() {
        OrdenServicio o = OrdenServicio.abrir(equipo, "No enciende", LocalDate.now(reloj), admin, LocalDateTime.now(reloj));
        when(ordenes.bloquear(139L)).thenReturn(Optional.of(o));

        assertThatThrownBy(() -> servicio.registrarDiagnostico("OS-0139",
                new DiagnosticoRequest("Fuente de poder dañada", new BigDecimal("95000")), 1L))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessage("Antes de pedir la autorización adjunta las fotos de ingreso.");
        assertThat(o.getEstado()).isEqualTo(EstadoOrden.EN_DIAGNOSTICO);
    }

    @Test
    void entregar_unaOrdenQueNoEstaFinalizada_seRechaza() {
        OrdenServicio o = OrdenServicio.abrir(equipo, "No enciende", LocalDate.now(reloj), admin, LocalDateTime.now(reloj));
        when(ordenes.bloquear(139L)).thenReturn(Optional.of(o));

        assertThatThrownBy(() -> servicio.entregar("OS-0139", "Carlos Mendoza", "Gloria Rojas Rivera", 1L))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("requiere que esté «Finalizada»");
    }

    @Test
    void entregar_porAlguienQueNoEsDeLaTienda_seRechaza() {
        assertThatThrownBy(() -> servicio.entregar("OS-0139", "Carlos Mendoza", "Pedro Pérez", 1L))
                .isInstanceOf(ReglaDeNegocioException.class)
                .hasMessage("Elige quién entregó el equipo.");
        verify(ordenes, never()).bloquear(anyLong());
    }

    @Test
    void codigoMalFormado_noConsultaLaBaseDeDatos() {
        assertThatThrownBy(() -> servicio.obtener("OS-1' OR '1'='1"))
                .hasMessage("La orden no existe.");
        verify(ordenes, never()).findById(anyLong());
    }
}
