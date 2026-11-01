@echo off
rem ---------------------------------------------------------------------------
rem  Maven sin instalar nada (Windows). La primera vez descarga Apache Maven en
rem  %USERPROFILE%\.m2\wrapper y despues lo reutiliza. Requiere Java 17 o superior.
rem  Uso en PowerShell:  .\mvnw.cmd test
rem                      .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=h2,demo"
rem ---------------------------------------------------------------------------
setlocal
set "MAVEN_VERSION=3.9.9"
set "WRAPPER_DIR=%USERPROFILE%\.m2\wrapper"
set "MAVEN_HOME=%WRAPPER_DIR%\apache-maven-%MAVEN_VERSION%"
set "MAVEN_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MAVEN_VERSION%/apache-maven-%MAVEN_VERSION%-bin.zip"

if not defined JAVA_HOME (
  where java >nul 2>nul
  if errorlevel 1 goto sinJava
)

if exist "%MAVEN_HOME%\bin\mvn.cmd" goto ejecutar

echo Descargando Apache Maven %MAVEN_VERSION% ^(solo la primera vez^)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; New-Item -ItemType Directory -Force -Path $env:WRAPPER_DIR | Out-Null; $zip=Join-Path $env:WRAPPER_DIR 'maven.zip'; Invoke-WebRequest -UseBasicParsing -Uri $env:MAVEN_URL -OutFile $zip; Expand-Archive -Force -Path $zip -DestinationPath $env:WRAPPER_DIR; Remove-Item $zip"
if errorlevel 1 (
  echo No se pudo descargar Maven. Revisa la conexion a internet e intentalo de nuevo.
  exit /b 1
)

:ejecutar
"%MAVEN_HOME%\bin\mvn.cmd" %*
exit /b %ERRORLEVEL%

:sinJava
echo No se encontro Java. Instala el JDK 17 con:
echo     winget install EclipseAdoptium.Temurin.17.JDK
echo y luego cierra y vuelve a abrir la terminal.
exit /b 1
