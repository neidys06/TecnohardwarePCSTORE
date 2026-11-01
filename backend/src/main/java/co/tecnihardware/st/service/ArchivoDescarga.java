package co.tecnihardware.st.service;

/** Archivo leído del almacenamiento para enviarlo al navegador. */
public record ArchivoDescarga(byte[] datos, String tipoMime, String nombre) {
}
