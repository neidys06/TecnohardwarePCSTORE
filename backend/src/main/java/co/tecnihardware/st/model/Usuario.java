package co.tecnihardware.st.model;

import java.time.Duration;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** Cuenta de acceso del Administrador o de un Cliente (RF-01, RF-02, RF-17, RNF-09). */
@Entity
@Table(name = "usuario", uniqueConstraints = @UniqueConstraint(name = "uk_usuario_usuario", columnNames = "usuario"))
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long id;

    /** Siempre en minúsculas: el usuario es único sin importar mayúsculas. */
    @Column(nullable = false, length = 40)
    private String usuario;

    /** Resumen BCrypt; la contraseña nunca se guarda en texto plano (RNF-09). */
    @Column(name = "contrasena_hash", nullable = false, length = 100)
    private String contrasenaHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Rol rol;

    @Column(nullable = false, length = 120)
    private String nombre;

    /** Verdadero mientras use una contraseña temporal (RF-17). */
    @Column(name = "debe_cambiar_contrasena", nullable = false)
    private boolean debeCambiarContrasena = true;

    @Column(name = "intentos_fallidos", nullable = false)
    private int intentosFallidos;

    @Column(name = "bloqueado_hasta")
    private LocalDateTime bloqueadoHasta;

    @Column(name = "foto_perfil", length = 255)
    private String fotoPerfil;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    /** Constructor vacío requerido por JPA. */
    protected Usuario() {
    }

    public Usuario(String usuario, String contrasenaHash, Rol rol, String nombre, LocalDateTime creadoEn) {
        this.usuario = usuario.toLowerCase();
        this.contrasenaHash = contrasenaHash;
        this.rol = rol;
        this.nombre = nombre;
        this.creadoEn = creadoEn;
    }

    // ----- Reglas de la cuenta (RNF-09) -------------------------------------------------

    public boolean estaBloqueado(LocalDateTime ahora) {
        return bloqueadoHasta != null && bloqueadoHasta.isAfter(ahora);
    }

    /** Minutos que faltan para el desbloqueo, redondeado hacia arriba. */
    public long minutosParaDesbloqueo(LocalDateTime ahora) {
        if (!estaBloqueado(ahora)) {
            return 0;
        }
        long segundos = Duration.between(ahora, bloqueadoHasta).getSeconds();
        return Math.max(1, (segundos + 59) / 60);
    }

    /**
     * Suma un intento fallido. Al llegar al máximo bloquea la cuenta y reinicia el contador.
     *
     * @return verdadero si la cuenta quedó bloqueada con este intento
     */
    public boolean registrarIntentoFallido(int maxIntentos, int minutosBloqueo, LocalDateTime ahora) {
        intentosFallidos++;
        if (intentosFallidos >= maxIntentos) {
            intentosFallidos = 0;
            bloqueadoHasta = ahora.plusMinutes(minutosBloqueo);
            return true;
        }
        return false;
    }

    public void registrarIngresoExitoso() {
        intentosFallidos = 0;
        bloqueadoHasta = null;
    }

    /** Contraseña temporal nueva (registro o restablecimiento): obliga a cambiarla al entrar. */
    public void asignarContrasenaTemporal(String hash) {
        this.contrasenaHash = hash;
        this.debeCambiarContrasena = true;
        registrarIngresoExitoso();
    }

    public void cambiarContrasena(String hash) {
        this.contrasenaHash = hash;
        this.debeCambiarContrasena = false;
    }

    public boolean esAdministrador() {
        return rol == Rol.ADMINISTRADOR;
    }

    // ----- Getters y setters ---------------------------------------------------------------

    public Long getId() {
        return id;
    }

    public String getUsuario() {
        return usuario;
    }

    public String getContrasenaHash() {
        return contrasenaHash;
    }

    public Rol getRol() {
        return rol;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public boolean isDebeCambiarContrasena() {
        return debeCambiarContrasena;
    }

    public int getIntentosFallidos() {
        return intentosFallidos;
    }

    public LocalDateTime getBloqueadoHasta() {
        return bloqueadoHasta;
    }

    public String getFotoPerfil() {
        return fotoPerfil;
    }

    public void setFotoPerfil(String fotoPerfil) {
        this.fotoPerfil = fotoPerfil;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }

    public LocalDateTime getCreadoEn() {
        return creadoEn;
    }
}
