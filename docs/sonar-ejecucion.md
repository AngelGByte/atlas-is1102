# Ejecución de SonarQube / SonarCloud

## Estado de SonarCloud y SonarQube local

No se ejecutó SonarScanner local: el servicio local respondió `UP` (SonarQube
26.10.0.133078), pero no había token ni credenciales administrativas y no se intentaron
contraseñas predeterminadas. Sin embargo, la integración automática de SonarCloud sí
analizó el [PR #1](https://github.com/AngelGByte/atlas-is1102/pull/1), commit
`52e78543e63c2ca3074d5c0da6eb627e8fea7852`, el 2026-11-21. El check de SonarCloud está en
<https://sonarcloud.io/dashboard?id=AngelGByte_atlas-is1102&pullRequest=1>.
El Quality Gate terminó `ERROR`, Security Rating C (valor 3), con cinco hallazgos abiertos
en código nuevo: tres de severidad media en `.github/workflows/ci.yml` (instalación sin
`--ignore-scripts` y uso de `npx`) y dos de severidad baja por búsqueda de ejecutables vía
`PATH` en `scripts/backup-restore-test.js`. El reporte API está en
[`evidencias/cierre/CIERRE-02-sonar-pr-1-pre-correccion-2026-11-21.json`](./evidencias/cierre/CIERRE-02-sonar-pr-1-pre-correccion-2026-11-21.json).

En esa revisión del PR no aparecieron hallazgos sobre credenciales predeterminadas en
`docker-compose.yml` ni sobre el `Dockerfile`; sí se detectó una instalación `npm ci` del
workflow que no restringía scripts. Se actualizó el workflow para usar `npm ci
--ignore-scripts` y el binario local de Playwright. Los dos hallazgos de `PATH` corresponden
a nombres de utilidades fijos en un script local de backup, sin control del ejecutable por
entrada del usuario; se dejó la justificación junto a las llamadas. La reejecución de
SonarCloud sobre el commit con estas correcciones queda pendiente y no se declara resuelta
hasta consultar el nuevo resultado.

El workflow de CI incluye un job propio que informa `Sonar: OMITIDO` cuando faltan secretos.
Ese job verde solo significa que se informó la omisión; no sustituye el check independiente
de SonarCloud ni su Quality Gate.

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
