package co.tecnihardware.st.controller;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import co.tecnihardware.st.dto.EquipoDTO;
import co.tecnihardware.st.dto.EquipoRequest;
import co.tecnihardware.st.dto.HistorialEquipoDTO;
import co.tecnihardware.st.dto.MantenimientoDTO;
import co.tecnihardware.st.dto.PeriodoRequest;
import co.tecnihardware.st.dto.RecordatorioDTO;
import co.tecnihardware.st.security.UsuarioPrincipal;
import co.tecnihardware.st.service.EquipoService;

@RestController
@RequestMapping("/api/equipos")
@PreAuthorize("hasRole('ADMINISTRADOR')")
@Tag(name = "Equipos", description = "RF-03 registro, RF-09 historial, RF-10 recordatorio, RF-16 periodo")
public class EquipoController {

    private final EquipoService equipos;

    public EquipoController(EquipoService equipos) {
        this.equipos = equipos;
    }

    @Operation(summary = "Categorías de equipo (con «Otros» al final)")
    @GetMapping("/tipos")
    public List<String> tipos() {
        return equipos.tipos();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EquipoDTO crear(@Valid @RequestBody EquipoRequest r) {
        return equipos.crear(r);
    }

    @PutMapping("/{id}")
    public EquipoDTO actualizar(@PathVariable Long id, @Valid @RequestBody EquipoRequest r) {
        return equipos.actualizar(id, r);
    }

    @Operation(summary = "Periodo de mantenimiento preventivo", description = "3, 6 o 12 meses; null lo quita.")
    @PutMapping("/{id}/periodo")
    public MantenimientoDTO periodo(@PathVariable Long id, @RequestBody PeriodoRequest r) {
        return equipos.cambiarPeriodo(id, r.meses());
    }

    @Operation(summary = "Historial del equipo en orden cronológico")
    @GetMapping("/{id}/historial")
    public HistorialEquipoDTO historial(@PathVariable Long id) {
        return equipos.historial(id);
    }

    @Operation(summary = "Preparar recordatorio de mantenimiento por WhatsApp")
    @PostMapping("/{id}/recordatorio")
    @ResponseStatus(HttpStatus.CREATED)
    public RecordatorioDTO recordatorio(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal yo) {
        return equipos.recordatorio(id, yo.getId());
    }
}
