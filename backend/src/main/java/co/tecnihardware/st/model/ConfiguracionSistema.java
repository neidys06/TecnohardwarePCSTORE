package co.tecnihardware.st.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Parámetros del sistema: una sola fila con id = 1. */
@Entity
@Table(name = "configuracion_sistema")
public class ConfiguracionSistema {

    public static final long ID = 1L;

    @Id
    private Long id = ID;

    /** Valor del diagnóstico general: se cobra si el cliente no autoriza (RF-06, RF-13). */
    @Column(name = "valor_diagnostico", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorDiagnostico;

    /** Días antes del vencimiento para marcar un mantenimiento como próximo (RF-15). */
    @Column(name = "umbral_proximo_dias", nullable = false)
    private int umbralProximoDias = 30;

    /** Plantilla del recordatorio con {nombre}, {equipo}, {estado} y {fecha} (RF-10). */
    @Column(name = "plantilla_recordatorio", nullable = false, length = 1000)
    private String plantillaRecordatorio;

    @Column(name = "whatsapp_empresa", nullable = false, length = 20)
    private String whatsappEmpresa;

    @Column(name = "direccion_local", nullable = false, length = 120)
    private String direccionLocal;

    /** Color elegido en la paleta (Acta 4, RNF-04). */
    @Column(name = "color_sistema", nullable = false, length = 7)
    private String colorSistema = "#e6007e";

    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn;

    protected ConfiguracionSistema() {
    }

    public ConfiguracionSistema(BigDecimal valorDiagnostico, String plantillaRecordatorio, String whatsappEmpresa,
            String direccionLocal, LocalDateTime ahora) {
        this.valorDiagnostico = valorDiagnostico;
        this.plantillaRecordatorio = plantillaRecordatorio;
        this.whatsappEmpresa = whatsappEmpresa;
        this.direccionLocal = direccionLocal;
        this.actualizadoEn = ahora;
    }

    public Long getId() {
        return id;
    }

    public BigDecimal getValorDiagnostico() {
        return valorDiagnostico;
    }

    public void setValorDiagnostico(BigDecimal valorDiagnostico) {
        this.valorDiagnostico = valorDiagnostico;
    }

    public int getUmbralProximoDias() {
        return umbralProximoDias;
    }

    public void setUmbralProximoDias(int umbralProximoDias) {
        this.umbralProximoDias = umbralProximoDias;
    }

    public String getPlantillaRecordatorio() {
        return plantillaRecordatorio;
    }

    public void setPlantillaRecordatorio(String plantillaRecordatorio) {
        this.plantillaRecordatorio = plantillaRecordatorio;
    }

    public String getWhatsappEmpresa() {
        return whatsappEmpresa;
    }

    public String getDireccionLocal() {
        return direccionLocal;
    }

    public String getColorSistema() {
        return colorSistema;
    }

    public void setColorSistema(String colorSistema) {
        this.colorSistema = colorSistema;
    }

    public LocalDateTime getActualizadoEn() {
        return actualizadoEn;
    }

    public void setActualizadoEn(LocalDateTime actualizadoEn) {
        this.actualizadoEn = actualizadoEn;
    }
}
