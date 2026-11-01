package co.tecnihardware.st.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.tecnihardware.st.dto.EquipoPortalDTO;
import co.tecnihardware.st.dto.HistorialEquipoDTO;
import co.tecnihardware.st.dto.OrdenDTO;
import co.tecnihardware.st.exception.AccesoDenegadoException;
import co.tecnihardware.st.exception.RecursoNoEncontradoException;
import co.tecnihardware.st.model.Equipo;
import co.tecnihardware.st.model.OrdenServicio;
import co.tecnihardware.st.repository.EquipoRepository;
import co.tecnihardware.st.repository.OrdenServicioRepository;
import co.tecnihardware.st.service.CalculadoraMantenimiento.Resultado;

/**
 * RF-19 · Portal del cliente: solo lectura y solo su propia información. La propiedad
 * se valida aquí, en el servidor, aunque el cliente cambie la dirección (RNF-10, IDOR).
 */
@Service
@Transactional(readOnly = true)
public class PortalService {

    private final EquipoRepository equipos;
    private final OrdenServicioRepository ordenes;
    private final EquipoService equipoService;
    private final MantenimientoService mantenimientos;
    private final ConfiguracionService configuracion;
    private final OrdenMapper mapper;

    public PortalService(EquipoRepository equipos, OrdenServicioRepository ordenes, EquipoService equipoService,
            MantenimientoService mantenimientos, ConfiguracionService configuracion, OrdenMapper mapper) {
        this.equipos = equipos;
        this.ordenes = ordenes;
        this.equipoService = equipoService;
        this.mantenimientos = mantenimientos;
        this.configuracion = configuracion;
        this.mapper = mapper;
    }

    public List<EquipoPortalDTO> equipos(Long idCliente) {
        return equipos.listarDeCliente(idCliente).stream().map(e -> {
            Resultado r = mantenimientos.estadoDe(e);
            return new EquipoPortalDTO(e.getId(), e.getNombreTipo(), e.getMarcaModelo(), r.ultimoServicio(),
                    r.proximoMantenimiento(), r.diasRestantes(), r.estado());
        }).toList();
    }

    public HistorialEquipoDTO equipo(Long idEquipo, Long idCliente) {
        Equipo e = equipos.findById(idEquipo).orElseThrow(() -> new RecursoNoEncontradoException("El equipo"));
        if (!e.getCliente().getId().equals(idCliente)) {
            throw new AccesoDenegadoException();
        }
        return equipoService.historial(e, false);
    }

    public OrdenDTO orden(String codigo, Long idCliente) {
        Long id = OrdenServicio.idDesdeCodigo(codigo).orElseThrow(() -> new RecursoNoEncontradoException("La orden"));
        OrdenServicio o = ordenes.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("La orden"));
        if (!o.getEquipo().getCliente().getId().equals(idCliente)) {
            throw new AccesoDenegadoException();
        }
        return mapper.aDTO(o, configuracion.actual().getValorDiagnostico(), false);
    }
}
