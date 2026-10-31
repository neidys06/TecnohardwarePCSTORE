package co.tecnihardware.st.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Repuesto usado en un mantenimiento (RF-07). */
@Entity
@Table(name = "repuesto_utilizado")
public class RepuestoUtilizado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_repuesto")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_mantenimiento", nullable = false)
    private Mantenimiento mantenimiento;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(nullable = false)
    private int cantidad;

    protected RepuestoUtilizado() {
    }

    RepuestoUtilizado(Mantenimiento mantenimiento, String nombre, int cantidad) {
        this.mantenimiento = mantenimiento;
        this.nombre = nombre;
        this.cantidad = cantidad;
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public int getCantidad() {
        return cantidad;
    }
}
