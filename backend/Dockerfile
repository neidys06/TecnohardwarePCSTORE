# Imagen de la aplicación: construcción en dos etapas.
# El frontend compilado ya está versionado en src/main/resources/static y queda dentro del JAR.
# Si se cambia la interfaz, recompilarla antes en la raíz del proyecto:  npm run build:api

# ── Etapa 1: compilación ─────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q clean package -DskipTests

# ── Etapa 2: imagen de producción ───────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring \
    && mkdir -p /var/lib/tecnihardware/archivos /app/logs \
    && chown -R spring:spring /var/lib/tecnihardware /app
USER spring
COPY --from=builder /app/target/servicio-tecnico.jar app.jar
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod \
    TZ=America/Bogota \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1"
ENTRYPOINT ["java", "-jar", "app.jar"]
