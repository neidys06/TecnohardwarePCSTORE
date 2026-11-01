package co.tecnihardware.st.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.tecnihardware.st.dto.CambiarContrasenaRequest;
import co.tecnihardware.st.dto.LoginRequest;
import co.tecnihardware.st.dto.LoginResponse;
import co.tecnihardware.st.dto.MensajeDTO;
import co.tecnihardware.st.dto.SesionDTO;
import co.tecnihardware.st.dto.SolicitudRestablecimientoRequest;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.security.JwtService;
import co.tecnihardware.st.security.UsuarioPrincipal;
import co.tecnihardware.st.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticación", description = "RF-02 inicio de sesión, RF-17 cambio de contraseña, RNF-09 bloqueo")
public class AuthController {

    private final AuthService auth;
    private final JwtService jwt;

    public AuthController(AuthService auth, JwtService jwt) {
        this.auth = auth;
        this.jwt = jwt;
    }

    @Operation(summary = "Iniciar sesión", description = "Deja la sesión en una cookie HttpOnly. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.")
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest r) {
        Usuario u = auth.iniciarSesion(r.usuario(), r.contrasena());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwt.cookieSesion(u.getId()).toString())
                .body(new LoginResponse(u.getRol().name(), u.getNombre(), u.isDebeCambiarContrasena()));
    }

    @Operation(summary = "Cerrar sesión")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, jwt.cookieCierre().toString()).build();
    }

    /** Sin sesión responde {@code null}: no es un error, la página apenas abre. */
    @Operation(summary = "Sesión actual")
    @GetMapping("/sesion")
    public ResponseEntity<Object> sesion(@AuthenticationPrincipal UsuarioPrincipal yo) {
        if (yo == null) {
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body("null");
        }
        return ResponseEntity.ok(new SesionDTO(yo.getRol().name(), yo.getNombre(), yo.getUsername(),
                yo.getIdCliente(), yo.isDebeCambiarContrasena()));
    }

    @Operation(summary = "Cambiar la contraseña (también la temporal del primer ingreso)")
    @PostMapping("/cambiar-contrasena")
    public ResponseEntity<Void> cambiarContrasena(@AuthenticationPrincipal UsuarioPrincipal yo,
            @Valid @RequestBody CambiarContrasenaRequest r) {
        auth.cambiarContrasena(yo.getId(), r);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Pedir a la tienda que restablezca la contraseña", description = "La respuesta es la misma exista o no el usuario.")
    @PostMapping("/solicitar-restablecimiento")
    public ResponseEntity<MensajeDTO> solicitarRestablecimiento(@Valid @RequestBody SolicitudRestablecimientoRequest r) {
        auth.solicitarRestablecimiento(r.usuario());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new MensajeDTO("Si el usuario existe, la tienda recibirá tu solicitud."));
    }
}
