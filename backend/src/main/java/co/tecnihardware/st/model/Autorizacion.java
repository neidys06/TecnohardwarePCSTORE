package co.tecnihardware.st.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Autorización inicial o adicional del cliente (RF-06). */
@Entity
@Table(name = "autorizacion")
public class Autorizacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_autorizacion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_orden", nullable = false)
    private OrdenServicio orden;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoAutorizacion tipo;

    /** Nueva falla encontrada; obligatoria en las adicionales. */
    @Column(length = 2000)
    private String descripcion;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal costo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DecisionCliente decision = DecisionCliente.PENDIENTE;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro;

    @Column(name = "fecha_respuesta")
    private LocalDateTime fechaRespuesta;

    protected Autorizacion() {
    }

    public Autorizacion(OrdenServicio orden, TipoAutorizacion tipo, String descripcion, BigDecimal costo,
            LocalDateTime fechaRegistro) {
        this.orden = orden;
        this.tipo = tipo;
        this.descripcion = descripcion;
        this.costo = costo;
        this.fechaRegistro = fechaRegistro;
    }

    public void responder(DecisionCliente decision, LocalDateTime ahora) {
        this.decision = decision;
        this.fechaRespuesta = ahora;
    }

    public Long getId() {
        return id;
    }

    public OrdenServicio getOrden() {
        return orden;
    }

    public TipoAutorizacion getTipo() {
        return tipo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public BigDecimal getCosto() {
        return costo;
    }

    public DecisionCliente getDecision() {
        return decision;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public LocalDateTime getFechaRespuesta() {
        return fechaRespuesta;
    }
}
