# Sistema de Gestión Atlas

Aplicación web de demostración para la gestión de clientes, contratos, referencias documentales, usuarios y auditoría. Está construida como proyecto de laboratorio para ISY1102 y toma como base el primer encargo de Atlas (React/Express/PostgreSQL descrito en ese documento). Este proyecto usa frontend estático servido por Express, API REST en Express y PostgreSQL.

## Qué incluye

- Inicio de sesión con contraseñas bcrypt, JWT de corta duración y limitación de intentos.
- Roles `admin`, `editor` y `viewer`: solo `admin` puede crear, modificar o eliminar; los otros roles tienen acceso de lectura.
- Gestión de clientes, contratos y documentos (el documento almacena metadatos/referencias, no carga archivos).
- Cifrado AES-256-GCM de datos personales del cliente y cuenta bancaria en reposo; la API expone solo los últimos cuatro dígitos de la cuenta.
- Consultas SQL parametrizadas, validación de datos, registro transaccional de cambios críticos y controles de acceso en backend.
- Interfaz adaptable, etiquetas de formulario y renderizado de contenido mediante nodos de texto para evitar ejecutar entradas como HTML.
- Pruebas unitarias e integración, cobertura LCOV para SonarQube, Docker Compose y matriz inicial de casos en [`docs/casos-prueba.md`](./docs/casos-prueba.md).

## Listado paginado de clientes

`GET /api/clients` conserva el cuerpo JSON como arreglo y devuelve 50 registros por defecto
(máximo 200). Use `?limit=50&page=1` o `?limit=50&offset=0`; `page` y `offset` no se combinan.
Los valores inválidos responden 400. La respuesta expone `X-Total-Count`, `X-Page`,
`X-Limit`, `X-Offset` y `X-Total-Pages`.

El listado contiene solo los campos de su vista (`id`, `name`, `company`, `rut`, `email`,
`phone`, `riskLevel`, `status`, `bankAccountLast4` y `blocked`); `notes` y las fechas ya no
se incluyen para evitar descifrado y transferencia de datos que no usa la tabla. Para obtener
el registro completo, incluidos `notes` y fechas, use `GET /api/clients/:id`. Los clientes
bloqueados solo son visibles por identificador para administradores. La interfaz solicita el
detalle al abrir el formulario de edición. El listado calcula el total con `COUNT(*) OVER()`;
una página vacía fuera del rango conserva el total mediante una consulta de respaldo.
`PG_POOL_MAX` configura el pool de PostgreSQL (predeterminado 10, rango 1–100).

## Cierre EP5 - última verificación local (2026-11-21)

Regresión ejecutada contra PostgreSQL 16 aislado: Node 9/9, cero omitidas; Vitest 4/4;
seguridad dinámica 19/19; cobertura c8 83.50 % statements/lines, 82.15 % branches y
88.46 % functions. Los comandos, salidas y códigos se conservan en
[`docs/evidencias/cierre/CIERRE-05-regresion-reintento-2026-11-21.txt`](./docs/evidencias/cierre/CIERRE-05-regresion-reintento-2026-11-21.txt).
Las cifras de cobertura anteriores corresponden a ejecuciones previas y no sustituyen esta
medición.

Las corridas de carga de CIERRE-05 usaron una página de 50 clientes, 500 clientes sintéticos
más 2 de demostración, un login por corrida, 30 s de rampa y 60 s sostenidos. JMeter utilizó
HttpClient4 con keep-alive y terminó sin errores de conexión en ambas cargas:

| Herramienta | Usuarios | Solicitudes | P95 | P99 | Errores | Throughput | CPU app (% de un núcleo) | Código |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| k6 | 50 VU | 4,448 | 56.09 ms | 108.32 ms | 0 | 36.95 req/s | 30.6 % | 0 |
| k6 | 200 VU | 10,343 | 1.73 s | 2.07 s | 0 | 85.66 req/s | 82.9 % | 99 por umbral P95 |
| JMeter | 50 | 3,633 | 63 ms | 266 ms | 0 | 40.3 req/s | 33.6 % | 0 |
| JMeter | 200 | 10,639 | 1,104 ms | 1,391 ms | 0 | 117.7 req/s | 87.5 % | 0 |

El umbral P95 <300 ms se cumple a 50 y no se cumple a 200 usuarios. 50 es el nivel probado
que cumple; no se midieron niveles intermedios ni se afirma que sea la capacidad máxima. El
máximo HTTP de k6 a 200 fue 2.23 s, no reproduce el máximo histórico de 4.64 s. La telemetría
registró espera del pool y pausas GC durante las corridas, pero no demuestra causalidad; la
causa del máximo histórico sigue indeterminada. Se comparó pool 10 y 20 en una corrida por
configuración; pool 20 empeoró P95 y se conservó el valor predeterminado 10. Los 500 clientes
sintéticos se limpiaron después de comprobar que no tenían contratos asociados.

La medición previa de accesibilidad fue Playwright/axe 9/9 en 1280x800, 390x844 y 320x700.
TLS pasó 3/3 en Caddy de laboratorio; la restauración de respaldo se verificó con conteos y
hash. Trivy 0.76.2 encontró 0 HIGH y 0 CRITICAL en la imagen analizada (4 LOW, 7 MEDIUM).
SonarScanner local no se ejecutó por falta de credenciales. SonarCloud sí analizó
automáticamente el PR #1 y el primer Quality Gate falló (Security Rating C); el resultado
pre-corrección está documentado y la re-evaluación de los cambios al workflow está pendiente.
El último run disponible de Actions citado previamente,
[44948089169](https://github.com/AngelGByte/atlas-is1102/actions/runs/44948089169), valida
el commit `8040a2d`, no los commits posteriores de CIERRE-04 a CIERRE-06; el PR debe ejecutar
checks sobre la versión publicada.

Los comandos, salidas, fechas, códigos de salida, límites históricos y evidencias están en
[`docs/evidencias/README.md`](./docs/evidencias/README.md),
[`docs/resultados-validacion.md`](./docs/resultados-validacion.md) y
[`docs/CHANGELOG-EP5.md`](./docs/CHANGELOG-EP5.md).

## Optimización adicional del listado (2026-11-21)

En una ejecución local basada en `main` (`32a38b0`), se redujo el trabajo del listado:
`GET /api/clients` obtiene los metadatos de total junto con la página, limita su proyección
a los campos de la tabla y deja las notas cifradas para el endpoint de detalle. La
autenticación continúa comprobando el estado del usuario en cada solicitud. La respuesta
JSON de una página de 50 filas bajó de 19,251 a 13,114 bytes en perfiles de muestra; las
mediciones unitarias de SQL/descifrado fluctuaron y no se usan como prueba de causalidad.

| Herramienta | Usuarios | P95 previo | P95 actual | P99 actual | Errores HTTP | Throughput actual | CPU promedio (ventana Docker) |
|---|---:|---:|---:|---:|---:|---:|---:|
| k6 | 50 VU | 56.09 ms | 24.40 ms | 57.91 ms | 0 | 37.12 req/s | 32.1 % |
| k6 | 200 VU | 1.73 s | 746.95 ms | 930.60 ms | 0 | 112.52 req/s | 47.6 % |
| JMeter | 50 | 63 ms | 16 ms | 33 ms | 0 | 40.8 req/s | 32.1 % |
| JMeter | 200 | 1,104 ms | 494 ms | 598 ms | 0 | 141.2 req/s | 47.6 % |

Las corridas se hicieron contra 502 registros (500 sintéticos), con una página de 50 filas,
un login y token temporal por corrida y 1 s de espera. JMeter terminó sin `BindException`.
La CPU de cada nivel es un agregado de su ventana de `docker stats`, compartida por ambas
herramientas.
El umbral P95 <300 ms todavía se incumple a 200 usuarios; 100 VU fue el nivel más alto
comprobado dos veces bajo el umbral (P95 97.98 y 89.06 ms). A 150 VU una repetición pasó
(294.16 ms) y otra no (338.65 ms), por lo que no se declara estable ni se extrapola una
capacidad universal.

La regresión final local fue Node 9/9 sin omitidas, Vitest 4/4, seguridad 19/19 y c8
83.87 % líneas/sentencias, 82.27 % ramas y 88.88 % funciones. `npm audit` y
`npm audit --omit=dev` reportaron cero vulnerabilidades; Trivy reportó 0 HIGH/CRITICAL
(4 LOW, 7 MEDIUM). El run más reciente de Actions sobre `main` (`44955653856`) falló en
Gitleaks; el escaneo de Sonar no se ejecutó y no hay Quality Gate reciente. Los detalles,
códigos de salida y límites están en [`docs/resultados-validacion.md`](./docs/resultados-validacion.md).

## Requisitos para ejecutar

- Docker Desktop instalado e iniciado.
- Node.js 20 o posterior y npm (necesarios para pruebas/coverage y SonarScanner).
- Para inspección SonarQube local: JDK 17, SonarQube Community Edition y SonarScanner, según el material de instalación del curso.

## Inicio rápido en Windows

1. Descomprime o guarda esta carpeta en una ruta local.
2. Instala y abre Docker Desktop. Espera a que indique que el motor está activo.
3. Abre PowerShell en la carpeta raíz del proyecto.
4. Copia `.env.example` a `.env` y reemplaza los marcadores por valores únicos antes del primer arranque. `POSTGRES_PASSWORD`, `JWT_SECRET` y `DATA_ENCRYPTION_SECRET` son obligatorios: Compose se detendrá con un mensaje claro si falta cualquiera de ellos. No guardes `.env` ni compartas sus valores. Genera secretos aleatorios en Windows con Node:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Usa un valor diferente para `JWT_SECRET` y `DATA_ENCRYPTION_SECRET`; conserva el valor de cifrado mientras haya datos cifrados en la base. No uses marcadores de `.env.example` como claves de ejecución ni expongas el entorno de laboratorio a Internet.
5. Ejecuta:

   ```powershell
   docker compose up --build -d
   docker compose ps
   ```

6. Abre <http://localhost:3333> con la credencial configurada mediante `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `.env`. No hay contraseña predeterminada. Si cambias estas variables, hazlo antes del primer inicio de la base; el usuario semilla no se sobrescribe en cada arranque.
7. El endpoint de salud es <http://localhost:3333/api/health>. PostgreSQL se expone solo en `127.0.0.1:15432` para el laboratorio.
8. Para detener los servicios conserva los datos: `docker compose down`. Para borrar la base de datos de laboratorio y sus datos definitivamente: `docker compose down -v` (acción destructiva).

Para validar automáticamente respaldo y restauración en una base desechable, inicia
PostgreSQL y ejecuta `npm.cmd run test:backup` desde PowerShell, CMD, Bash o Git Bash.
El script Node selecciona Docker Compose, un contenedor indicado por `PG_CONTAINER` o
las herramientas PostgreSQL locales (`pg_dump`, `pg_restore`, `psql`, `createdb`,
`dropdb`) según disponibilidad. Compara conteos por tabla y un hash de `users` sin
imprimirlo; elimina la base y el archivo temporales. Configura `PGHOST`, `PGPORT`,
`PGUSER` y `PGPASSWORD` al usar herramientas locales. Detén las escrituras y no ejecutes
la prueba contra datos reales o una base compartida.

Para un respaldo manual de la base de prueba en PowerShell:

```powershell
cmd /c "docker compose exec -T db pg_dump -U atlas atlas > atlas-backup.sql"
```

Guarda el archivo de respaldo como evidencia protegida: incluye datos cifrados y hashes de credenciales. Para probar restauración sin sobrescribir la base original, crea una base desechable y restaura allí:

```powershell
docker compose exec -T db createdb -U atlas atlas_restore_test
cmd /c "docker compose exec -T db psql -U atlas -d atlas_restore_test < atlas-backup.sql"
docker compose exec -T db dropdb -U atlas atlas_restore_test
```

Valida la salida y los registros restaurados antes de afirmar que el plan de recuperación fue aprobado.

Si modificas la estructura de `db/init.sql` luego de crear el volumen, la inicialización oficial de PostgreSQL no vuelve a ejecutarse sobre una base existente. Para una base de laboratorio descartable puedes detenerla y recrearla con `docker compose down -v` y luego `docker compose up --build -d`.

## TLS para laboratorio

El archivo [`docker-compose.tls.yml`](./docker-compose.tls.yml) levanta una instancia
aislada llamada `atlas-tls`: Caddy termina TLS con una CA local interna, redirige HTTP
a HTTPS y agrega HSTS. Solo Caddy publica `127.0.0.1:8080` y `127.0.0.1:8443`; la
aplicación y PostgreSQL permanecen en la red privada de Compose, sin puertos del host.
Este certificado autofirmado se debe usar únicamente en laboratorio.

Con los secretos requeridos definidos en `.env`, inicia la pila:

```powershell
docker compose -f docker-compose.tls.yml up --build -d
docker compose -f docker-compose.tls.yml ps
```

Para confiar en el certificado en el perfil actual de Windows, copia la CA raíz local
desde el volumen de Caddy e impórtala al almacén de certificados raíz del usuario:

```powershell
docker compose -f docker-compose.tls.yml cp caddy:/data/caddy/pki/authorities/local/root.crt "$env:TEMP\atlas-tls-root.crt"
certutil -user -addstore Root "$env:TEMP\atlas-tls-root.crt"
```

Luego abre <https://localhost:8443/api/health>. `npm.cmd run test:tls` verifica el
estado HTTPS, la redirección HTTP y que app/base de datos no publiquen puertos. Para
quitar la confianza, elimina el certificado `Caddy Local Authority` del almacén de
certificados raíz del usuario mediante `certmgr.msc`. Detén la pila con
`docker compose -f docker-compose.tls.yml down`; no uses `-v` si deseas conservar la CA
local y los datos de laboratorio.

## Pruebas unitarias y de integración

Instala dependencias para desarrollo una sola vez:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run test:unit
```

La suite equivalente en Vitest se ejecuta con:

```powershell
npm.cmd run test:vitest
```

Las pruebas dinámicas requieren `DATABASE_URL`, `JWT_SECRET`,
`DATA_ENCRYPTION_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` configurados para una base
aislada. Ejecute `npm.cmd run test:security` para las verificaciones HTTP y
`npm.cmd run test:tls` mientras la pila TLS de laboratorio esté activa. El endpoint
administrativo `GET /api/clients/:id/export` entrega datos estructurados del titular,
con cuenta bancaria enmascarada y auditoría; la política académica describe su alcance.

La retención de auditoría se ejecuta con `npm.cmd run retention:purge`. Configure
`DATABASE_URL` y, opcionalmente, `AUDIT_RETENTION_DAYS` como entero positivo; el valor
predeterminado es 365 días. La depuración elimina solo auditorías vencidas y registra el
resultado de la operación.

Para ejecutar todo el conjunto local y la auditoría de dependencias:

```powershell
npm.cmd run quality
```

La integración necesita la base levantada y apunta a una base de pruebas aislada. En PowerShell:

```powershell
$dbUser = (docker compose exec -T db printenv POSTGRES_USER).Trim()
$dbPassword = (docker compose exec -T db printenv POSTGRES_PASSWORD).Trim()
$userEncoded = [uri]::EscapeDataString($dbUser)
$passwordEncoded = [uri]::EscapeDataString($dbPassword)
$env:TEST_DATABASE_URL = "postgres://${userEncoded}:${passwordEncoded}@127.0.0.1:15432/atlas"
npm.cmd run test:integration
Remove-Item Env:TEST_DATABASE_URL
```

Las pruebas de accesibilidad usan Playwright y axe-core. Instala Chromium una vez con
`npx.cmd playwright install chromium`; con las variables de base de datos y administrador
configuradas, ejecuta `npm.cmd run test:accessibility`. Se analizan inicio de sesión,
listado y formulario de clientes en 1280×800, 390×844 y 320×700. Las capturas se guardan en
[`docs/evidencias/ui/`](./docs/evidencias/ui/), sin guardar el reporte temporal del navegador.

## Pruebas de carga con JMeter

El plan reproducible para consulta de clientes con un token preautenticado está en
[`jmeter/atlas-load-test.jmx`](./jmeter/atlas-load-test.jmx), con instrucciones en
[`jmeter/README.md`](./jmeter/README.md). La prueba debe ejecutarse contra datos sintéticos
y una instancia de laboratorio. Prepara los 500 registros sintéticos con
`node scripts/seed-load-data.js` y elimínalos después con
`node scripts/seed-load-data.js --clean`.
Realiza un único login por corrida y reutiliza temporalmente el token para no exceder el
límite de 10 intentos por IP cada 15 minutos. No guardes contraseñas, tokens ni resultados
con datos personales en el repositorio.

## Automatización y extensiones

El workflow [`ci.yml`](./.github/workflows/ci.yml) ejecuta las pruebas Node/Vitest, las
pruebas dinámicas de seguridad, cobertura c8, auditoría de dependencias de producción,
Gitleaks, accesibilidad, TLS y respaldo/restauración en jobs separados; Node y cobertura
usan PostgreSQL 16 e inicializan el esquema desde `db/init.sql`. La integración falla en
CI si falta `TEST_DATABASE_URL`, en vez de quedar omitida. La cobertura exige al menos 70 %
en líneas, funciones, ramas y sentencias, y publica `coverage/` como artefacto. Para
habilitar Sonar, configure como secretos del
repositorio `SONAR_HOST_URL`, `SONAR_TOKEN` y `SONAR_PROJECT_KEY`; para SonarCloud configure
además `SONAR_ORGANIZATION`. Mientras falte la configuración, el job lo informa y omite el
análisis, sin guardar tokens en el repositorio. Las extensiones sugeridas para VS Code están en
[`extensions.json`](./.vscode/extensions.json): Vitest Explorer, SonarLint, Docker, ESLint
y YAML.

La matriz de requisitos y la lista de evidencias para el informe y la presentación están en
[`docs/entregables-ep5.md`](./docs/entregables-ep5.md). La auditoría de producción bloquea
vulnerabilidades altas y críticas; `npm audit` evalúa también las dependencias de desarrollo.
La política de privacidad para el prototipo está en
[`docs/politica-privacidad.md`](./docs/politica-privacidad.md) y se identifica expresamente
como borrador académico sujeto a revisión antes de tratar datos reales. La evaluación
detallada de principios y derechos está en
[`docs/matriz-cumplimiento-datos.md`](./docs/matriz-cumplimiento-datos.md); no declara
conformidad jurídica. Sonar queda como no ejecutado si faltan credenciales o servicio; las
instrucciones reproducibles están en [`docs/sonar-ejecucion.md`](./docs/sonar-ejecucion.md).
El procedimiento y límites de disponibilidad están en
[`docs/disponibilidad.md`](./docs/disponibilidad.md).

El informe técnico completo está en [`docs/informe-ep5.md`](./docs/informe-ep5.md).
La versión Word consolidada para la entrega final está en
[`docs/Informe_Final_EP5_Atlas.docx`](./docs/Informe_Final_EP5_Atlas.docx).

La prueba crea un usuario y un cliente temporales y los elimina al finalizar; no la ejecutes contra datos reales o una base compartida. Si cambiaste claves en `.env`, actualiza la URL de prueba. `npm.cmd run test:coverage` genera el reporte `coverage/lcov.info`; para incluir la integración en el reporte, define primero `TEST_DATABASE_URL`. Conserva capturas/logs de la ejecución para tu informe. Un test omitido por falta de `TEST_DATABASE_URL` no equivale a una prueba aprobada.

## Inspección SonarQube de acuerdo con el material del curso

1. Inicia el servidor SonarQube de laboratorio desde la raíz del proyecto:

   ```powershell
   docker compose --profile analysis up -d sonarqube
   docker compose ps
   ```

   Espera a que termine el arranque y verifica <http://localhost:9000>. El primer inicio puede tardar varios minutos. La edición Community usa almacenamiento local de laboratorio; los volúmenes del proyecto conservan sus datos.
2. Inicia sesión con `admin` / `admin` y cambia la contraseña cuando SonarQube lo solicite. Crea un proyecto local llamado `atlas-is1102` y genera un token de análisis. El token es secreto: no lo pegues en el repositorio, capturas ni informe.
3. En otra terminal, ve a la carpeta del proyecto e instala dependencias; inicia cobertura con `npm.cmd run test:coverage`. Para incorporar la prueba de integración al reporte, configura `TEST_DATABASE_URL` como se indica arriba antes de ejecutar cobertura.
4. Descarga el SonarScanner CLI para Windows x64 desde la [documentación oficial de SonarScanner](https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/sonarscanner/), agrega su carpeta `bin` al `PATH` y verifica `sonar-scanner --version`. El JDK 17 está instalado en esta máquina; usa la versión de scanner indicada por el asistente de SonarQube si el servidor solicita otra compatible.
5. Ejecuta el comando mostrado por la interfaz de SonarQube. Alternativamente, configura `SONAR_HOST_URL` y `SONAR_TOKEN` en la sesión (no los guardes en el repositorio) y ejecuta:

   ```powershell
   sonar-scanner "-Dsonar.host.url=$env:SONAR_HOST_URL" "-Dsonar.token=$env:SONAR_TOKEN" "-Dsonar.userHome=$env:TEMP\atlas-sonar-cache"
   ```

6. Guarda evidencia legible de la pantalla de resumen y registra bugs, vulnerabilidades, hotspots, code smells y cobertura en tu bitácora. El análisis solo produce resultados al ejecutarlo: este repositorio no contiene cifras de Sonar inventadas.
7. Para detener SonarQube sin borrar los resultados: `docker compose --profile analysis stop sonarqube`. No uses `docker compose down -v` si deseas conservar análisis y base de datos del laboratorio.

## Evidencias e informe

Sigue la secuencia de laboratorio del material: registra versiones de SO/navegador/base de datos, verifica `docker compose ps`, ejecuta smoke test primero, y solo luego continúa con los casos. Para cada caso de [`docs/casos-prueba.md`](./docs/casos-prueba.md), anota entrada, esperado, obtenido, estado, defecto asociado y ruta de captura/log. Para cada defecto informa severidad, pasos de reproducción y requisito asociado.

No uses PII real. Compose no define credenciales productivas por defecto: exige secretos
configurados fuera del código; los valores `ci-only` del workflow son sintéticos y solo
para CI. El perfil HTTP local no usa TLS; el perfil Caddy fue probado en laboratorio, pero
no acredita un certificado público. Un despliegue real debe terminar TLS en un proxy HTTPS
y definir secretos fuera del código. La gestión documental almacena referencias, no
archivos. Los objetivos de disponibilidad/carga deben medirse en el entorno y condiciones
establecidos por el ERS antes de afirmar cumplimiento.

## Tecnologías

Node.js, Express, PostgreSQL, bcryptjs, JSON Web Token, Helmet, Zod, Docker Compose, Node Test Runner, Supertest y SonarQube.
