# Imagen de producción para el servidor de Oracle Cloud (Reunión 7 · recomendación del docente).
# GitHub Actions compila el JAR (frontend incluido) y esta imagen solo lo empaqueta, para
# poder construirla para Intel/AMD (amd64) y para las máquinas Ampere de Oracle (arm64).
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN groupadd --system spring && useradd --system --gid spring spring \
    && mkdir -p /var/lib/tecnihardware/archivos /app/logs \
    && chown -R spring:spring /var/lib/tecnihardware /app
USER spring
COPY target/servicio-tecnico.jar app.jar
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod \
    TZ=America/Bogota \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -Xss512k"
ENTRYPOINT ["java", "-jar", "app.jar"]
