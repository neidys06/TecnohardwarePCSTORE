package co.tecnihardware.st.security;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import co.tecnihardware.st.model.Rol;
import co.tecnihardware.st.model.Usuario;

/**
 * Usuario autenticado. Con contraseña temporal recibe solo ROLE_TEMPORAL: lo único
 * que puede hacer es crear su contraseña nueva (RF-17).
 */
public final class UsuarioPrincipal implements UserDetails {

    public static final String ROL_TEMPORAL = "ROLE_TEMPORAL";

    private final Long id;
    private final String usuario;
    private final String contrasenaHash;
    private final String nombre;
    private final Rol rol;
    private final Long idCliente;
    private final boolean debeCambiarContrasena;
    private final boolean activo;

    public UsuarioPrincipal(Usuario u, Long idCliente) {
        this.id = u.getId();
        this.usuario = u.getUsuario();
        this.contrasenaHash = u.getContrasenaHash();
        this.nombre = u.getNombre();
        this.rol = u.getRol();
        this.idCliente = idCliente;
        this.debeCambiarContrasena = u.isDebeCambiarContrasena();
        this.activo = u.isActivo();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String autoridad = debeCambiarContrasena ? ROL_TEMPORAL : "ROLE_" + rol.name();
        return List.of(new SimpleGrantedAuthority(autoridad));
    }

    public boolean esAdministrador() {
        return rol == Rol.ADMINISTRADOR;
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public Rol getRol() {
        return rol;
    }

    /** Null para el Administrador. */
    public Long getIdCliente() {
        return idCliente;
    }

    public boolean isDebeCambiarContrasena() {
        return debeCambiarContrasena;
    }

    @Override
    public String getPassword() {
        return contrasenaHash;
    }

    @Override
    public String getUsername() {
        return usuario;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return activo;
    }
}
