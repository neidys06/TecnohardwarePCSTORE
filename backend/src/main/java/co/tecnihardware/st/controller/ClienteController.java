package co.tecnihardware.st.controller;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import co.tecnihardware.st.dto.ClienteCreadoDTO;
import co.tecnihardware.st.dto.ClienteDTO;
import co.tecnihardware.st.dto.ClienteRequest;
import co.tecnihardware.st.dto.ContrasenaTemporalDTO;
import co.tecnihardware.st.dto.EnlaceDTO;
import co.tecnihardware.st.service.ClienteService;

@RestController
@RequestMapping("/api/clientes")
@PreAuthorize("hasRole('ADMINISTRADOR')")
@Tag(name = "Clientes", description = "RF-01 registro, RF-11 WhatsApp, RF-12 búsqueda")
public class ClienteController {

    private final ClienteService clientes;

    public ClienteController(ClienteService clientes) {
        this.clientes = clientes;
    }

    @Operation(summary = "Listar o buscar clientes", description = "Con q busca por nombre, cédula o teléfono e incluye el cuadro de mantenimiento.")
    @GetMapping
    public List<ClienteDTO> listar(
            @Parameter(description = "Nombre, cédula o teléfono", example = "gomez") @RequestParam(name = "q", required = false) String q) {
        return clientes.listar(q);
    }

    @GetMapping("/{id}")
    public ClienteDTO obtener(@PathVariable Long id) {
        return clientes.obtener(id);
    }

    @Operation(summary = "Registrar cliente", description = "Genera una contraseña temporal que se muestra una sola vez.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClienteCreadoDTO crear(@Valid @RequestBody ClienteRequest r) {
        return clientes.crear(r);
    }

    @PutMapping("/{id}")
    public ClienteDTO actualizar(@PathVariable Long id, @Valid @RequestBody ClienteRequest r) {
        return clientes.actualizar(id, r);
    }

    @Operation(summary = "Restablecer contraseña", description = "Nueva contraseña temporal para el cliente que olvidó la suya.")
    @PostMapping("/{id}/restablecer-contrasena")
    public ContrasenaTemporalDTO restablecerContrasena(@PathVariable Long id) {
        return clientes.restablecerContrasena(id);
    }

    @Operation(summary = "Enlace de WhatsApp del cliente")
    @GetMapping("/{id}/whatsapp")
    public EnlaceDTO whatsapp(@PathVariable Long id) {
        return clientes.enlaceWhatsApp(id);
    }
}
