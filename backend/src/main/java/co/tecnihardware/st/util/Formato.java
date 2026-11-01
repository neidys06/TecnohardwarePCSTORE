package co.tecnihardware.st.util;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Formatos que usa la interfaz (fechas dd/mm/aaaa, pesos colombianos, teléfonos). */
public final class Formato {

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final String[] MESES = { "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct",
            "nov", "dic" };
    private static final String[] MESES_LARGOS = { "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
            "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre" };
    private static final Pattern MARCADOR = Pattern.compile("\\{(\\w+)}");

    private Formato() {
    }

    public static String fecha(LocalDate f) {
        return f == null ? "" : FECHA.format(f);
    }

    public static String fechaHora(LocalDateTime f) {
        return f == null ? "" : FECHA_HORA.format(f);
    }

    /** 2026-10-18 → «18 oct 2026». */
    public static String fechaLarga(LocalDate f) {
        return f.getDayOfMonth() + " " + MESES[f.getMonthValue() - 1] + " " + f.getYear();
    }

    /** 2026-10-01 → «Octubre 2026». */
    public static String mes(LocalDate f) {
        return MESES_LARGOS[f.getMonthValue() - 1] + " " + f.getYear();
    }

    /** «Octubre 2026» o «2026-10» → 2026-10-01; null si no se entiende. */
    public static LocalDate mesDesdeTexto(String texto) {
        if (texto == null) {
            return null;
        }
        String t = texto.trim();
        if (t.matches("\\d{4}-\\d{2}")) {
            int m = Integer.parseInt(t.substring(5));
            return m >= 1 && m <= 12 ? LocalDate.of(Integer.parseInt(t.substring(0, 4)), m, 1) : null;
        }
        String[] partes = t.split("\\s+");
        if (partes.length != 2 || !partes[1].matches("\\d{4}")) {
            return null;
        }
        for (int i = 0; i < MESES_LARGOS.length; i++) {
            if (MESES_LARGOS[i].equalsIgnoreCase(partes[0])) {
                return LocalDate.of(Integer.parseInt(partes[1]), i + 1, 1);
            }
        }
        return null;
    }

    /** 1250000 → «$1.250.000». */
    public static String pesos(BigDecimal valor) {
        return "$" + miles(valor.setScale(0, java.math.RoundingMode.HALF_UP).toPlainString());
    }

    /** Cédula guardada con solo dígitos → «1.090.456.781». */
    public static String cedula(String digitos) {
        return digitos == null ? "" : miles(digitos);
    }

    private static String miles(String digitos) {
        StringBuilder sb = new StringBuilder(digitos);
        for (int i = sb.length() - 3; i > 0; i -= 3) {
            sb.insert(i, '.');
        }
        return sb.toString();
    }

    /** 3105550142 → «310 555 0142». */
    public static String telefono(String t) {
        if (t == null) {
            return "";
        }
        return t.length() == 10 ? t.substring(0, 3) + " " + t.substring(3, 6) + " " + t.substring(6) : t;
    }

    public static String soloDigitos(String s) {
        return s == null ? "" : s.replaceAll("\\D", "");
    }

    /** Minúsculas y sin tildes, para buscar «gomez» y encontrar «Gómez». */
    public static String normalizar(String s) {
        if (s == null) {
            return "";
        }
        String sinTildes = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sinTildes.toLowerCase(Locale.ROOT).trim();
    }

    /** Reemplaza {nombre}, {equipo}… en la plantilla; deja intactos los marcadores desconocidos. */
    public static String llenarPlantilla(String plantilla, Map<String, String> valores) {
        Matcher m = MARCADOR.matcher(plantilla);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String v = valores.get(m.group(1));
            m.appendReplacement(sb, Matcher.quoteReplacement(v != null ? v : m.group()));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    /** Número colombiano de 10 dígitos → https://wa.me/57XXXXXXXXXX (RF-11). */
    public static String enlaceWhatsApp(String telefono, String mensaje) {
        String d = soloDigitos(telefono);
        String numero = d.length() == 10 ? "57" + d : d;
        String base = "https://wa.me/" + numero;
        if (mensaje == null || mensaje.isBlank()) {
            return base;
        }
        return base + "?text=" + java.net.URLEncoder.encode(mensaje, java.nio.charset.StandardCharsets.UTF_8)
                .replace("+", "%20");
    }
}
