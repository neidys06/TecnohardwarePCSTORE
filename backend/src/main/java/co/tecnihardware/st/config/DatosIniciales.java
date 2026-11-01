package co.tecnihardware.st.config;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import co.tecnihardware.st.model.ConfiguracionSistema;
import co.tecnihardware.st.model.Rol;
import co.tecnihardware.st.model.TipoEquipo;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.ConfiguracionRepository;
import co.tecnihardware.st.repository.TipoEquipoRepository;
import co.tecnihardware.st.repository.UsuarioRepository;

/**
 * Datos mínimos para operar (E2.3): categorías de equipo (Acta 4), configuración y la
 * cuenta preconfigurada del Administrador (RF-02) con contraseña temporal (RF-17).
 * Solo crea lo que falta: es seguro ejecutarlo en cada arranque.
 */
@Component
@Order(1)
public class DatosIniciales implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatosIniciales.class);

    static final List<String> CATEGORIAS = List.of("Portátil", "PC de escritorio", "Todo en uno", "Impresora", "Dron",
            "Parlante", "Cargador", "Videobeam", "Televisor");
    static final String PLANTILLA = "Hola {nombre}, te recordamos de TecniHardware PC Store que el mantenimiento "
            + "preventivo de tu {equipo} {estado} el {fecha}. Escríbenos por este medio para agendarlo. "
            + "Estamos en el Local 208.";

    private final TipoEquipoRepository tipos;
    private final ConfiguracionRepository configuracion;
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final PropiedadesAdmin admin;
    private final Clock reloj;

    public DatosIniciales(TipoEquipoRepository tipos, ConfiguracionRepository configuracion,
            UsuarioRepository usuarios, PasswordEncoder encoder, PropiedadesAdmin admin, Clock reloj) {
        this.tipos = tipos;
        this.configuracion = configuracion;
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.admin = admin;
        this.reloj = reloj;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        LocalDateTime ahora = LocalDateTime.now(reloj);
        if (tipos.count() == 0) {
            for (int i = 0; i < CATEGORIAS.size(); i++) {
                tipos.save(new TipoEquipo(CATEGORIAS.get(i), i + 1));
            }
            log.info("Categorías de equipo creadas");
        }
        if (!configuracion.existsById(ConfiguracionSistema.ID)) {
            configuracion.save(new ConfiguracionSistema(new BigDecimal("32000"), PLANTILLA, "3187860122", "Local 208",
                    ahora));
            log.info("Configuración inicial creada");
        }
        if (!usuarios.existsByRolAndActivoTrue(Rol.ADMINISTRADOR)) {
            usuarios.save(new Usuario(admin.usuario(), encoder.encode(admin.claveInicial()), Rol.ADMINISTRADOR,
                    admin.nombre(), ahora));
            log.warn("Cuenta del Administrador «{}» creada con contraseña TEMPORAL: se pedirá cambiarla al entrar",
                    admin.usuario());
        }
    }
}
