package co.tecnihardware.st.controller;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.tecnihardware.st.dto.EquipoPortalDTO;
import co.tecnihardware.st.dto.HistorialEquipoDTO;
import co.tecnihardware.st.dto.OrdenDTO;
import co.tecnihardware.st.security.UsuarioPrincipal;
import co.tecnihardware.st.service.PortalService;

@RestController
@RequestMapping("/api/portal")
@PreAuthorize("hasRole('CLIENTE')")
@Tag(name = "Portal del cliente", description = "RF-19 consulta de sus equipos y órdenes (solo lectura, solo lo propio)")
public class PortalController {

    private final PortalService portal;

    public PortalController(PortalService portal) {
        this.portal = portal;
    }

    @Operation(summary = "Mis equipos con el estado del mantenimiento")
    @GetMapping("/equipos")
    public List<EquipoPortalDTO> equipos(@AuthenticationPrincipal UsuarioPrincipal yo) {
        return portal.equipos(yo.getIdCliente());
    }

    @Operation(summary = "Historial de uno de mis equipos")
    @GetMapping("/equipos/{id}")
    public HistorialEquipoDTO equipo(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal yo) {
        return portal.equipo(id, yo.getIdCliente());
    }

    @Operation(summary = "Detalle de una de mis órdenes")
    @GetMapping("/ordenes/{codigo}")
    public OrdenDTO orden(@PathVariable String codigo, @AuthenticationPrincipal UsuarioPrincipal yo) {
        return portal.orden(codigo, yo.getIdCliente());
    }
}
