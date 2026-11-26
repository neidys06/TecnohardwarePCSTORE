package co.tecnihardware.st.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Cuenta única del cliente (Acta 6): todas sus órdenes que aún no se han entregado ni
 * cerrado, con el valor de cada una y el total a pagar. Las órdenes sin diagnóstico todavía
 * no tienen valor y se cuentan aparte en {@code porDefinir}.
 */
public record CuentaClienteDTO(Long idCliente, String cliente, List<Item> ordenes, BigDecimal total,
        int porDefinir, int listasParaEntregar) {

    public record Item(String codigo, String equipo, String estado, String estadoTexto, BigDecimal valor) {
    }
}
