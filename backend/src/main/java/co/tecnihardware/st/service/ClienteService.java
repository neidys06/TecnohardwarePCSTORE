package co.tecnihardware.st.service;

import java.text.Normalizer;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.tecnihardware.st.dto.ClienteCreadoDTO;
import co.tecnihardware.st.dto.ClienteDTO;
import co.tecnihardware.st.dto.ClienteRequest;
import co.tecnihardware.st.dto.ContrasenaTemporalDTO;
import co.tecnihardware.st.dto.EnlaceDTO;
import co.tecnihardware.st.dto.MantenimientoDTO;
import co.tecnihardware.st.exception.ConflictoException;
import co.tecnihardware.st.exception.RecursoNoEncontradoException;
import co.tecnihardware.st.exception.ReglaDeNegocioException;
import co.tecnihardware.st.model.Cliente;
import co.tecnihardware.st.model.Rol;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.ClienteRepository;
import co.tecnihardware.st.repository.EquipoRepository;
import co.tecnihardware.st.repository.UsuarioRepository;
import co.tecnihardware.st.util.Formato;

/** Gestión de clientes por la administradora (RF-01, RF-11, RF-12). */
@Service
@Transactional(readOnly = true)
public class ClienteService {

    private static final Logger log = LoggerFactory.getLogger(ClienteService.class);

    private final ClienteRepository clientes;
    private final UsuarioRepository usuarios;
    private final EquipoRepository equipos;
    private final MantenimientoService mantenimientos;
    private final NotificacionService notificaciones;
    private final GeneradorContrasena generador;
    private final PasswordEncoder encoder;
    private final Clock reloj;

    public ClienteService(ClienteRepository clientes, UsuarioRepository usuarios, EquipoRepository equipos,
            MantenimientoService mantenimientos, NotificacionService notificaciones, GeneradorContrasena generador,
            PasswordEncoder encoder, Clock reloj) {
        this.clientes = clientes;
        this.usuarios = usuarios;
        this.equipos = equipos;
        this.mantenimientos = mantenimientos;
        this.notificaciones = notificaciones;
        this.generador = generador;
        this.encoder = encoder;
        this.reloj = reloj;
    }

    /**
     * RF-12 · Listado general o búsqueda por nombre (sin importar tildes ni mayúsculas),
     * cédula o teléfono. Con criterio, cada cliente trae el cuadro de mantenimiento de
     * sus equipos (Acta 4).
     */
    public List<ClienteDTO> listar(String criterio) {
        Map<Long, Long> equiposPorCliente = equipos.listarTodos().stream()
                .collect(Collectors.groupingBy(e -> e.getCliente().getId(), Collectors.counting()));
        String texto = Formato.normalizar(criterio);
        String digitos = Formato.soloDigitos(criterio);
        List<Cliente> encontrados = clientes.listarTodos().stream()
                .filter(c -> texto.isEmpty() || coincide(c, texto, digitos))
                .toList();
        List<ClienteDTO> resultado = encontrados.stream()
                .map(c -> aDTO(c, equiposPorCliente.getOrDefault(c.getId(), 0L)))
                .toList();
        if (texto.isEmpty() || resultado.isEmpty()) {
            return resultado;
        }
        Map<Long, List<MantenimientoDTO>> cuadro = mantenimientos
                .cuadroDeClientes(encontrados.stream().map(Cliente::getId).toList());
        return resultado.stream().map(c -> c.conMantenimientos(cuadro.getOrDefault(c.id(), List.of()))).toList();
    }

    private static boolean coincide(Cliente c, String texto, String digitos) {
        if (Formato.normalizar(c.getNombre()).contains(texto)) {
            return true;
        }
        return digitos.length() >= 3 && ((c.getCedula() != null && c.getCedula().contains(digitos))
                || (c.getTelefono() != null && c.getTelefono().contains(digitos)));
    }

    public ClienteDTO obtener(Long id) {
        Cliente c = buscar(id);
        return aDTO(c, equipos.countByClienteId(id));
    }

    /**
     * RF-01 · El sistema genera el usuario (a partir del nombre) y la contraseña temporal
     * (Acta 5). Si llega un usuario escrito a mano, se respeta.
     */
    @Transactional
    public ClienteCreadoDTO crear(ClienteRequest r) {
        String usuario;
        if (r.usuario() == null || r.usuario().isBlank()) {
            usuario = usuarioDisponible(r.nombre());
        } else {
            usuario = r.usuario().trim().toLowerCase();
            if (usuarios.existsByUsuario(usuario)) {
                throw new ConflictoException("Ese usuario ya existe. Escribe otro.");
            }
        }
        String cedula = normalizarCedula(r.cedula());
        if (cedula != null && clientes.existsByCedula(cedula)) {
            throw new ConflictoException("Ya hay un cliente registrado con esa cédula.");
        }
        String temporal = generador.temporal();
        LocalDateTime ahora = LocalDateTime.now(reloj);
        Usuario cuenta = usuarios.save(new Usuario(usuario, encoder.encode(temporal), Rol.CLIENTE, r.nombre().trim(), ahora));
        Cliente c = clientes.save(new Cliente(cuenta, cedula, normalizarTelefono(r.telefono()), LocalDate.now(reloj)));
        log.info("Cliente registrado id={}", c.getId());
        return new ClienteCreadoDTO(aDTO(c, 0), temporal);
    }

    /** RF-01 · Actualiza nombre, cédula y teléfono (el usuario de acceso no cambia). */
    @Transactional
    public ClienteDTO actualizar(Long id, ClienteRequest r) {
        Cliente c = buscar(id);
        String cedula = normalizarCedula(r.cedula());
        if (cedula != null && clientes.existsByCedulaAndIdNot(cedula, id)) {
            throw new ConflictoException("Ya hay un cliente registrado con esa cédula.");
        }
        c.getUsuario().setNombre(r.nombre().trim());
        c.setCedula(cedula);
        c.setTelefono(normalizarTelefono(r.telefono()));
        return aDTO(c, equipos.countByClienteId(id));
    }

    /** RF-01, RF-17 · Nueva contraseña temporal para el cliente que olvidó la suya. */
    @Transactional
    public ContrasenaTemporalDTO restablecerContrasena(Long id) {
        Cliente c = buscar(id);
        String temporal = generador.temporal();
        c.getUsuario().asignarContrasenaTemporal(encoder.encode(temporal));
        notificaciones.retirar(AvisoFactory.claveContrasena(id));
        log.info("Contraseña temporal restablecida para el cliente id={}", id);
        return new ContrasenaTemporalDTO(temporal);
    }

    /** RF-11 · Enlace directo a WhatsApp con el número del cliente. */
    public EnlaceDTO enlaceWhatsApp(Long id) {
        Cliente c = buscar(id);
        if (c.getTelefono() == null) {
            throw new ReglaDeNegocioException("El cliente no tiene teléfono registrado. Complétalo para escribirle.");
        }
        return new EnlaceDTO(Formato.enlaceWhatsApp(c.getTelefono(), null));
    }

    private Cliente buscar(Long id) {
        return clientes.buscarConUsuario(id).orElseThrow(() -> new RecursoNoEncontradoException("El cliente"));
    }

    /** Se guardan solo los dígitos: el enlace de WhatsApp se arma con ellos (RF-11). */
    static String normalizarTelefono(String telefono) {
        String d = Formato.soloDigitos(telefono);
        if (d.isEmpty()) {
            return null;
        }
        if (d.length() < 7 || d.length() > 12) {
            throw new ReglaDeNegocioException("El teléfono debe tener entre 7 y 12 dígitos.", "telefono",
                    "Entre 7 y 12 dígitos.");
        }
        return d;
    }

    static String normalizarCedula(String cedula) {
        String d = Formato.soloDigitos(cedula);
        if (d.isEmpty()) {
            return null;
        }
        if (d.length() < 5 || d.length() > 15) {
            throw new ReglaDeNegocioException("La cédula debe tener entre 5 y 15 dígitos.", "cedula",
                    "Entre 5 y 15 dígitos.");
        }
        return d;
    }

    static ClienteDTO aDTO(Cliente c, long cantidadEquipos) {
        Usuario u = c.getUsuario();
        return new ClienteDTO(c.getId(), u.getNombre(), c.getCedula(), c.getTelefono(), u.getUsuario(),
                c.getFechaRegistro(), u.isDebeCambiarContrasena(), cantidadEquipos, null);
    }


    /**
     * Usuario a partir del nombre: inicial del nombre + primer apellido, sin tildes ni espacios
     * («Carlos Mendoza» → cmendoza). Si ya existe, se agrega un número (cmendoza2, cmendoza3…).
     */
    static String usuarioBase(String nombre) {
        String limpio = Normalizer.normalize(nombre == null ? "" : nombre, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replaceAll("[^a-z\\s]", " ").trim();
        String[] p = limpio.isEmpty() ? new String[0] : limpio.split("\\s+");
        String base;
        if (p.length == 0) {
            base = "cliente";
        } else if (p.length == 1) {
            base = p[0];
        } else {
            base = p[0].charAt(0) + p[p.length >= 4 ? 2 : p.length - 1];
        }
        if (base.length() > 16) {
            base = base.substring(0, 16);
        }
        while (base.length() < 4) {
            base += "0";
        }
        return base;
    }

    private String usuarioDisponible(String nombre) {
        String base = usuarioBase(nombre);
        String candidato = base;
        for (int n = 2; usuarios.existsByUsuario(candidato); n++) {
            candidato = base + n;
        }
        return candidato;
    }
}
