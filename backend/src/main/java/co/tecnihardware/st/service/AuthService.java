package co.tecnihardware.st.service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.tecnihardware.st.config.PropiedadesSeguridad;
import co.tecnihardware.st.dto.CambiarContrasenaRequest;
import co.tecnihardware.st.exception.CredencialesInvalidasException;
import co.tecnihardware.st.exception.CuentaBloqueadaException;
import co.tecnihardware.st.exception.RecursoNoEncontradoException;
import co.tecnihardware.st.exception.ReglaDeNegocioException;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.ClienteRepository;
import co.tecnihardware.st.repository.UsuarioRepository;

/** Inicio de sesión (RF-02), bloqueo por intentos (RNF-09) y cambio de contraseña (RF-17). */
@Service
@Transactional(readOnly = true)
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final AuthenticationManager authManager;
    private final UsuarioRepository usuarios;
    private final ClienteRepository clientes;
    private final PasswordEncoder encoder;
    private final NotificacionService notificaciones;
    private final PropiedadesSeguridad props;
    private final Clock reloj;

    public AuthService(AuthenticationManager authManager, UsuarioRepository usuarios, ClienteRepository clientes,
            PasswordEncoder encoder, NotificacionService notificaciones, PropiedadesSeguridad props, Clock reloj) {
        this.authManager = authManager;
        this.usuarios = usuarios;
        this.clientes = clientes;
        this.encoder = encoder;
        this.notificaciones = notificaciones;
        this.props = props;
        this.reloj = reloj;
    }

    /**
     * Verifica usuario y contraseña con Spring Security (BCrypt). Los intentos fallidos
     * se guardan aunque se lance la excepción (noRollbackFor), y al quinto la cuenta
     * queda bloqueada 15 minutos.
     */
    @Transactional(noRollbackFor = { CredencialesInvalidasException.class, CuentaBloqueadaException.class })
    public Usuario iniciarSesion(String usuario, String contrasena) {
        String nombreUsuario = usuario.trim().toLowerCase();
        LocalDateTime ahora = LocalDateTime.now(reloj);
        Optional<Usuario> cuenta = usuarios.findByUsuarioAndActivoTrue(nombreUsuario);

        if (cuenta.isPresent() && cuenta.get().estaBloqueado(ahora)) {
            throw new CuentaBloqueadaException("Por seguridad la cuenta está bloqueada. Inténtalo de nuevo en "
                    + cuenta.get().minutosParaDesbloqueo(ahora) + " min.");
        }
        try {
            authManager.authenticate(new UsernamePasswordAuthenticationToken(nombreUsuario, contrasena));
        } catch (AuthenticationException e) {
            if (cuenta.isPresent()
                    && cuenta.get().registrarIntentoFallido(props.maxIntentos(), props.minutosBloqueo(), ahora)) {
                log.warn("Cuenta id={} bloqueada por {} intentos fallidos", cuenta.get().getId(), props.maxIntentos());
                throw new CuentaBloqueadaException("Por seguridad la cuenta quedó bloqueada " + props.minutosBloqueo()
                        + " min después de " + props.maxIntentos() + " intentos fallidos.");
            }
            throw new CredencialesInvalidasException();
        }
        Usuario u = cuenta.orElseThrow(CredencialesInvalidasException::new);
        u.registrarIngresoExitoso();
        log.info("Inicio de sesión id={} rol={}", u.getId(), u.getRol());
        return u;
    }

    /** RF-17 · También sirve para crear la contraseña propia en el primer ingreso. */
    @Transactional
    public void cambiarContrasena(Long idUsuario, CambiarContrasenaRequest r) {
        Usuario u = usuarios.findByIdAndActivoTrue(idUsuario)
                .orElseThrow(() -> new RecursoNoEncontradoException("La cuenta"));
        if (!GeneradorContrasena.esValida(r.nueva())) {
            throw new ReglaDeNegocioException("La contraseña debe tener al menos 8 caracteres y un número.", "nueva",
                    "Al menos 8 caracteres y un número.");
        }
        if (!r.nueva().equals(r.confirmacion())) {
            throw new ReglaDeNegocioException("Las contraseñas no coinciden.", "confirmacion",
                    "Las contraseñas no coinciden.");
        }
        // En el primer ingreso la contraseña actual ya se validó al iniciar sesión.
        if (!u.isDebeCambiarContrasena()
                && (r.actual() == null || !encoder.matches(r.actual(), u.getContrasenaHash()))) {
            throw new ReglaDeNegocioException("La contraseña actual no es correcta.", "actual",
                    "La contraseña actual no es correcta.");
        }
        if (encoder.matches(r.nueva(), u.getContrasenaHash())) {
            throw new ReglaDeNegocioException("La contraseña nueva debe ser diferente de la anterior.", "nueva",
                    "Debe ser diferente de la anterior.");
        }
        u.cambiarContrasena(encoder.encode(r.nueva()));
        log.info("Contraseña actualizada id={}", u.getId());
    }

    /**
     * RF-01 · El cliente que olvidó su contraseña la pide desde el inicio de sesión y la
     * administradora recibe el aviso. No revela si el usuario existe.
     */
    @Transactional
    public void solicitarRestablecimiento(String usuario) {
        usuarios.findByUsuarioAndActivoTrue(usuario.trim().toLowerCase())
                .flatMap(u -> clientes.findByUsuarioId(u.getId()))
                .ifPresent(c -> notificaciones.notificarAdministradores(
                        AvisoFactory.solicitudContrasena(c.getId(), c.getNombre())));
    }
}
