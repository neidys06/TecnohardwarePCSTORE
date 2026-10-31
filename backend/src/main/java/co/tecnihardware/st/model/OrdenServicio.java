package co.tecnihardware.st.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import co.tecnihardware.st.exception.ConflictoException;

/**
 * Orden de servicio de un equipo (RF-04 a RF-08, RF-18). Los cambios de estado
 * solo se hacen con {@link #cambiarEstado}, que valida la tabla de transiciones y
 * deja la constancia en el historial.
 */
@Entity
@Table(name = "orden_servicio", indexes = {
        @Index(name = "ix_orden_equipo", columnList = "id_equipo"),
        @Index(name = "ix_orden_estado", columnList = "estado") })
public class OrdenServicio {

    private static final Pattern CODIGO = Pattern.compile("^OS-(\\d{4,9})$", Pattern.CASE_INSENSITIVE);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_orden")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_equipo", nullable = false)
    private Equipo equipo;

    @Column(name = "fecha_ingreso", nullable = false)
    private LocalDate fechaIngreso;

    /** Falla que reporta el cliente y accesorios recibidos (RF-04). */
    @Column(name = "falla_reportada", nullable = false, length = 2400)
    private String fallaReportada;

    @Column(length = 2000)
    private String diagnostico;

    @Column(name = "costo_estimado", precision = 12, scale = 2)
    private BigDecimal costoEstimado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EstadoOrden estado;

    /** Se fija al cerrar o entregar la orden (RF-06). */
    @Column(name = "monto_cobrado", precision = 12, scale = 2)
    private BigDecimal montoCobrado;

    @Column(name = "fecha_entrega")
    private LocalDate fechaEntrega;

    @Column(name = "recibido_por", length = 120)
    private String recibidoPor;

    /** Persona de la tienda que recibió el equipo al ingresar (Acta 5). */
    @Column(name = "recibio_equipo", length = 120)
    private String recibioEquipo;

    /** Persona de la tienda que entregó el equipo al cliente (Acta 5). */
    @Column(name = "entrego_equipo", length = 120)
    private String entregoEquipo;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    @OneToMany(mappedBy = "orden", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("fechaRegistro ASC, id ASC")
    private List<Autorizacion> autorizaciones = new ArrayList<>();

    @OneToOne(mappedBy = "orden", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Mantenimiento mantenimiento;

    @OneToMany(mappedBy = "orden", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("fechaCarga ASC, id ASC")
    private List<Evidencia> evidencias = new ArrayList<>();

    @OneToMany(mappedBy = "orden", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("fechaHora ASC, id ASC")
    private List<CambioEstado> historial = new ArrayList<>();

    protected OrdenServicio() {
    }

    /** Fábrica: toda orden nueva inicia «En diagnóstico» y queda registrada en el historial. */
    public static OrdenServicio abrir(Equipo equipo, String falla, LocalDate fechaIngreso, Usuario por,
            LocalDateTime ahora) {
        return abrir(equipo, falla, fechaIngreso, por, ahora, null);
    }

    /** Igual que {@link #abrir}, registrando quién de la tienda recibió el equipo (Acta 5). */
    public static OrdenServicio abrir(Equipo equipo, String falla, LocalDate fechaIngreso, Usuario por,
            LocalDateTime ahora, String recibio) {
        OrdenServicio o = new OrdenServicio();
        o.recibioEquipo = recibio;
        o.equipo = equipo;
        o.fallaReportada = falla;
        o.fechaIngreso = fechaIngreso;
        o.estado = EstadoOrden.EN_DIAGNOSTICO;
        o.creadoEn = ahora;
        o.historial.add(new CambioEstado(o, null, EstadoOrden.EN_DIAGNOSTICO,
                "Orden creada por " + por.getNombre() + (recibio == null ? "" : " · equipo recibido por " + recibio),
                por, ahora));
        return o;
    }

    // ----- Reglas del RF-18 ----------------------------------------------------------------

    public void cambiarEstado(EstadoOrden nuevo, String observacion, Usuario por, LocalDateTime ahora) {
        if (!estado.puedeCambiarA(nuevo)) {
            throw new ConflictoException(
                    "Transición no permitida: «" + estado.getTexto() + "» → «" + nuevo.getTexto() + "».");
        }
        historial.add(new CambioEstado(this, estado, nuevo, observacion, por, ahora));
        estado = nuevo;
    }

    /** Anotación en el historial sin cambio de estado (p. ej. «Mensaje enviado por WhatsApp»). */
    public void anotar(String observacion, Usuario por, LocalDateTime ahora) {
        historial.add(new CambioEstado(this, estado, estado, observacion, por, ahora));
    }

    /** Rechaza una acción que no corresponde al estado actual, indicando el estado requerido. */
    public void exigirEstado(EstadoOrden... permitidos) {
        for (EstadoOrden p : permitidos) {
            if (estado == p) {
                return;
            }
        }
        StringBuilder req = new StringBuilder();
        for (int i = 0; i < permitidos.length; i++) {
            req.append(i == 0 ? "«" : "» o «").append(permitidos[i].getTexto());
        }
        throw new ConflictoException("La orden está «" + estado.getTexto() + "». Esta acción requiere que esté "
                + req + "».");
    }

    /**
     * RF-06 · Monto de la orden: si el cliente no autorizó, solo el diagnóstico general;
     * si autorizó, el costo estimado más las adicionales que aceptó.
     */
    public BigDecimal calcularMonto(BigDecimal valorDiagnostico) {
        if (montoCobrado != null) {
            return montoCobrado;
        }
        if (estado == EstadoOrden.CERRADA_SOLO_DIAGNOSTICO) {
            return valorDiagnostico;
        }
        BigDecimal total = costoEstimado == null ? BigDecimal.ZERO : costoEstimado;
        for (Autorizacion a : autorizaciones) {
            if (a.getTipo() == TipoAutorizacion.ADICIONAL && a.getDecision() == DecisionCliente.AUTORIZA) {
                total = total.add(a.getCosto());
            }
        }
        return total;
    }

    public boolean tieneEvidencia(MomentoEvidencia momento) {
        return evidencias.stream().anyMatch(e -> e.getMomento() == momento);
    }

    public Optional<Autorizacion> autorizacionInicial() {
        return autorizaciones.stream().filter(a -> a.getTipo() == TipoAutorizacion.INICIAL).findFirst();
    }

    public Optional<Autorizacion> adicionalPendiente() {
        return autorizaciones.stream()
                .filter(a -> a.getTipo() == TipoAutorizacion.ADICIONAL && a.getDecision() == DecisionCliente.PENDIENTE)
                .findFirst();
    }

    /** Fecha del último servicio: la de entrega o, si no hay, la del último cambio de estado. */
    public LocalDate fechaServicio() {
        if (fechaEntrega != null) {
            return fechaEntrega;
        }
        return historial.isEmpty() ? fechaIngreso : historial.get(historial.size() - 1).getFechaHora().toLocalDate();
    }

    // ----- Código visible OS-0001 ----------------------------------------------------------

    public String getCodigo() {
        return codigoDe(id);
    }

    public static String codigoDe(Long id) {
        return id == null ? null : String.format("OS-%04d", id);
    }

    /** «OS-0139» → 139. Vacío si el texto no tiene el formato del código. */
    public static Optional<Long> idDesdeCodigo(String codigo) {
        if (codigo == null) {
            return Optional.empty();
        }
        Matcher m = CODIGO.matcher(codigo.trim());
        return m.matches() ? Optional.of(Long.parseLong(m.group(1))) : Optional.empty();
    }

    // ----- Getters y setters ---------------------------------------------------------------

    public Long getId() {
        return id;
    }

    public Equipo getEquipo() {
        return equipo;
    }

    public LocalDate getFechaIngreso() {
        return fechaIngreso;
    }

    public void setFechaIngreso(LocalDate fechaIngreso) {
        this.fechaIngreso = fechaIngreso;
    }

    public String getFallaReportada() {
        return fallaReportada;
    }

    public String getDiagnostico() {
        return diagnostico;
    }

    public void setDiagnostico(String diagnostico) {
        this.diagnostico = diagnostico;
    }

    public BigDecimal getCostoEstimado() {
        return costoEstimado;
    }

    public void setCostoEstimado(BigDecimal costoEstimado) {
        this.costoEstimado = costoEstimado;
    }

    public EstadoOrden getEstado() {
        return estado;
    }

    /** Solo para cargar datos históricos (perfil demo); en la operación normal se usa cambiarEstado. */
    public void forzarEstadoHistorico(EstadoOrden estado) {
        this.estado = estado;
    }

    public BigDecimal getMontoCobrado() {
        return montoCobrado;
    }

    public void setMontoCobrado(BigDecimal montoCobrado) {
        this.montoCobrado = montoCobrado;
    }

    public LocalDate getFechaEntrega() {
        return fechaEntrega;
    }

    public void setFechaEntrega(LocalDate fechaEntrega) {
        this.fechaEntrega = fechaEntrega;
    }

    public String getRecibioEquipo() {
        return recibioEquipo;
    }

    public void setRecibioEquipo(String recibioEquipo) {
        this.recibioEquipo = recibioEquipo;
    }

    public String getEntregoEquipo() {
        return entregoEquipo;
    }

    public void setEntregoEquipo(String entregoEquipo) {
        this.entregoEquipo = entregoEquipo;
    }

    public String getRecibidoPor() {
        return recibidoPor;
    }

    public void setRecibidoPor(String recibidoPor) {
        this.recibidoPor = recibidoPor;
    }

    public LocalDateTime getCreadoEn() {
        return creadoEn;
    }

    public List<Autorizacion> getAutorizaciones() {
        return autorizaciones;
    }

    public Mantenimiento getMantenimiento() {
        return mantenimiento;
    }

    public void setMantenimiento(Mantenimiento mantenimiento) {
        this.mantenimiento = mantenimiento;
    }

    public List<Evidencia> getEvidencias() {
        return evidencias;
    }

    public List<CambioEstado> getHistorial() {
        return historial;
    }
}
