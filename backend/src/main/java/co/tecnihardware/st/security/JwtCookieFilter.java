package co.tecnihardware.st.security;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Lee la cookie de sesión, verifica el JWT y deja al usuario en el SecurityContext.
 * Se registra solo dentro de la cadena de Spring Security (no es un @Component).
 */
public class JwtCookieFilter extends OncePerRequestFilter {

    private final JwtService jwt;
    private final UsuarioDetailsService usuarios;

    public JwtCookieFilter(JwtService jwt, UsuarioDetailsService usuarios) {
        this.jwt = jwt;
        this.usuarios = usuarios;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String token = leerCookie(req);
        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            jwt.idUsuario(token).flatMap(usuarios::cargarPorId).ifPresent(p -> {
                var auth = new UsernamePasswordAuthenticationToken(p, null, p.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            });
        }
        chain.doFilter(req, res);
    }

    private static String leerCookie(HttpServletRequest req) {
        Cookie[] cookies = req.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie c : cookies) {
            if (JwtService.COOKIE.equals(c.getName()) && !c.getValue().isBlank()) {
                return c.getValue();
            }
        }
        return null;
    }
}
