package co.tecnihardware.st.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** Aviso para el Administrador o para el portal del Cliente (RF-10). */
@Entity
@Table(name = "notificacion",
        uniqueConstraints = @UniqueConstraint(name = "uk_notificacion_usuario_clave", columnNames = { "id_usuario", "clave" }))
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_notificacion")
    private Long id;

    /** Destinatario. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    /** Evita duplicar el mismo aviso: al repetirse se renueva. */
    @Column(nullable = false, length = 80)
    private String clave;

    @Column(nullable = false, length = 160)
    private String titulo;

    @Column(nullable = false, length = 255)
    private String detalle = "";

    /** Pantalla de la interfaz a la que lleva el aviso. */
    @Column(nullable = false, length = 120)
    private String enlace = "";

    /** Equipo relacionado (avisos de mantenimiento). */
    @Column(name = "id_equipo")
    private Long idEquipo;

    @Column(nullable = false)
    private boolean leida;

    @Column(name = "creada_en", nullable = false)
    private LocalDateTime creadaEn;

    protected Notificacion() {
    }

    public Notificacion(Usuario usuario, String clave) {
        this.usuario = usuario;
        this.clave = clave;
    }

    /** Crea o renueva el contenido del aviso y lo deja sin leer. */
    public void renovar(String titulo, String detalle, String enlace, Long idEquipo, LocalDateTime ahora) {
        this.titulo = recortar(titulo, 160);
        this.detalle = recortar(detalle == null ? "" : detalle, 255);
        this.enlace = enlace == null ? "" : enlace;
        this.idEquipo = idEquipo;
        this.leida = false;
        this.creadaEn = ahora;
    }

    private static String recortar(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    public void marcarLeida() {
        this.leida = true;
    }

    public Long getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public String getClave() {
        return clave;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getDetalle() {
        return detalle;
    }

    public String getEnlace() {
        return enlace;
    }

    public Long getIdEquipo() {
        return idEquipo;
    }

    public boolean isLeida() {
        return leida;
    }

    public LocalDateTime getCreadaEn() {
        return creadaEn;
    }
}
