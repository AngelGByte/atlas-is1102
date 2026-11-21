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

6. Abre <http://localhost:3333>. Credencial local inicial predeterminada: `admin@atlas.cl` / `AtlasAdmin2026!`. Si cambias `ADMIN_EMAIL`/`ADMIN_PASSWORD`, hazlo antes del primer inicio de la base; el usuario semilla no se sobrescribe en cada arranque.
7. El endpoint de salud es <http://localhost:3333/api/health>. PostgreSQL se expone solo en `127.0.0.1:15432` para el laboratorio.
8. Para detener los servicios conserva los datos: `docker compose down`. Para borrar la base de datos de laboratorio y sus datos definitivamente: `docker compose down -v` (acción destructiva).

Para respaldar la base de prueba en PowerShell:

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

## Pruebas de carga con JMeter

El plan reproducible para login y consulta de clientes está en
[`jmeter/atlas-load-test.jmx`](./jmeter/atlas-load-test.jmx), con instrucciones en
[`jmeter/README.md`](./jmeter/README.md). La prueba debe ejecutarse contra datos sintéticos
y una instancia de laboratorio. No se deben guardar contraseñas, tokens ni resultados con
datos personales en el repositorio.

## Automatización y extensiones

El workflow [`ci.yml`](./.github/workflows/ci.yml) ejecuta las pruebas Node/Vitest, las
pruebas dinámicas de seguridad, cobertura c8, auditoría de dependencias de producción y
Gitleaks en jobs separados; Node y cobertura usan PostgreSQL 16 e inicializan el esquema
desde `db/init.sql`. La integración falla en CI si falta `TEST_DATABASE_URL`, en vez de
quedar omitida. La cobertura exige al menos 70 % en líneas, funciones, ramas y sentencias,
y publica `coverage/` como artefacto. Para habilitar Sonar, configure como secretos del
repositorio `SONAR_HOST_URL`, `SONAR_TOKEN` y `SONAR_PROJECT_KEY`; para SonarCloud configure
además `SONAR_ORGANIZATION`. Mientras falte la configuración, el job lo informa y omite el
análisis, sin guardar tokens en el repositorio. Las extensiones sugeridas para VS Code están en
[`extensions.json`](./.vscode/extensions.json): Vitest Explorer, SonarLint, Docker, ESLint
y YAML.

La matriz de requisitos y la lista de evidencias para el informe y la presentación están en
[`docs/entregables-ep5.md`](./docs/entregables-ep5.md). La auditoría de producción bloquea
vulnerabilidades altas y críticas; `npm audit` evalúa también las dependencias de desarrollo.

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

No uses PII real. Las credenciales y claves incluidas por defecto son únicamente de laboratorio. No se configura TLS en el enlace local HTTP, por lo que CP-SEG-01 queda pendiente en el modo local; un despliegue real debe terminar TLS en un proxy HTTPS y definir secretos fuera del código. La gestión documental almacena referencias, no archivos. Los objetivos de disponibilidad/carga deben medirse en el entorno y condiciones establecidos por el ERS antes de afirmar cumplimiento.

## Tecnologías

Node.js, Express, PostgreSQL, bcryptjs, JSON Web Token, Helmet, Zod, Docker Compose, Node Test Runner, Supertest y SonarQube.
