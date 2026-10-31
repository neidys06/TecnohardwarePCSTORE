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
import jakarta.persistence.UniqueConstraint;

/** Lista de precios del mes en PDF (RF-13, RF-14). Solo una está vigente. */
@Entity
@Table(name = "lista_precios", uniqueConstraints = @UniqueConstraint(name = "uk_lista_ruta", columnNames = "ruta_archivo"))
public class ListaPrecios {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_lista")
    private Long id;

    /** Primer día del mes al que corresponde. */
    @Column(nullable = false)
    private LocalDate mes;

    @Column(name = "nombre_archivo", nullable = false, length = 160)
    private String nombreArchivo;

    @Column(name = "ruta_archivo", nullable = false, length = 255)
    private String rutaArchivo;

    @Column(name = "tamano_bytes", nullable = false)
    private long tamanoBytes;

    @Column(nullable = false)
    private boolean vigente = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @Column(name = "subida_en", nullable = false)
    private LocalDateTime subidaEn;

    protected ListaPrecios() {
    }

    public ListaPrecios(LocalDate mes, String nombreArchivo, String rutaArchivo, long tamanoBytes, Usuario usuario,
            LocalDateTime subidaEn) {
        this.mes = mes.withDayOfMonth(1);
        this.nombreArchivo = nombreArchivo;
        this.rutaArchivo = rutaArchivo;
        this.tamanoBytes = tamanoBytes;
        this.usuario = usuario;
        this.subidaEn = subidaEn;
    }

    public void retirarVigencia() {
        this.vigente = false;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getMes() {
        return mes;
    }

    public String getNombreArchivo() {
        return nombreArchivo;
    }

    public String getRutaArchivo() {
        return rutaArchivo;
    }

    public long getTamanoBytes() {
        return tamanoBytes;
    }

    public boolean isVigente() {
        return vigente;
    }

    public LocalDateTime getSubidaEn() {
        return subidaEn;
    }
}
