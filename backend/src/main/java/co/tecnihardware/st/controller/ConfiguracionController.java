package co.tecnihardware.st.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.tecnihardware.st.dto.ConfiguracionDTO;
import co.tecnihardware.st.dto.ConfiguracionRequest;
import co.tecnihardware.st.service.ConfiguracionService;

@RestController
@RequestMapping("/api/configuracion")
@Tag(name = "Configuración", description = "Valor del diagnóstico, umbral de alertas, plantilla y color del sistema")
public class ConfiguracionController {

    private final ConfiguracionService configuracion;

    public ConfiguracionController(ConfiguracionService configuracion) {
        this.configuracion = configuracion;
    }

    /** El color y los datos de la tienda los necesita también el portal del cliente. */
    @GetMapping
    public ConfiguracionDTO consultar() {
        return configuracion.consultar();
    }

    @Operation(summary = "Actualizar la configuración", description = "Solo se guardan los campos enviados.")
    @PutMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ConfiguracionDTO actualizar(@Valid @RequestBody ConfiguracionRequest r) {
        return configuracion.actualizar(r);
    }
}
