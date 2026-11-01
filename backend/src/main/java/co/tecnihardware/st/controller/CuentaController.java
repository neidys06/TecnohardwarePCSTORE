package co.tecnihardware.st.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import co.tecnihardware.st.dto.FotoPerfilDTO;
import co.tecnihardware.st.security.UsuarioPrincipal;
import co.tecnihardware.st.service.CuentaService;

@RestController
@RequestMapping("/api/cuenta")
@Tag(name = "Cuenta", description = "Foto de perfil")
public class CuentaController {

    private final CuentaService cuentas;

    public CuentaController(CuentaService cuentas) {
        this.cuentas = cuentas;
    }

    @Operation(summary = "Cambiar la foto de perfil (JPG o PNG, máximo 5 MB)")
    @RequestMapping(path = "/foto", method = { RequestMethod.PUT, RequestMethod.POST },
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FotoPerfilDTO guardarFoto(@RequestParam(name = "foto", required = false) MultipartFile foto,
            @AuthenticationPrincipal UsuarioPrincipal yo) {
        return cuentas.guardarFoto(yo.getId(), foto);
    }

    @GetMapping("/foto/{id}")
    public ResponseEntity<byte[]> foto(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal yo) {
        return Descargas.enLinea(cuentas.foto(id, yo), false, true);
    }
}
