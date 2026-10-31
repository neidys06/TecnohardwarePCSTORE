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
import jakarta.persistence.UniqueConstraint;

/** Fotografía de ingreso, de proceso (con nota) o de salida (RF-08). */
@Entity
@Table(name = "evidencia",
        uniqueConstraints = @UniqueConstraint(name = "uk_evidencia_ruta", columnNames = "ruta_archivo"),
        indexes = @Index(name = "ix_evidencia_orden", columnList = "id_orden, momento"))
public class Evidencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_evidencia")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_orden", nullable = false)
    private OrdenServicio orden;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MomentoEvidencia momento;

    /** Ruta relativa dentro de la carpeta de archivos (nombre aleatorio). */
    @Column(name = "ruta_archivo", nullable = false, length = 255)
    private String rutaArchivo;

    @Column(name = "tipo_mime", nullable = false, length = 20)
    private String tipoMime;

    @Column(name = "tamano_bytes", nullable = false)
    private long tamanoBytes;

    /** Qué se está haciendo; obligatoria en PROCESO (Acta 4). */
    @Column(length = 500)
    private String nota;

    @Column(name = "fecha_carga", nullable = false)
    private LocalDateTime fechaCarga;

    protected Evidencia() {
    }

    public Evidencia(OrdenServicio orden, MomentoEvidencia momento, String rutaArchivo, String tipoMime,
            long tamanoBytes, String nota, LocalDateTime fechaCarga) {
        this.orden = orden;
        this.momento = momento;
        this.rutaArchivo = rutaArchivo;
        this.tipoMime = tipoMime;
        this.tamanoBytes = tamanoBytes;
        this.nota = nota;
        this.fechaCarga = fechaCarga;
    }

    public Long getId() {
        return id;
    }

    public OrdenServicio getOrden() {
        return orden;
    }

    public MomentoEvidencia getMomento() {
        return momento;
    }

    public String getRutaArchivo() {
        return rutaArchivo;
    }

    public String getTipoMime() {
        return tipoMime;
    }

    public long getTamanoBytes() {
        return tamanoBytes;
    }

    public String getNota() {
        return nota;
    }

    public LocalDateTime getFechaCarga() {
        return fechaCarga;
    }
}
