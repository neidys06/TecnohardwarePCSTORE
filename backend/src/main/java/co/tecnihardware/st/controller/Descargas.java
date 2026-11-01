package co.tecnihardware.st.controller;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import co.tecnihardware.st.service.ArchivoDescarga;

/** Respuestas HTTP para archivos (fotos y PDF). */
final class Descargas {

    private Descargas() {
    }

    static ResponseEntity<byte[]> enLinea(ArchivoDescarga a, boolean adjunto, boolean cachePrivada) {
        ContentDisposition cd = (adjunto ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(a.nombre(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.tipoMime()))
                .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
                .cacheControl(cachePrivada ? CacheControl.maxAge(Duration.ofDays(1)).cachePrivate()
                        : CacheControl.noStore())
                .body(a.datos());
    }
}
