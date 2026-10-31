package co.tecnihardware.st.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** Mantenimiento realizado en una orden (RF-07). */
@Entity
@Table(name = "mantenimiento", uniqueConstraints = @UniqueConstraint(name = "uk_mantenimiento_orden", columnNames = "id_orden"))
public class Mantenimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_mantenimiento")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_orden", nullable = false)
    private OrdenServicio orden;

    @Column(name = "trabajo_realizado", nullable = false, length = 4000)
    private String trabajoRealizado;

    @Column(nullable = false, length = 120)
    private String responsable;

    @Column(nullable = false)
    private LocalDate fecha;

    @OneToMany(mappedBy = "mantenimiento", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<RepuestoUtilizado> repuestos = new ArrayList<>();

    protected Mantenimiento() {
    }

    public Mantenimiento(OrdenServicio orden, String trabajoRealizado, String responsable, LocalDate fecha) {
        this.orden = orden;
        this.trabajoRealizado = trabajoRealizado;
        this.responsable = responsable;
        this.fecha = fecha;
    }

    public void agregarRepuesto(String nombre, int cantidad) {
        repuestos.add(new RepuestoUtilizado(this, nombre, cantidad));
    }

    public Long getId() {
        return id;
    }

    public OrdenServicio getOrden() {
        return orden;
    }

    public String getTrabajoRealizado() {
        return trabajoRealizado;
    }

    public String getResponsable() {
        return responsable;
    }

    public LocalDate getFecha() {
        return fecha;
    }

    public List<RepuestoUtilizado> getRepuestos() {
        return repuestos;
    }
}
