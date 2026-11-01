package co.tecnihardware.st.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

import co.tecnihardware.st.security.CsrfCookieFilter;
import co.tecnihardware.st.security.JwtCookieFilter;
import co.tecnihardware.st.security.JwtService;
import co.tecnihardware.st.security.PoliticaContenido;
import co.tecnihardware.st.security.RespuestasSeguridad;
import co.tecnihardware.st.security.UsuarioDetailsService;

/**
 * Spring Security 6.
 * <ul>
 * <li>Autenticación: usuario y contraseña contra la BD con BCrypt; la sesión es un JWT en
 * cookie HttpOnly (sin estado en el servidor).</li>
 * <li>Autorización por URL (rol) y por método (@PreAuthorize en los controladores).</li>
 * <li>CSRF activo: como la sesión viaja en cookie, el frontend debe devolver el token
 * de la cookie XSRF-TOKEN en la cabecera X-XSRF-TOKEN.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String ADMIN = "ADMINISTRADOR";
    private static final String CLIENTE = "CLIENTE";

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtService jwt, UsuarioDetailsService usuarios,
            RespuestasSeguridad respuestas, PoliticaContenido csp) throws Exception {
        CookieCsrfTokenRepository csrfRepo = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepo.setCookiePath("/");

        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepo)
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Públicas
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/logout",
                                "/api/auth/solicitar-restablecimiento").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/sesion", "/api/salud").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/api-docs/**").permitAll()
                        // Con contraseña temporal solo se puede crear la nueva (RF-17)
                        .requestMatchers("/api/auth/cambiar-contrasena").authenticated()
                        // Módulos del Administrador (RF-01 a RF-18)
                        .requestMatchers("/api/clientes/**", "/api/equipos/**", "/api/ordenes/**",
                                "/api/mantenimientos/**").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.PUT, "/api/configuracion").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/lista-precios").hasRole(ADMIN)
                        // Portal del cliente (RF-19)
                        .requestMatchers("/api/portal/**").hasRole(CLIENTE)
                        // Resto de la API: cualquier cuenta con contraseña definitiva
                        .requestMatchers("/api/**", "/actuator/**").hasAnyRole(ADMIN, CLIENTE)
                        // Archivos del frontend (index.html, JS, CSS)
                        .anyRequest().permitAll())
                .exceptionHandling(e -> e.authenticationEntryPoint(respuestas).accessDeniedHandler(respuestas))
                .headers(h -> h
                        .contentSecurityPolicy(c -> c.policyDirectives(csp.getPolitica()))
                        // La lista de precios en PDF se muestra en un marco de la propia página.
                        .frameOptions(f -> f.sameOrigin()))
                .formLogin(f -> f.disable())
                .httpBasic(b -> b.disable())
                .logout(l -> l.disable())
                .addFilterBefore(new JwtCookieFilter(jwt, usuarios), UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class);
        return http.build();
    }

    /** BCrypt con factor de costo configurable (12 en producción). */
    @Bean
    public PasswordEncoder passwordEncoder(PropiedadesSeguridad props) {
        return new BCryptPasswordEncoder(props.bcryptCosto());
    }

    /** DaoAuthenticationProvider con el UserDetailsService propio. */
    @Bean
    public AuthenticationManager authenticationManager(UsuarioDetailsService usuarios, PasswordEncoder encoder) {
        DaoAuthenticationProvider proveedor = new DaoAuthenticationProvider();
        proveedor.setUserDetailsService(usuarios);
        proveedor.setPasswordEncoder(encoder);
        return new ProviderManager(proveedor);
    }
}
