package co.tecnihardware.st.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import co.tecnihardware.st.dto.FotoPerfilDTO;
import co.tecnihardware.st.exception.AccesoDenegadoException;
import co.tecnihardware.st.exception.RecursoNoEncontradoException;
import co.tecnihardware.st.exception.ReglaDeNegocioException;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.UsuarioRepository;
import co.tecnihardware.st.security.UsuarioPrincipal;

/** Foto de perfil de la cuenta. */
@Service
@Transactional(readOnly = true)
public class CuentaService {

    private final UsuarioRepository usuarios;
    private final ArchivoService archivos;

    public CuentaService(UsuarioRepository usuarios, ArchivoService archivos) {
        this.usuarios = usuarios;
        this.archivos = archivos;
    }

    public static String urlFoto(Long idUsuario) {
        return "/api/cuenta/foto/" + idUsuario;
    }

    @Transactional
    public FotoPerfilDTO guardarFoto(Long idUsuario, MultipartFile foto) {
        if (foto == null || foto.isEmpty()) {
            throw new ReglaDeNegocioException("Selecciona una imagen.");
        }
        byte[] datos = ArchivoService.bytes(foto);
        ArchivoService.Tipo tipo = archivos.exigirImagen(datos, "La imagen");
        Usuario u = usuarios.findById(idUsuario).orElseThrow(() -> new RecursoNoEncontradoException("La cuenta"));
        String anterior = u.getFotoPerfil();
        u.setFotoPerfil(archivos.guardar("perfiles", datos, tipo));
        if (anterior != null) {
            archivos.borrarAlConfirmar(anterior);
        }
        return new FotoPerfilDTO(urlFoto(idUsuario) + "?v=" + System.currentTimeMillis());
    }

    /** El cliente ve su foto y la de la tienda; nunca la de otros clientes. */
    public ArchivoDescarga foto(Long idUsuario, UsuarioPrincipal quien) {
        Usuario u = usuarios.findById(idUsuario)
                .filter(x -> x.getFotoPerfil() != null)
                .orElseThrow(() -> new RecursoNoEncontradoException("La foto"));
        if (!quien.esAdministrador() && !idUsuario.equals(quien.getId()) && !u.esAdministrador()) {
            throw new AccesoDenegadoException();
        }
        byte[] datos = archivos.leer(u.getFotoPerfil());
        String tipo = ArchivoService.tipoReal(datos).map(ArchivoService.Tipo::getMime).orElse("application/octet-stream");
        return new ArchivoDescarga(datos, tipo, "perfil");
    }
}
