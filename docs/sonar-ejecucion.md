# Ejecución de SonarQube / SonarCloud

## Estado actualizado (2026-11-22)

La organización gratuita `angelgbyte` y el proyecto público `AngelGByte_atlas-is1102`
ya existen y están vinculados al repositorio GitHub. SonarCloud ejecutó análisis
automático de `main` para el commit `a97a8c8146a775fbf0282c4acb55d80c19fbc568`
(2026-11-22T02:32:08Z). El Quality Gate fue `ERROR`, con 7 vulnerabilidades abiertas
(1 blocker, 3 altas, 2 medias y 1 baja). El reporte real de API y su resumen están en
[`evidencias/final/CIERRE-10-sonar-baseline-2026-11-22.json`](./evidencias/final/CIERRE-10-sonar-baseline-2026-11-22.json)
y [`evidencias/final/CIERRE-10-sonar-baseline-2026-11-22.txt`](./evidencias/final/CIERRE-10-sonar-baseline-2026-11-22.txt).
Las correcciones actuales aún no se han vuelto a analizar; no se declara resuelto el
Quality Gate hasta obtener el resultado posterior al commit.

La integración automática con GitHub App ya analiza el proyecto y no requiere un
`SONAR_TOKEN`. El job manual `sonar` del workflow se omite si faltan secretos; su estado
`success` solo confirma que informó la omisión y no equivale a un Quality Gate. El último
run de Actions de `main`, commit `a97a8c8`, es
[#44976541160](https://github.com/AngelGByte/atlas-is1102/actions/runs/44976541160);
sus pasos manuales de Sonar quedaron omitidos, mientras que SonarCloud produjo el análisis
automático independiente.

SonarQube local respondió `UP` (26.10.0.133078), pero no se ejecutó SonarScanner local:
no había token ni credenciales administrativas disponibles y no se probaron contraseñas
predeterminadas. No se generó token ni se añadieron secretos a GitHub; la vista de tokens
no ofreció un formulario utilizable en esta sesión. Esto no bloquea el análisis automático
de SonarCloud, pero sí deja omitido el job manual del workflow.

### Antecedente: análisis del PR #1 (2026-11-21)

El análisis histórico de
[#1](https://github.com/AngelGByte/atlas-is1102/pull/1), commit
`52e78543e63c2ca3074d5c0da6eb627e8fea7852`, terminó `ERROR`, Security Rating C, con cinco
hallazgos de código nuevo. No encontró credenciales predeterminadas en `docker-compose.yml`
ni problemas en el `Dockerfile`; sí señaló una instalación `npm ci` sin `--ignore-scripts`
y dos búsquedas de ejecutables vía `PATH`. El reporte está en
[`evidencias/cierre/CIERRE-02-sonar-pr-1-pre-correccion-2026-11-21.json`](./evidencias/cierre/CIERRE-02-sonar-pr-1-pre-correccion-2026-11-21.json).
No debe confundirse con el análisis actual de `main`.

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
2. Seleccione el proyecto existente con la clave `AngelGByte_atlas-is1102` (o ajuste `sonar.projectKey` en
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
   npm.cmd ci --ignore-scripts
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
aprobado (`.github/workflows/ci.yml`, job `sonar`). En este PR el job propio informó la
omisión, pero SonarCloud ejecutó además su integración automática y publicó un check
independiente con Quality Gate fallido. Una vez que se complete la nueva revisión de los
cambios, conserve el enlace real del check y su respuesta API junto con el Quality Gate.
