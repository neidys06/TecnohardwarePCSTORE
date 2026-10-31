package co.tecnihardware.st.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** Categoría de equipo a la vista en el registro (Acta 4). «Otros» no es una fila. */
@Entity
@Table(name = "tipo_equipo", uniqueConstraints = @UniqueConstraint(name = "uk_tipo_equipo_nombre", columnNames = "nombre"))
public class TipoEquipo {

    public static final String OTROS = "Otros";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo")
    private Long id;

    @Column(nullable = false, length = 40)
    private String nombre;

    @Column(nullable = false)
    private int orden;

    protected TipoEquipo() {
    }

    public TipoEquipo(String nombre, int orden) {
        this.nombre = nombre;
        this.orden = orden;
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public int getOrden() {
        return orden;
    }
}
