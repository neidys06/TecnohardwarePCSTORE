package co.tecnihardware.st.controller;

import java.time.Clock;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.tecnihardware.st.dto.EstadoVistaDTO;
import co.tecnihardware.st.dto.SaludDTO;
import co.tecnihardware.st.security.UsuarioPrincipal;
import co.tecnihardware.st.service.EstadoVistaService;

@RestController
@RequestMapping("/api")
@Tag(name = "Estado", description = "Datos iniciales de la interfaz, filtrados por rol (RF-19, RNF-10)")
public class EstadoController {

    private final EstadoVistaService estado;
    private final Clock reloj;

    public EstadoController(EstadoVistaService estado, Clock reloj) {
        this.estado = estado;
        this.reloj = reloj;
    }

    @Operation(summary = "Estado completo para la interfaz", description = "La administradora recibe todo; un cliente solo sus datos.")
    @GetMapping("/estado")
    public ResponseEntity<EstadoVistaDTO> estado(@AuthenticationPrincipal UsuarioPrincipal yo) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(estado.para(yo));
    }

    @Operation(summary = "Verificación rápida de que la API responde")
    @GetMapping("/salud")
    public SaludDTO salud() {
        return new SaludDTO(true, LocalDate.now(reloj));
    }
}
