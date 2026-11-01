package co.tecnihardware.st.security;

import java.io.IOException;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.stereotype.Component;

import co.tecnihardware.st.exception.ApiError;

/** Respuestas JSON (formato ApiError) para 401 y 403 producidos por los filtros de seguridad. */
@Component
public class RespuestasSeguridad implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper json;

    public RespuestasSeguridad(ObjectMapper json) {
        this.json = json;
    }

    @Override
    public void commence(HttpServletRequest req, HttpServletResponse res, AuthenticationException ex)
            throws IOException {
        escribir(req, res, HttpStatus.UNAUTHORIZED, "Tu sesión terminó. Inicia sesión de nuevo.");
    }

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse res, AccessDeniedException ex) throws IOException {
        String mensaje;
        if (ex instanceof CsrfException) {
            mensaje = "La página estuvo abierta mucho tiempo. Recárgala e inténtalo de nuevo.";
        } else if (tieneContrasenaTemporal()) {
            mensaje = "Debes crear una contraseña nueva antes de continuar.";
        } else {
            mensaje = "No tienes permiso para ver esta información.";
        }
        escribir(req, res, HttpStatus.FORBIDDEN, mensaje);
    }

    private static boolean tieneContrasenaTemporal() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return a != null && a.getAuthorities().stream()
                .anyMatch(g -> UsuarioPrincipal.ROL_TEMPORAL.equals(g.getAuthority()));
    }

    private void escribir(HttpServletRequest req, HttpServletResponse res, HttpStatus s, String mensaje)
            throws IOException {
        res.setStatus(s.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        json.writeValue(res.getOutputStream(),
                ApiError.de(s.value(), s.getReasonPhrase(), mensaje, req.getRequestURI(), Map.of()));
    }
}
