package co.tecnihardware.st.service;

import java.time.Clock;
import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.tecnihardware.st.dto.ConfiguracionDTO;
import co.tecnihardware.st.dto.ConfiguracionRequest;
import co.tecnihardware.st.exception.ReglaDeNegocioException;
import co.tecnihardware.st.model.ConfiguracionSistema;
import co.tecnihardware.st.repository.ConfiguracionRepository;

/** Valor del diagnóstico, umbral de alertas, plantilla de WhatsApp y color del sistema. */
@Service
@Transactional(readOnly = true)
public class ConfiguracionService {

    private static final Logger log = LoggerFactory.getLogger(ConfiguracionService.class);

    private final ConfiguracionRepository repo;
    private final Clock reloj;

    public ConfiguracionService(ConfiguracionRepository repo, Clock reloj) {
        this.repo = repo;
        this.reloj = reloj;
    }

    public ConfiguracionSistema actual() {
        return repo.findById(ConfiguracionSistema.ID)
                .orElseThrow(() -> new IllegalStateException("Falta la configuración del sistema (fila id = 1)"));
    }

    public ConfiguracionDTO consultar() {
        return aDTO(actual());
    }

    /** Guarda solo los campos que llegan. */
    @Transactional
    public ConfiguracionDTO actualizar(ConfiguracionRequest r) {
        if (r.valorDiagnostico() == null && r.umbral() == null && r.plantilla() == null && r.color() == null) {
            throw new ReglaDeNegocioException("No hay cambios para guardar.");
        }
        ConfiguracionSistema c = actual();
        if (r.valorDiagnostico() != null) {
            c.setValorDiagnostico(r.valorDiagnostico());
        }
        if (r.umbral() != null) {
            c.setUmbralProximoDias(r.umbral());
        }
        if (r.plantilla() != null) {
            c.setPlantillaRecordatorio(r.plantilla().trim());
        }
        if (r.color() != null) {
            c.setColorSistema(r.color().toLowerCase());
        }
        c.setActualizadoEn(LocalDateTime.now(reloj));
        log.info("Configuración actualizada");
        return aDTO(c);
    }

    private static ConfiguracionDTO aDTO(ConfiguracionSistema c) {
        return new ConfiguracionDTO(c.getValorDiagnostico(), c.getUmbralProximoDias(), c.getPlantillaRecordatorio(),
                c.getWhatsappEmpresa(), c.getDireccionLocal(), c.getColorSistema());
    }
}
