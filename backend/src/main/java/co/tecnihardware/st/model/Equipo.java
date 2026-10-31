package co.tecnihardware.st.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/** Equipo de un cliente (RF-03, RF-16). */
@Entity
@Table(name = "equipo", indexes = @Index(name = "ix_equipo_cliente", columnList = "id_cliente"))
public class Equipo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_equipo")
    private Long id;

    /** Todo equipo pertenece a un cliente (RNF-10). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_cliente", nullable = false)
    private Cliente cliente;

    /** Categoría de la lista; null cuando se eligió «Otros». */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tipo")
    private TipoEquipo tipo;

    /** Tipo escrito a mano al elegir «Otros» (Acta 4). */
    @Column(name = "tipo_otro", length = 60)
    private String tipoOtro;

    @Column(name = "marca_modelo", nullable = false, length = 120)
    private String marcaModelo;

    @Column(length = 60)
    private String serial;

    @Column(nullable = false, length = 1000)
    private String observaciones = "";

    /** 3, 6 o 12 meses; null = sin periodo (RF-16). */
    @Column(name = "periodo_mantenimiento_meses")
    private Integer periodoMantenimientoMeses;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    @OneToMany(mappedBy = "equipo")
    @OrderBy("fechaIngreso ASC, id ASC")
    private List<OrdenServicio> ordenes = new ArrayList<>();

    protected Equipo() {
    }

    public Equipo(Cliente cliente, String marcaModelo, LocalDateTime creadoEn) {
        this.cliente = cliente;
        this.marcaModelo = marcaModelo;
        this.creadoEn = creadoEn;
    }

    /** O una categoría de la lista, o el texto de «Otros»; nunca ambos. */
    public void asignarTipo(TipoEquipo tipo, String tipoOtro) {
        this.tipo = tipo;
        this.tipoOtro = tipo == null ? tipoOtro : null;
    }

    /** Nombre del tipo para mostrar: la categoría o lo escrito en «Otros». */
    public String getNombreTipo() {
        return tipo != null ? tipo.getNombre() : tipoOtro;
    }

    public boolean esOtro() {
        return tipo == null;
    }

    public Long getId() {
        return id;
    }

    public Cliente getCliente() {
        return cliente;
    }

    public TipoEquipo getTipo() {
        return tipo;
    }

    public String getTipoOtro() {
        return tipoOtro;
    }

    public String getMarcaModelo() {
        return marcaModelo;
    }

    public void setMarcaModelo(String marcaModelo) {
        this.marcaModelo = marcaModelo;
    }

    public String getSerial() {
        return serial;
    }

    public void setSerial(String serial) {
        this.serial = serial;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones == null ? "" : observaciones;
    }

    public Integer getPeriodoMantenimientoMeses() {
        return periodoMantenimientoMeses;
    }

    public void setPeriodoMantenimientoMeses(Integer periodoMantenimientoMeses) {
        this.periodoMantenimientoMeses = periodoMantenimientoMeses;
    }

    public LocalDateTime getCreadoEn() {
        return creadoEn;
    }

    public List<OrdenServicio> getOrdenes() {
        return ordenes;
    }
}
