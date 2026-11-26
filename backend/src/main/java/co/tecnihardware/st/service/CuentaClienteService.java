package co.tecnihardware.st.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.tecnihardware.st.dto.CuentaClienteDTO;
import co.tecnihardware.st.dto.EntregaConjuntaDTO;
import co.tecnihardware.st.dto.OrdenDTO;
import co.tecnihardware.st.exception.RecursoNoEncontradoException;
import co.tecnihardware.st.exception.ReglaDeNegocioException;
import co.tecnihardware.st.model.Cliente;
import co.tecnihardware.st.model.EstadoOrden;
import co.tecnihardware.st.model.OrdenServicio;
import co.tecnihardware.st.repository.ClienteRepository;
import co.tecnihardware.st.repository.OrdenServicioRepository;

/**
 * Cuenta única por cliente (Acta 6, solicitud de cambio 03): si un cliente deja varios equipos,
 * el mismo día o en días distintos, lo que debe de los que todavía no ha recogido se suma en una
 * sola cuenta y se puede cobrar y entregar todo junto.
 */
@Service
@Transactional(readOnly = true)
public class CuentaClienteService {

    private final OrdenServicioRepository ordenes;
    private final ClienteRepository clientes;
    private final ConfiguracionService configuracion;
    private final OrdenService ordenService;

    public CuentaClienteService(OrdenServicioRepository ordenes, ClienteRepository clientes,
            ConfiguracionService configuracion, OrdenService ordenService) {
        this.ordenes = ordenes;
        this.clientes = clientes;
        this.configuracion = configuracion;
        this.ordenService = ordenService;
    }

    /** Órdenes del cliente que aún no se han entregado ni cerrado, con su valor y el total. */
    public CuentaClienteDTO cuenta(Long idCliente) {
        Cliente cliente = clientes.findById(idCliente).orElseThrow(() -> new RecursoNoEncontradoException("El cliente"));
        BigDecimal diagnostico = configuracion.actual().getValorDiagnostico();
        List<CuentaClienteDTO.Item> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        int porDefinir = 0;
        int listas = 0;
        for (OrdenServicio o : ordenes.listarDeCliente(idCliente)) {
            if (o.getEstado().esCerrado()) {
                continue;
            }
            BigDecimal valor = o.getCostoEstimado() == null ? null : o.calcularMonto(diagnostico);
            if (valor == null) {
                porDefinir++;
            } else {
                total = total.add(valor);
            }
            if (o.getEstado() == EstadoOrden.FINALIZADA) {
                listas++;
            }
            items.add(new CuentaClienteDTO.Item(o.getCodigo(), o.getEquipo().getMarcaModelo(),
                    o.getEstado().name(), o.getEstado().getTexto(), valor));
        }
        return new CuentaClienteDTO(cliente.getId(), cliente.getNombre(), items, total, porDefinir, listas);
    }

    /**
     * Entrega varios equipos del mismo cliente en un solo pago. Todo o nada: si una orden no está
     * «Finalizada» o es de otro cliente, no se entrega ninguna. Cada orden queda anotada con la
 * entrega conjunta, que es la base del recibo de entrega.
     */
    @Transactional
    public EntregaConjuntaDTO entregar(List<String> codigos, String recibidoPor, String entregadoPor, Long idUsuario) {
        List<String> unicos = new ArrayList<>(new LinkedHashSet<>(codigos));
        Long idCliente = null;
        for (String codigo : unicos) {
            OrdenServicio o = ordenes.findById(OrdenServicio.idDesdeCodigo(codigo)
                    .orElseThrow(() -> new RecursoNoEncontradoException("La orden " + codigo)))
                    .orElseThrow(() -> new RecursoNoEncontradoException("La orden " + codigo));
            Long dueno = o.getEquipo().getCliente().getId();
            if (idCliente != null && !idCliente.equals(dueno)) {
                throw new ReglaDeNegocioException("Solo se pueden entregar juntas las órdenes de un mismo cliente.");
            }
            idCliente = dueno;
            if (o.getEstado() != EstadoOrden.FINALIZADA) {
                throw new ReglaDeNegocioException("La orden " + o.getCodigo() + " todavía no está finalizada.");
            }
        }
        List<OrdenDTO> entregadas = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (String codigo : unicos) {
            OrdenDTO dto = ordenService.entregar(codigo, recibidoPor, entregadoPor, idUsuario);
            entregadas.add(dto);
            if (dto.montoCobrado() != null) {
                total = total.add(dto.montoCobrado());
            }
        }
        if (entregadas.size() > 1) {
            // Queda anotado en cada orden con qué otras se entregó, para volver a imprimir el recibo.
            String nota = "Entrega conjunta (" + String.join(", ", entregadas.stream().map(OrdenDTO::codigo).toList()) + ")";
            entregadas.replaceAll(dto -> ordenService.anotar(dto.codigo(), nota, idUsuario));
        }
        return new EntregaConjuntaDTO(entregadas, total);
    }
}
