package co.tecnihardware.st.service;

import java.security.SecureRandom;

import org.springframework.stereotype.Component;

/** Contraseñas temporales legibles: 4 letras y 4 números, sin caracteres confusos (l, I, O, 0, 1). */
@Component
public class GeneradorContrasena {

    private static final String LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
    private static final String DIGITOS = "23456789";

    private final SecureRandom azar = new SecureRandom();

    public String temporal() {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 4; i++) {
            sb.append(LETRAS.charAt(azar.nextInt(LETRAS.length())));
        }
        for (int i = 0; i < 4; i++) {
            sb.append(DIGITOS.charAt(azar.nextInt(DIGITOS.length())));
        }
        return sb.toString();
    }

    /** RF-17 · Regla de la contraseña propia: al menos 8 caracteres y un número. */
    public static boolean esValida(String clave) {
        return clave != null && clave.length() >= 8 && clave.length() <= 72 && clave.chars().anyMatch(Character::isDigit);
    }
}
