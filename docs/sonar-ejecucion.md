# Ejecución de SonarQube / SonarCloud

## Estado de esta rama

**No ejecutado por el agente; requiere ejecución humana.** El 2026-11-21 el servicio
local respondió `UP` (SonarQube 26.10.0.133078), pero no se encontraron variables
locales `SONAR_*`, secretos Sonar configurados en GitHub ni credenciales administrativas
para crear un token. No se intentaron contraseñas predeterminadas. El análisis sigue
bloqueado y no existe Quality Gate nuevo. La verificación del servicio y el bloqueo
están en [`final/B2-sonar-2026-11-21.txt`](./evidencias/final/B2-sonar-2026-11-21.txt).
El workflow de CI debe informar la omisión en su resumen; un job verde sin escáner no es
un Quality Gate.

El archivo [`sonar-project.properties`](../sonar-project.properties) está preparado y
apunta a `coverage/lcov.info`. No hay resultados de issues, métricas ni Quality Gate
nuevos que se puedan atribuir a esta ejecución. Los resultados históricos de
`docs/resultados-validacion.md` no sustituyen un análisis de esta revisión.

## Configuración requerida

Defina fuera del repositorio los valores reales como secretos de GitHub Actions o
variables efímeras del entorno de ejecución:

| Variable / secreto | Requerido | Uso |
|---|---|---|
| `SONAR_HOST_URL` | Sí | URL del servidor SonarQube o `https://sonarcloud.io`. |
| `SONAR_TOKEN` | Sí | Token de análisis; no imprimirlo ni incluirlo en argumentos versionados. |
| `SONAR_PROJECT_KEY` | Sí | Clave del proyecto autorizada en el servidor. |
| `SONAR_ORGANIZATION` | SonarCloud | Organización propietaria del proyecto SonarCloud. |

Para un análisis local de SonarQube se requiere además el servicio iniciado y accesible,
JDK y SonarScanner compatibles. Para SonarCloud se requiere el proyecto creado y
permisos del token. No use credenciales de evaluación ni datos reales.

## Preparación manual del proyecto y del token

1. En SonarQube Server, solicite al responsable del servicio una cuenta autorizada y
   confirme la URL. En SonarCloud, cree o seleccione la organización correspondiente.
   No pruebe credenciales predeterminadas.
2. Cree el proyecto con la clave `atlas-is1102` (o ajuste `sonar.projectKey` en
   `sonar-project.properties` y `SONAR_PROJECT_KEY` en conjunto). El proyecto debe
   permitir analizar la rama y revisión que se va a cerrar.
3. Desde el perfil autorizado, genere un token de análisis de proyecto. Guárdelo
   directamente como el secreto `SONAR_TOKEN`; no lo copie a archivos, argumentos
   guardados, capturas ni salida de consola.
4. En GitHub, abra **Settings → Secrets and variables → Actions** y cree los secretos
   `SONAR_HOST_URL`, `SONAR_TOKEN` y `SONAR_PROJECT_KEY`. Para SonarCloud agregue también
   `SONAR_ORGANIZATION`. El workflow usa la omisión explícita si falta algún valor
   requerido; la omisión no es un Quality Gate aprobado.

## Ejecución reproducible en PowerShell

1. Levante PostgreSQL de pruebas y configure `TEST_DATABASE_URL`, `DATABASE_URL`,
   `JWT_SECRET`, `DATA_ENCRYPTION_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en la
   sesión; no guarde sus valores en archivos versionados.
2. Ejecute:

   ```powershell
   npm.cmd ci
   npm.cmd run test:coverage
   Test-Path .\coverage\lcov.info
   ```

3. Configure `SONAR_HOST_URL`, `SONAR_TOKEN` y `SONAR_PROJECT_KEY` en el entorno. Para
   SonarCloud configure también `SONAR_ORGANIZATION`. Use el token mediante la variable
   `SONAR_TOKEN`; no lo copie a la línea de comandos ni al log.
4. Desde la raíz del repositorio ejecute:

   ```powershell
   $sonarArgs = @(
     "-Dsonar.host.url=$env:SONAR_HOST_URL",
     "-Dsonar.projectKey=$env:SONAR_PROJECT_KEY",
     "-Dsonar.javascript.lcov.reportPaths=coverage/lcov.info"
   )
   if ($env:SONAR_HOST_URL -eq 'https://sonarcloud.io') {
     $sonarArgs += "-Dsonar.organization=$env:SONAR_ORGANIZATION"
   }
   sonar-scanner @sonarArgs
   ```

   En SonarQube Server se omite `sonar.organization`. SonarScanner lee `SONAR_TOKEN`
   desde el entorno.
5. En el proyecto, revise el Quality Gate, métricas e issues de seguridad. Exporte la
   respuesta de `api/issues/search`, `api/measures/component` y
   `api/qualitygates/project_status` usando un cliente HTTP que lea el token desde el
   entorno sin imprimirlo ni incorporarlo a la línea de comandos persistida.
6. Registre fecha, commit, URL del proyecto, resultados y los JSON exportados en
   `docs/evidencias/cierre/`. Revise específicamente las reglas asociadas a credenciales
   por defecto y `npm ci --ignore-scripts`. No declare que los hallazgos desaparecieron
   hasta comprobar el análisis de la revisión actual.

## CI

El workflow de GitHub Actions ya incluye un paso de resumen que muestra `Sonar: OMITIDO`,
enumera los secretos faltantes y aclara que la omisión no equivale a un Quality Gate
aprobado (`.github/workflows/ci.yml`, job `sonar`). La revisión de código confirma que
el paso existe; no sustituye una ejecución nueva. Una vez creados los secretos, revise la
ejecución y conserve el enlace real del run junto con el Quality Gate.
