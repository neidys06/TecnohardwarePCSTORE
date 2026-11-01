package co.tecnihardware.st.controller;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import co.tecnihardware.st.dto.MantenimientoDTO;
import co.tecnihardware.st.model.EstadoMantenimiento;
import co.tecnihardware.st.service.MantenimientoService;

@RestController
@RequestMapping("/api/mantenimientos")
@PreAuthorize("hasRole('ADMINISTRADOR')")
@Tag(name = "Mantenimientos", description = "RF-15 consulta de mantenimientos próximos y vencidos")
public class MantenimientoController {

    private final MantenimientoService mantenimientos;

    public MantenimientoController(MantenimientoService mantenimientos) {
        this.mantenimientos = mantenimientos;
    }

    @Operation(summary = "Mantenimientos por estado", description = "Sin filtro: vencidos, próximos y vigentes.")
    @GetMapping
    public List<MantenimientoDTO> listar(@RequestParam(name = "estado", required = false) EstadoMantenimiento estado) {
        return mantenimientos.listar(estado);
    }
}
