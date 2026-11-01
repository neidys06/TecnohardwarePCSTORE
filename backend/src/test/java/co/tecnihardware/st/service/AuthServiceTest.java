package co.tecnihardware.st.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import co.tecnihardware.st.config.PropiedadesSeguridad;
import co.tecnihardware.st.dto.CambiarContrasenaRequest;
import co.tecnihardware.st.exception.CredencialesInvalidasException;
import co.tecnihardware.st.exception.CuentaBloqueadaException;
import co.tecnihardware.st.exception.ReglaDeNegocioException;
import co.tecnihardware.st.model.Rol;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.ClienteRepository;
import co.tecnihardware.st.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService")
class AuthServiceTest {

    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");
    private final Clock reloj = Clock.fixed(Instant.parse("2026-10-26T15:00:00Z"), BOGOTA);

    @Mock
    private AuthenticationManager authManager;
    @Mock
    private UsuarioRepository usuarios;
    @Mock
    private ClienteRepository clientes;
    @Mock
    private PasswordEncoder encoder;
    @Mock
    private NotificacionService notificaciones;

    private AuthService auth;
    private Usuario carlos;

    @BeforeEach
    void setUp() {
        PropiedadesSeguridad props = new PropiedadesSeguridad("x".repeat(40), 12, false, 4, 5, 15);
        auth = new AuthService(authManager, usuarios, clientes, encoder, notificaciones, props, reloj);
        carlos = new Usuario("cmendoza", "$2a$hash", Rol.CLIENTE, "Carlos Mendoza", LocalDateTime.now(reloj));
    }

    @Nested
    @DisplayName("Al iniciar sesión (RNF-09)")
    class IniciarSesion {

        @Test
        void conCredencialesCorrectas_reiniciaLosIntentos() {
            carlos.registrarIntentoFallido(5, 15, LocalDateTime.now(reloj));
            when(usuarios.findByUsuarioAndActivoTrue("cmendoza")).thenReturn(Optional.of(carlos));

            Usuario u = auth.iniciarSesion("  CMendoza ", "Carlos2026");

            assertThat(u).isSameAs(carlos);
            assertThat(carlos.getIntentosFallidos()).isZero();
        }

        @Test
        void conContrasenaIncorrecta_sumaUnIntento() {
            when(usuarios.findByUsuarioAndActivoTrue("cmendoza")).thenReturn(Optional.of(carlos));
            when(authManager.authenticate(any())).thenThrow(new BadCredentialsException("mal"));

            assertThatThrownBy(() -> auth.iniciarSesion("cmendoza", "mala"))
                    .isInstanceOf(CredencialesInvalidasException.class);
            assertThat(carlos.getIntentosFallidos()).isEqualTo(1);
        }

        @Test
        void alQuintoIntento_bloqueaLaCuenta() {
            when(usuarios.findByUsuarioAndActivoTrue("cmendoza")).thenReturn(Optional.of(carlos));
            when(authManager.authenticate(any())).thenThrow(new BadCredentialsException("mal"));
            for (int i = 0; i < 4; i++) {
                assertThatThrownBy(() -> auth.iniciarSesion("cmendoza", "mala"))
                        .isInstanceOf(CredencialesInvalidasException.class);
            }

            assertThatThrownBy(() -> auth.iniciarSesion("cmendoza", "mala"))
                    .isInstanceOf(CuentaBloqueadaException.class)
                    .hasMessageContaining("15 min");
            assertThat(carlos.estaBloqueado(LocalDateTime.now(reloj))).isTrue();
        }

        @Test
        void conCuentaBloqueada_noVerificaLaContrasena() {
            for (int i = 0; i < 5; i++) {
                carlos.registrarIntentoFallido(5, 15, LocalDateTime.now(reloj));
            }
            when(usuarios.findByUsuarioAndActivoTrue("cmendoza")).thenReturn(Optional.of(carlos));

            assertThatThrownBy(() -> auth.iniciarSesion("cmendoza", "Carlos2026"))
                    .isInstanceOf(CuentaBloqueadaException.class);
            verify(authManager, never()).authenticate(any());
        }

        @Test
        void usuarioInexistente_mismoMensajeQueContrasenaIncorrecta() {
            when(usuarios.findByUsuarioAndActivoTrue("nadie")).thenReturn(Optional.empty());
            when(authManager.authenticate(any())).thenThrow(new BadCredentialsException("mal"));

            assertThatThrownBy(() -> auth.iniciarSesion("nadie", "x"))
                    .isInstanceOf(CredencialesInvalidasException.class)
                    .hasMessage("Usuario o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.");
        }
    }

    @Nested
    @DisplayName("Al cambiar la contraseña (RF-17)")
    class CambiarContrasena {

        @BeforeEach
        void cuenta() {
            when(usuarios.findByIdAndActivoTrue(7L)).thenReturn(Optional.of(carlos));
        }

        @Test
        void sinNumero_seRechaza() {
            assertThatThrownBy(() -> auth.cambiarContrasena(7L, new CambiarContrasenaRequest(null, "solo-letras", "solo-letras")))
                    .isInstanceOf(ReglaDeNegocioException.class)
                    .hasMessageContaining("8 caracteres y un número");
        }

        @Test
        void confirmacionDistinta_seRechaza() {
            assertThatThrownBy(() -> auth.cambiarContrasena(7L, new CambiarContrasenaRequest(null, "Nueva2026", "Nueva2027")))
                    .isInstanceOf(ReglaDeNegocioException.class)
                    .hasMessage("Las contraseñas no coinciden.");
        }

        @Test
        void primerIngreso_noPideLaActual() {
            when(encoder.matches("Nueva2026", "$2a$hash")).thenReturn(false);
            when(encoder.encode("Nueva2026")).thenReturn("$2a$nuevo");

            auth.cambiarContrasena(7L, new CambiarContrasenaRequest(null, "Nueva2026", "Nueva2026"));

            assertThat(carlos.isDebeCambiarContrasena()).isFalse();
            assertThat(carlos.getContrasenaHash()).isEqualTo("$2a$nuevo");
        }

        @Test
        void conContrasenaDefinitiva_exigeLaActualCorrecta() {
            carlos.cambiarContrasena("$2a$hash");
            when(encoder.matches("Equivocada1", "$2a$hash")).thenReturn(false);

            assertThatThrownBy(() -> auth.cambiarContrasena(7L, new CambiarContrasenaRequest("Equivocada1", "Nueva2026", "Nueva2026")))
                    .isInstanceOf(ReglaDeNegocioException.class)
                    .hasMessage("La contraseña actual no es correcta.");
        }
    }
}
