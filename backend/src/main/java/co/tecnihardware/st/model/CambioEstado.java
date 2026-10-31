package co.tecnihardware.st.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Registro del historial de estados de la orden: qué cambió, cuándo y quién (RF-18). */
@Entity
@Table(name = "cambio_estado", indexes = @Index(name = "ix_cambio_orden", columnList = "id_orden, fecha_hora"))
public class CambioEstado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cambio")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_orden", nullable = false)
    private OrdenServicio orden;

    /** Null al crear la orden. */
    @Enumerated(EnumType.STRING)
    @Column(name = "estado_anterior", length = 40)
    private EstadoOrden estadoAnterior;

    /** Igual al anterior en las anotaciones. */
    @Enumerated(EnumType.STRING)
    @Column(name = "estado_nuevo", nullable = false, length = 40)
    private EstadoOrden estadoNuevo;

    @Column(nullable = false, length = 500)
    private String observacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    protected CambioEstado() {
    }

    public CambioEstado(OrdenServicio orden, EstadoOrden estadoAnterior, EstadoOrden estadoNuevo, String observacion,
            Usuario usuario, LocalDateTime fechaHora) {
        this.orden = orden;
        this.estadoAnterior = estadoAnterior;
        this.estadoNuevo = estadoNuevo;
        this.observacion = observacion == null ? "" : observacion;
        this.usuario = usuario;
        this.fechaHora = fechaHora;
    }

    public Long getId() {
        return id;
    }

    public EstadoOrden getEstadoAnterior() {
        return estadoAnterior;
    }

    public EstadoOrden getEstadoNuevo() {
        return estadoNuevo;
    }

    public String getObservacion() {
        return observacion;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public LocalDateTime getFechaHora() {
        return fechaHora;
    }
}
