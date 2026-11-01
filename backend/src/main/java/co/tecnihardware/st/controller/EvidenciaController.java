package co.tecnihardware.st.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.tecnihardware.st.security.UsuarioPrincipal;
import co.tecnihardware.st.service.EvidenciaService;

@RestController
@RequestMapping("/api/evidencias")
@Tag(name = "Evidencias", description = "Archivos de las fotografías (RF-08); solo la administradora o el dueño (RNF-10)")
public class EvidenciaController {

    private final EvidenciaService evidencias;

    public EvidenciaController(EvidenciaService evidencias) {
        this.evidencias = evidencias;
    }

    @Operation(summary = "Imagen de una evidencia")
    @GetMapping("/{id}/archivo")
    public ResponseEntity<byte[]> archivo(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal yo) {
        return Descargas.enLinea(evidencias.archivo(id, yo), false, true);
    }
}
