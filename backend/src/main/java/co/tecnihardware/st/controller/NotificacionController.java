package co.tecnihardware.st.controller;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.tecnihardware.st.dto.LeerNotificacionRequest;
import co.tecnihardware.st.dto.NotificacionDTO;
import co.tecnihardware.st.security.UsuarioPrincipal;
import co.tecnihardware.st.service.NotificacionService;

@RestController
@RequestMapping("/api/notificaciones")
@Tag(name = "Notificaciones", description = "Avisos del usuario que inició sesión (RF-10)")
public class NotificacionController {

    private final NotificacionService notificaciones;

    public NotificacionController(NotificacionService notificaciones) {
        this.notificaciones = notificaciones;
    }

    @GetMapping
    public List<NotificacionDTO> listar(@AuthenticationPrincipal UsuarioPrincipal yo) {
        return notificaciones.listar(yo.getId());
    }

    @Operation(summary = "Marcar como leída", description = "Sin id marca todas.")
    @PostMapping("/leer")
    public ResponseEntity<Void> leer(@AuthenticationPrincipal UsuarioPrincipal yo,
            @RequestBody(required = false) LeerNotificacionRequest r) {
        notificaciones.marcarLeidas(yo.getId(), r == null ? null : r.id());
        return ResponseEntity.noContent().build();
    }
}
