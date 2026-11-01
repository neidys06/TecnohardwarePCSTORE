package co.tecnihardware.st.service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import co.tecnihardware.st.config.PropiedadesArchivos;
import co.tecnihardware.st.exception.ReglaDeNegocioException;

/**
 * Almacenamiento de fotografías y PDF en disco. El tipo se decide por el contenido
 * del archivo (no por su nombre), y los nombres son aleatorios. Si la transacción
 * de la base de datos se revierte, los archivos que alcanzó a guardar se borran.
 */
@Service
public class ArchivoService {

    private static final Logger log = LoggerFactory.getLogger(ArchivoService.class);

    public enum Tipo {
        JPEG("image/jpeg", ".jpg"),
        PNG("image/png", ".png"),
        PDF("application/pdf", ".pdf");

        private final String mime;
        private final String extension;

        Tipo(String mime, String extension) {
            this.mime = mime;
            this.extension = extension;
        }

        public String getMime() {
            return mime;
        }
    }

    private final Path raiz;
    private final PropiedadesArchivos props;

    public ArchivoService(PropiedadesArchivos props) {
        this.props = props;
        this.raiz = Paths.get(props.carpeta()).toAbsolutePath().normalize();
    }

    /** Reconoce JPG, PNG y PDF por sus primeros bytes («números mágicos»). */
    public static Optional<Tipo> tipoReal(byte[] b) {
        if (b == null) {
            return Optional.empty();
        }
        if (b.length > 3 && (b[0] & 0xff) == 0xff && (b[1] & 0xff) == 0xd8 && (b[2] & 0xff) == 0xff) {
            return Optional.of(Tipo.JPEG);
        }
        byte[] png = { (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a };
        if (b.length > 8) {
            boolean esPng = true;
            for (int i = 0; i < png.length; i++) {
                esPng &= b[i] == png[i];
            }
            if (esPng) {
                return Optional.of(Tipo.PNG);
            }
        }
        if (b.length > 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') {
            return Optional.of(Tipo.PDF);
        }
        return Optional.empty();
    }

    /** RF-08 · Solo JPG o PNG de máximo 5 MB. */
    public Tipo exigirImagen(byte[] datos, String nombreOriginal) {
        Optional<Tipo> t = tipoReal(datos);
        if (t.isEmpty() || t.get() == Tipo.PDF || datos.length > props.fotoMaxBytes()) {
            throw new ReglaDeNegocioException(
                    "«" + nombreOriginal + "» no es una imagen válida. Usa JPG o PNG de máximo 5 MB.");
        }
        return t.get();
    }

    /** RF-13 · Solo PDF de máximo 3 MB. */
    public void exigirPdf(byte[] datos) {
        if (tipoReal(datos).filter(t -> t == Tipo.PDF).isEmpty() || datos.length > props.pdfMaxBytes()) {
            throw new ReglaDeNegocioException("El archivo debe ser un PDF de máximo 3 MB.", "archivo", "Solo PDF.");
        }
    }

    public int fotosPorCarga() {
        return props.fotosPorCarga();
    }

    public static byte[] bytes(MultipartFile f) {
        try {
            return f.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer el archivo recibido", e);
        }
    }

    /** Guarda con nombre aleatorio y devuelve la ruta relativa que se registra en la BD. */
    public String guardar(String carpeta, byte[] datos, Tipo tipo) {
        String relativa = carpeta + "/" + UUID.randomUUID() + tipo.extension;
        Path destino = resolver(relativa);
        try {
            Files.createDirectories(destino.getParent());
            Files.write(destino, datos, StandardOpenOption.CREATE_NEW);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo guardar el archivo", e);
        }
        borrarSiSeRevierte(relativa);
        return relativa;
    }

    public byte[] leer(String relativa) {
        try {
            return Files.readAllBytes(resolver(relativa));
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer el archivo " + relativa, e);
        }
    }

    public void borrar(String relativa) {
        try {
            Files.deleteIfExists(resolver(relativa));
        } catch (IOException | RuntimeException e) {
            log.warn("No se pudo borrar el archivo {}: {}", relativa, e.getMessage());
        }
    }

    /** Borra el archivo cuando la transacción actual se confirme (p. ej. la foto de perfil anterior). */
    public void borrarAlConfirmar(String relativa) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            borrar(relativa);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                borrar(relativa);
            }
        });
    }

    private void borrarSiSeRevierte(String relativa) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int estado) {
                if (estado != STATUS_COMMITTED) {
                    borrar(relativa);
                }
            }
        });
    }

    /** Resuelve la ruta sin permitir salir de la carpeta de archivos (path traversal). */
    Path resolver(String relativa) {
        Path p = raiz.resolve(relativa).normalize();
        if (!p.startsWith(raiz)) {
            throw new ReglaDeNegocioException("Ruta de archivo no válida.");
        }
        return p;
    }
}
