package co.tecnihardware.st.security;

import java.util.Optional;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import co.tecnihardware.st.model.Cliente;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.ClienteRepository;
import co.tecnihardware.st.repository.UsuarioRepository;

/**
 * Carga las cuentas desde la base de datos para Spring Security.
 * No es transaccional a propósito: si el usuario no existe lanza una excepción, y
 * dentro de la transacción del inicio de sesión eso la marcaría para revertirse
 * (se perdería el conteo de intentos fallidos, RNF-09).
 */
@Service
public class UsuarioDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarios;
    private final ClienteRepository clientes;

    public UsuarioDetailsService(UsuarioRepository usuarios, ClienteRepository clientes) {
        this.usuarios = usuarios;
        this.clientes = clientes;
    }

    @Override
    public UsuarioPrincipal loadUserByUsername(String usuario) throws UsernameNotFoundException {
        Usuario u = usuarios.findByUsuarioAndActivoTrue(usuario.trim().toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        return aPrincipal(u);
    }

    /** Usado por el filtro JWT en cada petición: la cuenta pudo haberse desactivado. */
    public Optional<UsuarioPrincipal> cargarPorId(Long id) {
        return usuarios.findByIdAndActivoTrue(id).map(this::aPrincipal);
    }

    private UsuarioPrincipal aPrincipal(Usuario u) {
        Long idCliente = u.esAdministrador() ? null
                : clientes.findByUsuarioId(u.getId()).map(Cliente::getId).orElse(null);
        return new UsuarioPrincipal(u, idCliente);
    }
}
