package co.tecnihardware.st.config;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;

import javax.imageio.ImageIO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import co.tecnihardware.st.model.Autorizacion;
import co.tecnihardware.st.model.CambioEstado;
import co.tecnihardware.st.model.Cliente;
import co.tecnihardware.st.model.DecisionCliente;
import co.tecnihardware.st.model.Equipo;
import co.tecnihardware.st.model.EstadoOrden;
import co.tecnihardware.st.model.Evidencia;
import co.tecnihardware.st.model.Mantenimiento;
import co.tecnihardware.st.model.MomentoEvidencia;
import co.tecnihardware.st.model.OrdenServicio;
import co.tecnihardware.st.model.Rol;
import co.tecnihardware.st.model.TipoAutorizacion;
import co.tecnihardware.st.model.Usuario;
import co.tecnihardware.st.repository.ClienteRepository;
import co.tecnihardware.st.repository.EquipoRepository;
import co.tecnihardware.st.repository.OrdenServicioRepository;
import co.tecnihardware.st.repository.TipoEquipoRepository;
import co.tecnihardware.st.repository.UsuarioRepository;
import co.tecnihardware.st.service.ArchivoService;

/**
 * Perfil «demo»: carga clientes, equipos y órdenes de ejemplo (los del prototipo validado
 * en el Acta 4) para presentar el sistema. Solo actúa si la base no tiene clientes.
 * <pre>mvn spring-boot:run -Dspring-boot.run.profiles=h2,demo</pre>
 * Cuentas: admin / Tecni2026 · cmendoza / Carlos2026 · nuevo / Temporal1 (primer ingreso).
 */
@Component
@Profile("demo")
@Order(2)
public class DatosDemo implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatosDemo.class);
    private static final String GLORIA = "Gloria Rojas Rivera";
    private static final String DICHEL = "Dichel Susana Rojas Rivera";

    private final UsuarioRepository usuarios;
    private final ClienteRepository clientes;
    private final EquipoRepository equipos;
    private final TipoEquipoRepository tipos;
    private final OrdenServicioRepository ordenes;
    private final ArchivoService archivos;
    private final PasswordEncoder encoder;
    private final Clock reloj;

    private Usuario admin;
    private LocalDateTime ahora;

    public DatosDemo(UsuarioRepository usuarios, ClienteRepository clientes, EquipoRepository equipos,
            TipoEquipoRepository tipos, OrdenServicioRepository ordenes, ArchivoService archivos,
            PasswordEncoder encoder, Clock reloj) {
        this.usuarios = usuarios;
        this.clientes = clientes;
        this.equipos = equipos;
        this.tipos = tipos;
        this.ordenes = ordenes;
        this.archivos = archivos;
        this.encoder = encoder;
        this.reloj = reloj;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (clientes.count() > 0) {
            return;
        }
        ahora = LocalDateTime.now(reloj);
        LocalDate hoy = ahora.toLocalDate();
        admin = usuarios.findByRolAndActivoTrue(Rol.ADMINISTRADOR).get(0);
        admin.cambiarContrasena(encoder.encode("Tecni2026"));

        Cliente carlos = cliente("cmendoza", "Carlos2026", "Carlos Mendoza", "1090456781", "3105550142", false);
        Cliente laura = cliente("lgomez", "Cliente2026", "Laura Gómez", null, "3205550198", false);
        Cliente andres = cliente("apena", "Cliente2026", "Andrés Peña", "88214567", "3155550177", false);
        Cliente marta = cliente("mruiz", "Cliente2026", "Marta Ruiz", "37556902", "3005550123", false);
        Cliente julian = cliente("jtorres", "Cliente2026", "Julián Torres", "1093778120", null, false);
        Cliente sofia = cliente("scastillo", "Cliente2026", "Sofía Castillo", "1098334210", "3175550109", false);
        cliente("nuevo", "Temporal1", "Cliente Nuevo", null, "3015550100", true);

        Equipo lenovo = equipo(carlos, "Portátil", "Lenovo IdeaPad 3 15ITL6", "PF3K9X2", "Teclado con tecla Ñ desgastada", 6);
        Equipo epson = equipo(carlos, "Impresora", "Epson EcoTank L3250", "X5SK019", "Uso doméstico", 12);
        equipo(carlos, "PC de escritorio", "Ensamblado Ryzen 5 5600G", null, "Equipo de oficina", null);
        Equipo hp = equipo(laura, "Portátil", "HP 240 G8", "5CD1234XY", "", 6);
        Equipo prodesk = equipo(andres, "PC de escritorio", "HP ProDesk 400 G6", "MXL0429K", "", 12);
        Equipo epson2 = equipo(marta, "Impresora", "Epson EcoTank L4260", "X8GA221", "", 12);
        Equipo asus = equipo(julian, "Portátil", "Asus Vivobook 15", "N3NRKD01", "", 6);
        Equipo aio = equipo(sofia, "Todo en uno", "Lenovo IdeaCentre AIO 3", "S1N0K9PA", "", 12);
        Equipo dell = equipo(sofia, "Portátil", "Dell Inspiron 15 3520", "DL7H2Q3", "", 6);

        // Servicios anteriores (dan el semáforo de mantenimiento: vencido, próximo, vigente)
        entregada(epson, hoy.minusMonths(11).minusDays(20), "Imprime con rayas.",
                "Limpieza de cabezal y cambio de almohadillas.", "45000");
        entregada(hp, hoy.minusMonths(7), "Mantenimiento preventivo.",
                "Limpieza interna, cambio de pasta térmica.", "70000");
        entregada(dell, hoy.minusMonths(2), "Teclado no responde.", "Cambio de teclado.", "150000");

        // Órdenes en curso, una por cada estado del RF-18
        OrdenServicio diag = abrir(lenovo, hoy.minusDays(2), "Se apaga solo y calienta mucho.");
        foto(diag, MomentoEvidencia.INGRESO, null);

        OrdenServicio pend = abrir(prodesk, hoy.minusDays(4), "Lento al encender, ruido en el disco.");
        foto(pend, MomentoEvidencia.INGRESO, null);
        diagnosticar(pend, "Disco duro con sectores dañados. Se recomienda cambio a SSD de 480 GB.", "180000");

        OrdenServicio aut = abrir(asus, hoy.minusDays(8), "Bisagra izquierda rota.");
        foto(aut, MomentoEvidencia.INGRESO, null);
        diagnosticar(aut, "Bisagra izquierda partida, carcasa sana. Cambio de bisagra y mantenimiento.", "210000");
        autorizar(aut);
        foto(aut, MomentoEvidencia.PROCESO, "Carcasa abierta: bisagra izquierda partida en el anclaje.");

        OrdenServicio espera = abrir(aio, hoy.minusDays(6), "Pantalla con líneas verticales.");
        foto(espera, MomentoEvidencia.INGRESO, null);
        diagnosticar(espera, "Cable flex de la pantalla deteriorado. Cambio de flex.", "95000");
        autorizar(espera);
        espera.getAutorizaciones().add(new Autorizacion(espera, TipoAutorizacion.ADICIONAL,
                "Al revisar se encontró el ventilador con ruido. Cambio de ventilador.", new BigDecimal("60000"), ahora));
        paso(espera, EstadoOrden.EN_ESPERA_AUTORIZACION_ADICIONAL, "Nueva falla · +$60.000");

        OrdenServicio cerrada = abrir(epson2, hoy.minusDays(9), "Imprime con manchas.");
        foto(cerrada, MomentoEvidencia.INGRESO, null);
        diagnosticar(cerrada, "Almohadillas saturadas y cabezal sucio. Lavado y limpieza.", "65000");
        cerrada.autorizacionInicial().ifPresent(a -> a.responder(DecisionCliente.NO_AUTORIZA, ahora));
        cerrada.setFechaEntrega(hoy.minusDays(7));
        cerrada.setMontoCobrado(new BigDecimal("32000"));
        paso(cerrada, EstadoOrden.CERRADA_SOLO_DIAGNOSTICO, "El cliente no autorizó · se cobra el diagnóstico general");

        log.info("Datos de demostración cargados");
    }

    private Cliente cliente(String usuario, String clave, String nombre, String cedula, String tel, boolean temporal) {
        Usuario u = new Usuario(usuario, encoder.encode(clave), Rol.CLIENTE, nombre, ahora);
        if (!temporal) {
            u.cambiarContrasena(u.getContrasenaHash());
        }
        usuarios.save(u);
        return clientes.save(new Cliente(u, cedula, tel, ahora.toLocalDate().minusMonths(6)));
    }

    private Equipo equipo(Cliente c, String tipo, String nombre, String serial, String nota, Integer periodo) {
        Equipo e = new Equipo(c, nombre, ahora);
        e.asignarTipo(tipos.findByNombreIgnoreCase(tipo).orElse(null), tipo);
        e.setSerial(serial);
        e.setObservaciones(nota);
        e.setPeriodoMantenimientoMeses(periodo);
        return equipos.save(e);
    }

    private OrdenServicio abrir(Equipo e, LocalDate ingreso, String falla) {
        OrdenServicio o = OrdenServicio.abrir(e, falla, ingreso, admin, ingreso.atTime(9, 0));
        o.setRecibioEquipo(e.getId() % 2 == 0 ? DICHEL : GLORIA);
        return ordenes.save(o);
    }

    private void diagnosticar(OrdenServicio o, String diagnostico, String costo) {
        BigDecimal c = new BigDecimal(costo);
        o.setDiagnostico(diagnostico);
        o.setCostoEstimado(c);
        o.getAutorizaciones().add(new Autorizacion(o, TipoAutorizacion.INICIAL, null, c, ahora));
        paso(o, EstadoOrden.PENDIENTE_AUTORIZACION, "Diagnóstico registrado");
    }

    private void autorizar(OrdenServicio o) {
        o.autorizacionInicial().ifPresent(a -> a.responder(DecisionCliente.AUTORIZA, ahora));
        paso(o, EstadoOrden.AUTORIZADA, "El cliente autorizó por WhatsApp");
    }

    /** Servicio ya entregado en una fecha pasada (carga histórica, sin pasar por cada estado). */
    private void entregada(Equipo e, LocalDate ingreso, String falla, String trabajo, String costo) {
        OrdenServicio o = abrir(e, ingreso, falla);
        BigDecimal c = new BigDecimal(costo);
        o.setDiagnostico(trabajo);
        o.setCostoEstimado(c);
        Autorizacion a = new Autorizacion(o, TipoAutorizacion.INICIAL, null, c, ingreso.atTime(10, 0));
        a.responder(DecisionCliente.AUTORIZA, ingreso.atTime(11, 0));
        o.getAutorizaciones().add(a);
        Mantenimiento m = new Mantenimiento(o, trabajo, admin.getNombre(), ingreso.plusDays(1));
        o.setMantenimiento(m);
        o.setFechaEntrega(ingreso.plusDays(2));
        o.setRecibidoPor(e.getCliente().getNombre());
        o.setEntregoEquipo(GLORIA);
        o.setMontoCobrado(c);
        o.getHistorial().add(new CambioEstado(o, EstadoOrden.EN_DIAGNOSTICO, EstadoOrden.ENTREGADA,
                "Recibido por " + e.getCliente().getNombre(), admin, ingreso.plusDays(2).atTime(17, 0)));
        o.forzarEstadoHistorico(EstadoOrden.ENTREGADA);
    }

    private void paso(OrdenServicio o, EstadoOrden estado, String obs) {
        o.cambiarEstado(estado, obs, admin, ahora);
    }

    private void foto(OrdenServicio o, MomentoEvidencia momento, String nota) {
        byte[] png = imagenEjemplo(momento);
        String ruta = archivos.guardar("evidencias/" + o.getId(), png, ArchivoService.Tipo.PNG);
        o.getEvidencias().add(new Evidencia(o, momento, ruta, "image/png", png.length, nota, ahora));
    }

    /**
     * Imagen de marcador para las fotos de ejemplo: un equipo dibujado con figuras
     * (sin texto, para no depender de las fuentes instaladas en el servidor).
     */
    private static byte[] imagenEjemplo(MomentoEvidencia momento) {
        BufferedImage img = new BufferedImage(640, 480, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(new Color(0xF3, 0xF1, 0xF4));
        g.fillRect(0, 0, 640, 480);
        Color acento;
        if (momento == MomentoEvidencia.INGRESO) {
            acento = new Color(0x2B, 0x6C, 0xB0);
        } else if (momento == MomentoEvidencia.PROCESO) {
            acento = new Color(0xD9, 0x7B, 0x06);
        } else {
            acento = new Color(0x2F, 0x85, 0x5A);
        }
        g.setColor(acento);
        g.fillRect(0, 0, 640, 14);
        g.setColor(new Color(0x3A, 0x3A, 0x48));
        g.fillRoundRect(170, 120, 300, 190, 18, 18);
        g.setColor(new Color(0xDD, 0xE3, 0xEA));
        g.fillRect(186, 136, 268, 158);
        g.setColor(new Color(0x3A, 0x3A, 0x48));
        g.fillRoundRect(130, 310, 380, 26, 12, 12);
        g.setColor(acento);
        g.fillOval(300, 195, 40, 40);
        g.dispose();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(img, "png", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
