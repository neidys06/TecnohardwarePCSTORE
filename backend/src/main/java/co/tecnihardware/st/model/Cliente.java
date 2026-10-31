package co.tecnihardware.st.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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

/** Cliente de la tienda con su cuenta para el portal (RF-01, RF-12). */
@Entity
@Table(name = "cliente", uniqueConstraints = {
        @UniqueConstraint(name = "uk_cliente_usuario", columnNames = "id_usuario"),
        @UniqueConstraint(name = "uk_cliente_cedula", columnNames = "cedula") })
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cliente")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    /** Solo dígitos; opcional pero única si se registra. */
    @Column(length = 20)
    private String cedula;

    /** Solo dígitos; para WhatsApp (RF-10, RF-11) y búsqueda (RF-12). */
    @Column(length = 20)
    private String telefono;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDate fechaRegistro;

    @OneToMany(mappedBy = "cliente")
    @OrderBy("id ASC")
    private List<Equipo> equipos = new ArrayList<>();

    protected Cliente() {
    }

    public Cliente(Usuario usuario, String cedula, String telefono, LocalDate fechaRegistro) {
        this.usuario = usuario;
        this.cedula = cedula;
        this.telefono = telefono;
        this.fechaRegistro = fechaRegistro;
    }

    public Long getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public String getNombre() {
        return usuario.getNombre();
    }

    public String getCedula() {
        return cedula;
    }

    public void setCedula(String cedula) {
        this.cedula = cedula;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public LocalDate getFechaRegistro() {
        return fechaRegistro;
    }

    public List<Equipo> getEquipos() {
        return equipos;
    }
}
