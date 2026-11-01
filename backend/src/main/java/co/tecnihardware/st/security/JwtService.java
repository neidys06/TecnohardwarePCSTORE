package co.tecnihardware.st.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.Optional;

import javax.crypto.SecretKey;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import co.tecnihardware.st.config.PropiedadesSeguridad;

/**
 * Firma y verifica el JWT de la sesión. El token viaja en una cookie
 * HttpOnly (el JavaScript de la página no puede leerla) y solo lleva el id del usuario.
 */
@Service
public class JwtService {

    public static final String COOKIE = "th_sesion";

    private final SecretKey clave;
    private final Duration duracion;
    private final boolean cookieSegura;

    public JwtService(PropiedadesSeguridad props) {
        this.clave = Keys.hmacShaKeyFor(props.jwtSecreto().getBytes(StandardCharsets.UTF_8));
        this.duracion = Duration.ofHours(props.sesionHoras());
        this.cookieSegura = props.cookieSegura();
    }

    public String generar(Long idUsuario) {
        Date ahora = new Date();
        return Jwts.builder()
                .subject(String.valueOf(idUsuario))
                .issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + duracion.toMillis()))
                .signWith(clave)
                .compact();
    }

    /** Id del usuario si el token es válido y no ha vencido. */
    public Optional<Long> idUsuario(String token) {
        try {
            String sub = Jwts.parser().verifyWith(clave).build().parseSignedClaims(token).getPayload().getSubject();
            return Optional.of(Long.valueOf(sub));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public ResponseCookie cookieSesion(Long idUsuario) {
        return ResponseCookie.from(COOKIE, generar(idUsuario))
                .httpOnly(true)
                .secure(cookieSegura)
                .sameSite("Lax")
                .path("/")
                .maxAge(duracion)
                .build();
    }

    public ResponseCookie cookieCierre() {
        return ResponseCookie.from(COOKIE, "").httpOnly(true).secure(cookieSegura).sameSite("Lax").path("/")
                .maxAge(0).build();
    }
}
