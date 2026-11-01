package co.tecnihardware.st.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.support.TransactionTemplate;

import co.tecnihardware.st.model.Rol;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.UsuarioRepository;
import co.tecnihardware.st.service.MantenimientoService;

/**
 * Pruebas de integración de extremo a extremo de la API: contexto
 * completo de Spring, seguridad real (JWT en cookie + CSRF) y H2 en memoria.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("API · flujo completo y seguridad")
class FlujoCompletoIntegracionTest {

    private static final String CLAVE_ADMIN = "AdminPrueba2026";
    /** Cabecera mínima de un PNG: el servidor reconoce el tipo por el contenido. */
    private static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n', 0, 0, 0, 13 };

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper json;
    @Autowired
    private UsuarioRepository usuarios;
    @Autowired
    private PasswordEncoder encoder;
    @Autowired
    private TransactionTemplate tx;

    private Cookie admin;

    @BeforeEach
    void sesionAdministradora() throws Exception {
        // La cuenta preconfigurada nace con contraseña temporal; para las pruebas se fija una definitiva.
        tx.executeWithoutResult(s -> {
            Usuario u = usuarios.findByRolAndActivoTrue(Rol.ADMINISTRADOR).get(0);
            u.cambiarContrasena(encoder.encode(CLAVE_ADMIN));
            u.registrarIngresoExitoso();
        });
        admin = login("admin", CLAVE_ADMIN);
    }

    // ----- Ayudas ------------------------------------------------------------------------

    private Cookie login(String usuario, String clave) throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("usuario", usuario, "contrasena", clave))))
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly("th_sesion", true))
                .andReturn();
        return r.getResponse().getCookie("th_sesion");
    }

    private JsonNode leer(MvcResult r) throws Exception {
        return json.readTree(r.getResponse().getContentAsString());
    }

    private JsonNode postJson(String ruta, Cookie sesion, Object cuerpo, int esperado) throws Exception {
        return leer(mvc.perform(post(ruta).with(csrf()).cookie(sesion)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cuerpo)))
                .andExpect(status().is(esperado)).andReturn());
    }

    /** Registra un cliente con contraseña definitiva y devuelve {idCliente, usuario, clave}. */
    private String[] clienteConCuenta() throws Exception {
        String usuario = "c" + UUID.randomUUID().toString().substring(0, 8);
        JsonNode creado = postJson("/api/clientes", admin,
                Map.of("nombre", "Laura Gómez", "telefono", "320 555 0198", "usuario", usuario), 201);
        String temporal = creado.get("contrasenaTemporal").asText();
        assertThat(temporal).matches("[A-Za-z]{4}[2-9]{4}");

        Cookie primera = login(usuario, temporal);
        // Con la contraseña temporal no puede ver nada más (RF-17)
        mvc.perform(get("/api/estado").cookie(primera)).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value("Debes crear una contraseña nueva antes de continuar."));
        postJson("/api/auth/cambiar-contrasena", primera,
                Map.of("nueva", "Laura2026x", "confirmacion", "Laura2026x"), 204);
        return new String[] { creado.get("cliente").get("id").asText(), usuario, "Laura2026x" };
    }

    private String crearEquipo(String idCliente) throws Exception {
        return postJson("/api/equipos", admin, Map.of("idCliente", Long.valueOf(idCliente), "tipo", "Otros",
                "tipoOtro", "Consola de videojuegos", "marcaModelo", "PlayStation 5", "periodo", 6), 201)
                .get("id").asText();
    }

    private String crearOrden(String idEquipo) throws Exception {
        MvcResult r = mvc.perform(multipart("/api/ordenes")
                .file(new MockMultipartFile("fotos", "ingreso.png", "image/png", PNG))
                .param("idEquipo", idEquipo)
                .param("falla", "No da imagen por HDMI")
                .param("accesorios", "Control y cable de poder")
                .param("recibio", "Dichel Susana Rojas Rivera")
                .with(csrf()).cookie(admin))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("EN_DIAGNOSTICO"))
                .andExpect(jsonPath("$.recibioEquipo").value("Dichel Susana Rojas Rivera"))
                .andExpect(jsonPath("$.evidencias", hasSize(1)))
                .andReturn();
        return leer(r).get("codigo").asText();
    }

    // ----- Flujo del RF-04 al RF-18 ------------------------------------------------------

    @Test
    @DisplayName("Orden de principio a fin: diagnóstico, autorización, adicional, mantenimiento y entrega")
    void flujoCompletoDeUnaOrden() throws Exception {
        String[] cliente = clienteConCuenta();
        String equipo = crearEquipo(cliente[0]);
        String codigo = crearOrden(equipo);

        // Un equipo no puede tener dos órdenes abiertas
        mvc.perform(multipart("/api/ordenes").file(new MockMultipartFile("fotos", "a.png", "image/png", PNG))
                .param("idEquipo", equipo).param("falla", "Otra falla del equipo")
                .param("recibio", "Gloria Rojas Rivera").with(csrf()).cookie(admin))
                .andExpect(status().isConflict());

        JsonNode o = postJson("/api/ordenes/" + codigo + "/diagnostico", admin,
                Map.of("diagnostico", "Puerto HDMI dañado, requiere cambio", "costo", 180000), 200);
        assertThat(o.get("estado").asText()).isEqualTo("PENDIENTE_AUTORIZACION");

        // No se puede entregar sin pasar por los estados del RF-18
        postJson("/api/ordenes/" + codigo + "/entrega", admin, Map.of("recibidoPor", "Laura Gómez", "entregadoPor", "Gloria Rojas Rivera"), 409);

        postJson("/api/ordenes/" + codigo + "/autorizacion", admin, Map.of("decision", "AUTORIZA"), 200);
        postJson("/api/ordenes/" + codigo + "/adicionales", admin,
                Map.of("descripcion", "Ventilador con ruido, requiere cambio", "costo", 60000), 201);
        o = postJson("/api/ordenes/" + codigo + "/adicionales/respuesta", admin, Map.of("decision", "AUTORIZA"), 200);
        assertThat(o.get("estado").asText()).isEqualTo("AUTORIZADA");

        // Foto de la reparación sin nota → rechazada (Acta 4)
        mvc.perform(multipart("/api/ordenes/" + codigo + "/evidencias")
                .file(new MockMultipartFile("fotos", "p.png", "image/png", PNG))
                .param("momento", "PROCESO").with(csrf()).cookie(admin))
                .andExpect(status().isUnprocessableEntity());

        // Mantenimiento sin fotos de salida → rechazado (RF-08)
        mvc.perform(multipart("/api/ordenes/" + codigo + "/mantenimiento")
                .param("trabajo", "Cambio de puerto HDMI y del ventilador").with(csrf()).cookie(admin))
                .andExpect(status().isUnprocessableEntity());

        mvc.perform(multipart("/api/ordenes/" + codigo + "/mantenimiento")
                .file(new MockMultipartFile("fotos", "salida.png", "image/png", PNG))
                .param("trabajo", "Cambio de puerto HDMI y del ventilador")
                .param("repuestos", "[{\"nombre\":\"Puerto HDMI\",\"cantidad\":1}]")
                .with(csrf()).cookie(admin))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("FINALIZADA"))
                .andExpect(jsonPath("$.mantenimiento.repuestos[0].nombre").value("Puerto HDMI"))
                // Una sola persona hace el servicio: se registra sola la cuenta que guarda (Reunión 5)
                .andExpect(jsonPath("$.mantenimiento.responsable").value("Gloria Rojas"));

        o = postJson("/api/ordenes/" + codigo + "/entrega", admin, Map.of("recibidoPor", "Laura Gómez", "entregadoPor", "Gloria Rojas Rivera"), 200);
        assertThat(o.get("estado").asText()).isEqualTo("ENTREGADA");
        assertThat(o.get("entregoEquipo").asText()).isEqualTo("Gloria Rojas Rivera");
        assertThat(o.get("montoCobrado").decimalValue()).isEqualByComparingTo("240000");
        assertThat(o.get("historial")).hasSize(7);

        // El cliente ve su orden en el portal, sin el nombre de quién hizo cada cambio
        Cookie sesionCliente = login(cliente[1], cliente[2]);
        mvc.perform(get("/api/portal/ordenes/" + codigo).cookie(sesionCliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.historial[0].usuario").doesNotExist());
        mvc.perform(get("/api/estado").cookie(sesionCliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sesion.rol").value("cliente"))
                .andExpect(jsonPath("$.clientes", hasSize(1)))
                .andExpect(jsonPath("$.ordenes[0].estado").value("ent"));
    }

    @Test
    @DisplayName("Si el cliente no autoriza, la orden se cierra y se cobra solo el diagnóstico")
    void noAutoriza_cobraElDiagnostico() throws Exception {
        String[] cliente = clienteConCuenta();
        String codigo = crearOrden(crearEquipo(cliente[0]));
        postJson("/api/ordenes/" + codigo + "/diagnostico", admin,
                Map.of("diagnostico", "Tarjeta madre en corto, no es rentable", "costo", 450000), 200);

        JsonNode o = postJson("/api/ordenes/" + codigo + "/autorizacion", admin, Map.of("decision", "NO_AUTORIZA"), 200);

        assertThat(o.get("estado").asText()).isEqualTo("CERRADA_SOLO_DIAGNOSTICO");
        assertThat(o.get("montoCobrado").decimalValue()).isEqualByComparingTo("32000");
    }

    // ----- Seguridad (RNF-09, RNF-10) -------------------------------------------

    @Test
    @DisplayName("Sin sesión la API responde 401 y la sesión vacía es null")
    void sinSesion() throws Exception {
        mvc.perform(get("/api/estado")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Tu sesión terminó. Inicia sesión de nuevo."));
        mvc.perform(get("/api/auth/sesion")).andExpect(status().isOk())
                .andExpect(r -> assertThat(r.getResponse().getContentAsString()).isEqualTo("null"));
    }

    @Test
    @DisplayName("Una petición que modifica datos sin token CSRF se rechaza")
    void sinTokenCsrf() throws Exception {
        mvc.perform(post("/api/clientes").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Pedro Salazar\",\"usuario\":\"psalazar\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Un cliente no entra a los módulos de la administradora ni a datos de otro cliente (IDOR)")
    void aislamientoEntreClientes() throws Exception {
        String[] laura = clienteConCuenta();
        String[] otro = clienteConCuenta();
        String codigoDeOtro = crearOrden(crearEquipo(otro[0]));
        Cookie sesionLaura = login(laura[1], laura[2]);

        mvc.perform(get("/api/clientes").cookie(sesionLaura)).andExpect(status().isForbidden());
        mvc.perform(get("/api/portal/ordenes/" + codigoDeOtro).cookie(sesionLaura)).andExpect(status().isForbidden());
        mvc.perform(get("/api/portal/equipos").cookie(sesionLaura))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));

        JsonNode ordenDeOtro = leer(mvc.perform(get("/api/ordenes/" + codigoDeOtro).cookie(admin)).andReturn());
        String urlFoto = ordenDeOtro.get("evidencias").get(0).get("url").asText();
        mvc.perform(get(urlFoto).cookie(sesionLaura)).andExpect(status().isForbidden());
        mvc.perform(get(urlFoto).cookie(admin)).andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/png"));
    }

    @Test
    @DisplayName("Cinco intentos fallidos bloquean la cuenta 15 minutos (RNF-09)")
    void bloqueoPorIntentos() throws Exception {
        String[] cliente = clienteConCuenta();
        String malo = json.writeValueAsString(Map.of("usuario", cliente[1], "contrasena", "Equivocada1"));
        for (int i = 0; i < 4; i++) {
            mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(malo))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(malo))
                .andExpect(status().isLocked());
        // Ni con la contraseña correcta entra mientras dure el bloqueo
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("usuario", cliente[1], "contrasena", cliente[2]))))
                .andExpect(status().isLocked());
    }

    @Test
    @DisplayName("Validaciones: usuario repetido, periodo inválido y archivo que no es imagen")
    void validaciones() throws Exception {
        String[] cliente = clienteConCuenta();
        postJson("/api/clientes", admin, Map.of("nombre", "Otra Persona", "usuario", cliente[1]), 409);
        postJson("/api/equipos", admin, Map.of("idCliente", Long.valueOf(cliente[0]), "tipo", "Portátil",
                "marcaModelo", "HP 240 G8", "periodo", 5), 422);
        postJson("/api/clientes", admin, Map.of("nombre", "AB", "usuario", "nuevo_cliente"), 400);

        mvc.perform(multipart("/api/ordenes")
                .file(new MockMultipartFile("fotos", "virus.png", "image/png", "MZ no soy imagen".getBytes()))
                .param("idEquipo", crearEquipo(cliente[0])).param("falla", "No enciende el equipo")
                .param("recibio", "Gloria Rojas Rivera").with(csrf()).cookie(admin))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensaje").value("«virus.png» no es una imagen válida. Usa JPG o PNG de máximo 5 MB."));
    }

    @Test
    @DisplayName("Acta 5: usuario automático, quién recibe y entrega, y fotos de ingreso después")
    void cambiosDeLaReunion5() throws Exception {
        // El usuario se genera solo a partir del nombre; si ya existe, se numera
        JsonNode uno = postJson("/api/clientes", admin,
                Map.of("nombre", "María José Pérez Gómez", "telefono", "300 555 0111"), 201);
        JsonNode dos = postJson("/api/clientes", admin,
                Map.of("nombre", "Mario Pérez", "telefono", "300 555 0112"), 201);
        assertThat(uno.get("cliente").get("usuario").asText()).startsWith("mperez");
        assertThat(dos.get("cliente").get("usuario").asText()).startsWith("mperez")
                .isNotEqualTo(uno.get("cliente").get("usuario").asText());
        assertThat(uno.get("contrasenaTemporal").asText()).matches("[A-Za-z]{4}[2-9]{4}");

        String equipo = crearEquipo(uno.get("cliente").get("id").asText());

        // Quién recibe debe ser alguien de la tienda
        mvc.perform(multipart("/api/ordenes").param("idEquipo", equipo).param("falla", "No enciende el equipo")
                .with(csrf()).cookie(admin))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensaje").value("Elige quién recibió el equipo."));
        mvc.perform(multipart("/api/ordenes").param("idEquipo", equipo).param("falla", "No enciende el equipo")
                .param("recibio", "Pedro Pérez").with(csrf()).cookie(admin))
                .andExpect(status().isUnprocessableEntity());

        // Sin fotos de ingreso la orden se crea; se exigen antes del diagnóstico
        MvcResult r = mvc.perform(multipart("/api/ordenes").param("idEquipo", equipo)
                .param("falla", "No enciende el equipo").param("recibio", "gloria rojas rivera")
                .with(csrf()).cookie(admin))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.evidencias", hasSize(0)))
                .andExpect(jsonPath("$.recibioEquipo").value("Gloria Rojas Rivera"))
                .andReturn();
        String codigo = leer(r).get("codigo").asText();
        postJson("/api/ordenes/" + codigo + "/diagnostico", admin,
                Map.of("diagnostico", "Fuente de poder dañada", "costo", 95000), 422);
        mvc.perform(multipart("/api/ordenes/" + codigo + "/evidencias")
                .file(new MockMultipartFile("fotos", "ingreso.png", "image/png", PNG))
                .param("momento", "INGRESO").with(csrf()).cookie(admin))
                .andExpect(status().isCreated());
        postJson("/api/ordenes/" + codigo + "/diagnostico", admin,
                Map.of("diagnostico", "Fuente de poder dañada", "costo", 95000), 200);

        // La lista del personal llega a la interfaz de la administradora
        mvc.perform(get("/api/estado").cookie(admin))
                .andExpect(jsonPath("$.personal", hasSize(2)))
                .andExpect(jsonPath("$.personal[1]").value("Dichel Susana Rojas Rivera"));
    }

    @Test
    @DisplayName("La configuración solo la cambia la administradora")
    void configuracion() throws Exception {
        String[] cliente = clienteConCuenta();
        Cookie sesionCliente = login(cliente[1], cliente[2]);
        mvc.perform(put("/api/configuracion").with(csrf()).cookie(sesionCliente)
                .contentType(MediaType.APPLICATION_JSON).content("{\"umbral\":20}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/configuracion").with(csrf()).cookie(admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"color\":\"#1D4ED8\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.color").value("#1d4ed8"));
    }

    // ----- Otros módulos -----------------------------------------------------------------

    @Test
    @DisplayName("Clientes: búsqueda sin tildes con cuadro de mantenimiento, WhatsApp y restablecer contraseña")
    void gestionDeClientes() throws Exception {
        String[] cliente = clienteConCuenta();
        crearEquipo(cliente[0]);

        mvc.perform(get("/api/clientes").param("q", "GOMEZ").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.usuario == '" + cliente[1] + "')].mantenimientos").exists());
        mvc.perform(get("/api/clientes/" + cliente[0] + "/whatsapp").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enlace").value("https://wa.me/573205550198"));

        // El cliente pide ayuda desde el inicio de sesión y la administradora recibe el aviso
        postJson("/api/auth/solicitar-restablecimiento", admin, Map.of("usuario", cliente[1]), 202);
        mvc.perform(get("/api/notificaciones").cookie(admin))
                .andExpect(jsonPath("$[?(@.enlace == '/admin/clientes/" + cliente[0] + "')]").exists());

        JsonNode r = postJson("/api/clientes/" + cliente[0] + "/restablecer-contrasena", admin, Map.of(), 200);
        Cookie temporal = login(cliente[1], r.get("contrasenaTemporal").asText());
        mvc.perform(get("/api/auth/sesion").cookie(temporal))
                .andExpect(jsonPath("$.debeCambiarContrasena").value(true));
        postJson("/api/notificaciones/leer", admin, Map.of(), 204);
    }

    @Test
    @DisplayName("Equipos: historial, periodo, recordatorio por WhatsApp y portal del cliente")
    void equiposYMantenimientos() throws Exception {
        String[] cliente = clienteConCuenta();
        String equipo = crearEquipo(cliente[0]);

        // Sin servicio previo no hay fecha para recordar
        postJson("/api/equipos/" + equipo + "/recordatorio", admin, Map.of(), 422);

        String codigo = crearOrden(equipo);
        postJson("/api/ordenes/" + codigo + "/diagnostico", admin,
                Map.of("diagnostico", "Limpieza general y cambio de pasta", "costo", 70000), 200);
        postJson("/api/ordenes/" + codigo + "/autorizacion", admin, Map.of("decision", "AUTORIZA"), 200);
        mvc.perform(multipart("/api/ordenes/" + codigo + "/mantenimiento")
                .file(new MockMultipartFile("fotos", "salida.png", "image/png", PNG))
                .param("trabajo", "Limpieza interna y cambio de pasta térmica")
                .param("responsable", "Daniel Ortiz").with(csrf()).cookie(admin))
                .andExpect(status().isCreated());
        postJson("/api/ordenes/" + codigo + "/entrega", admin, Map.of("recibidoPor", "Laura Gómez", "entregadoPor", "Gloria Rojas Rivera"), 200);
        postJson("/api/ordenes/" + codigo + "/notas", admin, Map.of("texto", "Mensaje enviado por WhatsApp"), 201);

        mvc.perform(get("/api/equipos/" + equipo + "/historial").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoMantenimiento").value("VIGENTE"))
                .andExpect(jsonPath("$.ordenes", hasSize(1)));

        mvc.perform(put("/api/equipos/" + equipo + "/periodo").with(csrf()).cookie(admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"meses\":12}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("VIGENTE"));

        JsonNode rec = postJson("/api/equipos/" + equipo + "/recordatorio", admin, Map.of(), 201);
        assertThat(rec.get("enlace").asText()).startsWith("https://wa.me/573205550198?text=Hola%20Laura");
        assertThat(rec.get("mensaje").asText()).contains("PlayStation 5").doesNotContain("{");

        mvc.perform(get("/api/mantenimientos").param("estado", "VIGENTE").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idEquipo == " + equipo + ")].ultimoRecordatorio").exists());
        mvc.perform(get("/api/equipos/tipos").cookie(admin))
                .andExpect(jsonPath("$[-1]").value("Otros"));

        Cookie sesionCliente = login(cliente[1], cliente[2]);
        mvc.perform(get("/api/portal/equipos").cookie(sesionCliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].estadoMantenimiento").value("VIGENTE"));
        mvc.perform(get("/api/portal/equipos/" + equipo).cookie(sesionCliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ordenes[0].historial[0].usuario").doesNotExist());
    }

    @Test
    @DisplayName("Lista de precios en PDF: solo PDF, reemplaza la vigente y avisa a los clientes")
    void listaDePrecios() throws Exception {
        String[] cliente = clienteConCuenta();
        byte[] pdf = "%PDF-1.4\n%prueba\n".getBytes();

        mvc.perform(multipart("/api/lista-precios")
                .file(new MockMultipartFile("archivo", "lista.pdf", "application/pdf", PNG))
                .param("mes", "Octubre 2026").with(csrf()).cookie(admin))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(multipart("/api/lista-precios")
                .file(new MockMultipartFile("archivo", "lista-noviembre.pdf", "application/pdf", pdf))
                .param("mes", "Noviembre 2026").with(csrf()).cookie(admin))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mesTexto").value("Noviembre 2026"));

        Cookie sesionCliente = login(cliente[1], cliente[2]);
        mvc.perform(get("/api/lista-precios/vigente").cookie(sesionCliente))
                .andExpect(jsonPath("$.nombre").value("lista-noviembre.pdf"));
        mvc.perform(get("/api/lista-precios/vigente/archivo").param("descargar", "1").cookie(sesionCliente))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"));
        mvc.perform(get("/api/notificaciones").cookie(sesionCliente))
                .andExpect(jsonPath("$[0].titulo").value("Ya está la lista de precios de Noviembre 2026"));
    }

    @Test
    @DisplayName("Foto de perfil: el cliente ve la suya y la de la tienda, no la de otros clientes")
    void fotoDePerfil() throws Exception {
        String[] laura = clienteConCuenta();
        String[] otro = clienteConCuenta();
        Cookie sesionLaura = login(laura[1], laura[2]);
        Cookie sesionOtro = login(otro[1], otro[2]);

        JsonNode foto = leer(mvc.perform(multipart("/api/cuenta/foto")
                .file(new MockMultipartFile("foto", "yo.png", "image/png", PNG))
                .with(csrf()).cookie(sesionOtro))
                .andExpect(status().isOk()).andReturn());
        String url = foto.get("url").asText().split("\\?")[0];

        mvc.perform(get(url).cookie(sesionOtro)).andExpect(status().isOk());
        mvc.perform(get(url).cookie(sesionLaura)).andExpect(status().isForbidden());
        mvc.perform(get("/api/estado").cookie(sesionOtro))
                .andExpect(jsonPath("$.fotoCliente").value(url));
    }

    @Test
    @DisplayName("Alertas automáticas de mantenimiento (RF-10)")
    void alertasDeMantenimiento(@Autowired MantenimientoService servicio) {
        int[] r = servicio.evaluarAlertas();
        assertThat(r).hasSize(2);
        assertThat(r[0]).isGreaterThanOrEqualTo(0);
    }
}
