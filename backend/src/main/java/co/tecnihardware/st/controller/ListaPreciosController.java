package co.tecnihardware.st.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import co.tecnihardware.st.dto.ListaPreciosDTO;
import co.tecnihardware.st.security.UsuarioPrincipal;
import co.tecnihardware.st.service.ListaPreciosService;

@RestController
@RequestMapping("/api/lista-precios")
@Tag(name = "Lista de precios", description = "RF-13 publicación (administradora) y RF-14 consulta (cliente)")
public class ListaPreciosController {

    private final ListaPreciosService listas;

    public ListaPreciosController(ListaPreciosService listas) {
        this.listas = listas;
    }

    /** Responde {@code null} si todavía no se ha publicado ninguna lista. */
    @GetMapping("/vigente")
    public ResponseEntity<Object> vigente() {
        return listas.vigente().<ResponseEntity<Object>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body("null"));
    }

    @Operation(summary = "Ver o descargar el PDF vigente", description = "Con ?descargar=1 se descarga.")
    @GetMapping("/vigente/archivo")
    public ResponseEntity<byte[]> archivo(@RequestParam(name = "descargar", required = false) String descargar) {
        return Descargas.enLinea(listas.archivoVigente(), descargar != null, false);
    }

    @Operation(summary = "Publicar la lista del mes", description = "PDF de máximo 3 MB; reemplaza a la vigente y avisa a los clientes.")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<ListaPreciosDTO> subir(@RequestParam("mes") String mes,
            @RequestParam(name = "archivo", required = false) MultipartFile archivo,
            @AuthenticationPrincipal UsuarioPrincipal yo) {
        return ResponseEntity.status(HttpStatus.CREATED).body(listas.subir(mes, archivo, yo.getId()));
    }
}
