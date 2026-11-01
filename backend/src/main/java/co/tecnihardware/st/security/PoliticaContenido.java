package co.tecnihardware.st.security;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Content-Security-Policy: solo se ejecutan los scripts del
 * propio sistema. El pequeño script en línea del index.html se permite por su hash.
 */
@Component
public class PoliticaContenido {

    private static final Logger log = LoggerFactory.getLogger(PoliticaContenido.class);
    private static final Pattern SCRIPT_EN_LINEA = Pattern.compile("<script>([\\s\\S]*?)</script>");

    private final String politica;

    public PoliticaContenido() {
        List<String> hashes = hashesIndex();
        String scripts = "'self'" + (hashes.isEmpty() ? "" : " " + String.join(" ", hashes));
        this.politica = "default-src 'self'; script-src " + scripts
                + "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:"
                + "; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'"
                + "; frame-ancestors 'self'";
    }

    public String getPolitica() {
        return politica;
    }

    private static List<String> hashesIndex() {
        List<String> hashes = new ArrayList<>();
        ClassPathResource index = new ClassPathResource("static/index.html");
        if (!index.exists()) {
            return hashes;
        }
        try (InputStream in = index.getInputStream()) {
            String html = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            Matcher m = SCRIPT_EN_LINEA.matcher(html);
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            while (m.find()) {
                byte[] h = sha.digest(m.group(1).getBytes(StandardCharsets.UTF_8));
                hashes.add("'sha256-" + Base64.getEncoder().encodeToString(h) + "'");
            }
        } catch (IOException | NoSuchAlgorithmException e) {
            log.warn("No se pudo calcular el hash de los scripts del index.html: {}", e.getMessage());
        }
        return hashes;
    }
}
