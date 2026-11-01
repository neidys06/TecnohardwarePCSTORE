package co.tecnihardware.st.controller;

import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import co.tecnihardware.st.dto.AdicionalRequest;
import co.tecnihardware.st.dto.DecisionRequest;
import co.tecnihardware.st.dto.DiagnosticoRequest;
import co.tecnihardware.st.dto.EntregaRequest;
import co.tecnihardware.st.dto.NotaRequest;
import co.tecnihardware.st.dto.OrdenDTO;
import co.tecnihardware.st.model.EstadoOrden;
import co.tecnihardware.st.model.MomentoEvidencia;
import co.tecnihardware.st.security.UsuarioPrincipal;
import co.tecnihardware.st.service.OrdenService;

@RestController
@RequestMapping("/api/ordenes")
@PreAuthorize("hasRole('ADMINISTRADOR')")
@Tag(name = "Órdenes de servicio", description = "RF-04 a RF-08 y RF-18 (estados y transiciones)")
public class OrdenController {

    private final OrdenService ordenes;

    public OrdenController(OrdenService ordenes) {
        this.ordenes = ordenes;
    }

    @GetMapping
    public List<OrdenDTO> listar(@RequestParam(name = "estado", required = false) EstadoOrden estado) {
        return ordenes.listar(estado);
    }

    @GetMapping("/{codigo}")
    public OrdenDTO obtener(@Parameter(example = "OS-0001") @PathVariable String codigo) {
        return ordenes.obtener(codigo);
    }

    @Operation(summary = "Nueva orden (RF-04)", description = "recibio: persona de la tienda que recibe el equipo. Las fotos de ingreso son opcionales al crearla; se exigen antes del diagnóstico.")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public OrdenDTO crear(@RequestParam("idEquipo") Long idEquipo,
            @RequestParam("falla") String falla,
            @RequestParam(name = "accesorios", required = false) String accesorios,
            @RequestParam(name = "fechaIngreso", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaIngreso,
            @RequestParam(name = "recibio", required = false) String recibio,
            @RequestParam(name = "fotos", required = false) List<MultipartFile> fotos,
            @AuthenticationPrincipal UsuarioPrincipal yo) {
        return ordenes.crear(idEquipo, falla, accesorios, fechaIngreso, recibio, fotos, yo.getId());
    }

    @Operation(summary = "Registrar diagnóstico y costo (RF-05)", description = "Pasa a «Pendiente de autorización».")
    @PostMapping("/{codigo}/diagnostico")
    public OrdenDTO diagnostico(@PathVariable String codigo, @Valid @RequestBody DiagnosticoRequest r,
            @AuthenticationPrincipal UsuarioPrincipal yo) {
        return ordenes.registrarDiagnostico(codigo, r, yo.getId());
    }

    @Operation(summary = "Respuesta a la autorización inicial (RF-06)", description = "AUTORIZA → «Autorizada»; NO_AUTORIZA → cerrada, se cobra el diagnóstico.")
    @PostMapping("/{codigo}/autorizacion")
    public OrdenDTO autorizacion(@PathVariable String codigo, @Valid @RequestBody DecisionRequest r,
            @AuthenticationPrincipal UsuarioPrincipal yo) {
        return ordenes.responderAutorizacion(codigo, r.decision(), yo.getId());
    }

    @Operation(summary = "Pedir autorización adicional (RF-06)")
    @PostMapping("/{codigo}/adicionales")
    @ResponseStatus(HttpStatus.CREATED)
    public OrdenDTO adicional(@PathVariable String codigo, @Valid @RequestBody AdicionalRequest r,
            @AuthenticationPrincipal UsuarioPrincipal yo) {
        return ordenes.pedirAdicional(codigo, r, yo.getId());
    }

    @Operation(summary = "Respuesta a la autorización adicional (RF-06)")
    @PostMapping("/{codigo}/adicionales/respuesta")
    public OrdenDTO respuestaAdicional(@PathVariable String codigo, @Valid @RequestBody DecisionRequest r,
            @AuthenticationPrincipal UsuarioPrincipal yo) {
        return ordenes.responderAdicional(codigo, r.decision(), yo.getId());
    }

    @Operation(summary = "Agregar evidencias fotográficas (RF-08)", description = "En PROCESO la nota es obligatoria.")
    @PostMapping(path = "/{codigo}/evidencias", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public OrdenDTO evidencias(@PathVariable String codigo,
            @RequestParam("momento") MomentoEvidencia momento,
            @RequestParam(name = "nota", required = false) String nota,
            @RequestParam(name = "fotos", required = false) List<MultipartFile> fotos) {
        return ordenes.agregarEvidencias(codigo, momento, nota, fotos);
    }

    @Operation(summary = "Registrar el mantenimiento realizado (RF-07)", description = "Las fotos de salida son obligatorias. Pasa a «Finalizada».")
    @PostMapping(path = "/{codigo}/mantenimiento", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public OrdenDTO mantenimiento(@PathVariable String codigo,
            @RequestParam("trabajo") String trabajo,
            @RequestParam(name = "responsable", required = false) String responsable,
            @RequestParam(name = "fecha", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @Parameter(description = "JSON: [{\"nombre\":\"SSD 480 GB\",\"cantidad\":1}]") @RequestParam(name = "repuestos", required = false) String repuestos,
            @RequestParam(name = "fotos", required = false) List<MultipartFile> fotos,
            @AuthenticationPrincipal UsuarioPrincipal yo) {
        return ordenes.registrarMantenimiento(codigo, trabajo, responsable, fecha, repuestos, fotos, yo.getId());
    }

    @Operation(summary = "Entregar el equipo (RF-18)", description = "Solo desde «Finalizada». Fija el monto cobrado.")
    @PostMapping("/{codigo}/entrega")
    public OrdenDTO entrega(@PathVariable String codigo, @Valid @RequestBody EntregaRequest r,
            @AuthenticationPrincipal UsuarioPrincipal yo) {
        return ordenes.entregar(codigo, r.recibidoPor(), r.entregadoPor(), yo.getId());
    }

    @Operation(summary = "Anotar en el historial sin cambiar el estado")
    @PostMapping("/{codigo}/notas")
    @ResponseStatus(HttpStatus.CREATED)
    public OrdenDTO nota(@PathVariable String codigo, @Valid @RequestBody NotaRequest r,
            @AuthenticationPrincipal UsuarioPrincipal yo) {
        return ordenes.anotar(codigo, r.texto(), yo.getId());
    }
}
