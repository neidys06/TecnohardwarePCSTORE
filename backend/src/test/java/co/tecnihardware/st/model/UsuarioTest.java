package co.tecnihardware.st.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("RNF-09 · Bloqueo de la cuenta por intentos fallidos")
class UsuarioTest {

    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 10, 26, 10, 0);

    @Test
    void alQuintoIntentoFallido_seBloquea15Minutos() {
        Usuario u = new Usuario("Carlos", "$2a$hash", Rol.CLIENTE, "Carlos", AHORA);
        for (int i = 1; i <= 4; i++) {
            assertThat(u.registrarIntentoFallido(5, 15, AHORA)).isFalse();
        }
        assertThat(u.registrarIntentoFallido(5, 15, AHORA)).isTrue();

        assertThat(u.getUsuario()).isEqualTo("carlos");
        assertThat(u.estaBloqueado(AHORA.plusMinutes(14))).isTrue();
        assertThat(u.minutosParaDesbloqueo(AHORA.plusMinutes(10))).isEqualTo(5);
        assertThat(u.estaBloqueado(AHORA.plusMinutes(15))).isFalse();
        assertThat(u.getIntentosFallidos()).isZero();
    }

    @Test
    void ingresoExitoso_reiniciaElContador() {
        Usuario u = new Usuario("carlos", "$2a$hash", Rol.CLIENTE, "Carlos", AHORA);
        u.registrarIntentoFallido(5, 15, AHORA);
        u.registrarIngresoExitoso();
        assertThat(u.getIntentosFallidos()).isZero();
    }

    @Test
    void contrasenaTemporal_obligaACambiarla() {
        Usuario u = new Usuario("carlos", "$2a$a", Rol.CLIENTE, "Carlos", AHORA);
        u.cambiarContrasena("$2a$b");
        assertThat(u.isDebeCambiarContrasena()).isFalse();
        u.asignarContrasenaTemporal("$2a$c");
        assertThat(u.isDebeCambiarContrasena()).isTrue();
    }
}
