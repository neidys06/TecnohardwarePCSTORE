package co.tecnihardware.st.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.tecnihardware.st.exception.AccesoDenegadoException;
import co.tecnihardware.st.exception.RecursoNoEncontradoException;
import co.tecnihardware.st.model.Evidencia;
import co.tecnihardware.st.repository.EvidenciaRepository;
import co.tecnihardware.st.security.UsuarioPrincipal;

/** Las fotografías solo las ve la administradora o el dueño del equipo (RNF-10, IDOR). */
@Service
@Transactional(readOnly = true)
public class EvidenciaService {

    private final EvidenciaRepository evidencias;
    private final ArchivoService archivos;

    public EvidenciaService(EvidenciaRepository evidencias, ArchivoService archivos) {
        this.evidencias = evidencias;
        this.archivos = archivos;
    }

    public ArchivoDescarga archivo(Long id, UsuarioPrincipal quien) {
        Evidencia ev = evidencias.buscarConDueno(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("La fotografía"));
        Long dueno = ev.getOrden().getEquipo().getCliente().getId();
        if (!quien.esAdministrador() && !dueno.equals(quien.getIdCliente())) {
            throw new AccesoDenegadoException();
        }
        return new ArchivoDescarga(archivos.leer(ev.getRutaArchivo()), ev.getTipoMime(), "evidencia-" + id);
    }
}
