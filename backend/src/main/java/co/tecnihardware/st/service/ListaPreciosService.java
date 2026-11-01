package co.tecnihardware.st.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import co.tecnihardware.st.dto.ListaPreciosDTO;
import co.tecnihardware.st.exception.RecursoNoEncontradoException;
import co.tecnihardware.st.exception.ReglaDeNegocioException;
import co.tecnihardware.st.model.Cliente;
import co.tecnihardware.st.model.ListaPrecios;
import co.tecnihardware.st.repository.ClienteRepository;
import co.tecnihardware.st.repository.ListaPreciosRepository;
import co.tecnihardware.st.repository.UsuarioRepository;
import co.tecnihardware.st.util.Formato;

/** Lista de precios del mes en PDF (RF-13 la publica la administradora, RF-14 la consulta el cliente). */
@Service
@Transactional(readOnly = true)
public class ListaPreciosService {

    public static final String URL_ARCHIVO = "/api/lista-precios/vigente/archivo";
    private static final Logger log = LoggerFactory.getLogger(ListaPreciosService.class);

    private final ListaPreciosRepository listas;
    private final UsuarioRepository usuarios;
    private final ClienteRepository clientes;
    private final ArchivoService archivos;
    private final NotificacionService notificaciones;
    private final Clock reloj;

    public ListaPreciosService(ListaPreciosRepository listas, UsuarioRepository usuarios, ClienteRepository clientes,
            ArchivoService archivos, NotificacionService notificaciones, Clock reloj) {
        this.listas = listas;
        this.usuarios = usuarios;
        this.clientes = clientes;
        this.archivos = archivos;
        this.notificaciones = notificaciones;
        this.reloj = reloj;
    }

    public Optional<ListaPreciosDTO> vigente() {
        return listas.findFirstByVigenteTrueOrderBySubidaEnDesc().map(ListaPreciosService::aDTO);
    }

    public ArchivoDescarga archivoVigente() {
        ListaPrecios l = listas.findFirstByVigenteTrueOrderBySubidaEnDesc()
                .orElseThrow(() -> new RecursoNoEncontradoException("La lista de precios del mes"));
        return new ArchivoDescarga(archivos.leer(l.getRutaArchivo()), "application/pdf", l.getNombreArchivo());
    }

    /** La lista nueva reemplaza a la vigente (la anterior queda en el histórico) y se avisa a los clientes. */
    @Transactional
    public ListaPreciosDTO subir(String mesTexto, MultipartFile archivo, Long idUsuario) {
        LocalDate mes = Formato.mesDesdeTexto(mesTexto);
        if (mes == null) {
            throw new ReglaDeNegocioException("Elige el mes de la lista.", "mes", "Mes no válido.");
        }
        if (archivo == null || archivo.isEmpty()) {
            throw new ReglaDeNegocioException("Selecciona el archivo PDF de la lista.");
        }
        byte[] datos = ArchivoService.bytes(archivo);
        archivos.exigirPdf(datos);
        String ruta = archivos.guardar("listas", datos, ArchivoService.Tipo.PDF);
        listas.findAll().stream().filter(ListaPrecios::isVigente).forEach(ListaPrecios::retirarVigencia);
        String nombre = archivo.getOriginalFilename() == null ? "lista-precios.pdf" : archivo.getOriginalFilename();
        if (nombre.length() > 160) {
            nombre = nombre.substring(0, 160);
        }
        ListaPrecios nueva = listas.save(new ListaPrecios(mes, nombre, ruta, datos.length,
                usuarios.findById(idUsuario).orElse(null), LocalDateTime.now(reloj)));
        for (Cliente c : clientes.listarTodos()) {
            notificaciones.notificar(c.getUsuario(), AvisoFactory.listaPrecios(mes));
        }
        log.info("Lista de precios de {} publicada", Formato.mes(mes));
        return aDTO(nueva);
    }

    static ListaPreciosDTO aDTO(ListaPrecios l) {
        return new ListaPreciosDTO(l.getId(), l.getMes(), Formato.mes(l.getMes()), l.getNombreArchivo(),
                l.getTamanoBytes(), l.getSubidaEn(), URL_ARCHIVO);
    }
}
