package co.tecnihardware.st.model;

import java.time.LocalDate;
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

/** Recordatorio de mantenimiento enviado por WhatsApp (RF-10). */
@Entity
@Table(name = "recordatorio_mantenimiento")
public class RecordatorioMantenimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_recordatorio")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_equipo", nullable = false)
    private Equipo equipo;

    /** Quién lo envió. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @Column(name = "fecha_generacion", nullable = false)
    private LocalDateTime fechaGeneracion;

    @Column(name = "fecha_vencimiento", nullable = false)
    private LocalDate fechaVencimiento;

    @Column(nullable = false, length = 1200)
    private String mensaje;

    protected RecordatorioMantenimiento() {
    }

    public RecordatorioMantenimiento(Equipo equipo, Usuario usuario, LocalDateTime fechaGeneracion,
            LocalDate fechaVencimiento, String mensaje) {
        this.equipo = equipo;
        this.usuario = usuario;
        this.fechaGeneracion = fechaGeneracion;
        this.fechaVencimiento = fechaVencimiento;
        this.mensaje = mensaje;
    }

    public Long getId() {
        return id;
    }

    public Equipo getEquipo() {
        return equipo;
    }

    public LocalDateTime getFechaGeneracion() {
        return fechaGeneracion;
    }

    public LocalDate getFechaVencimiento() {
        return fechaVencimiento;
    }

    public String getMensaje() {
        return mensaje;
    }
}
