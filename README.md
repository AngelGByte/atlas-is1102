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
4. (Recomendado) Copia `.env.example` a `.env` y reemplaza `JWT_SECRET`, `DATA_ENCRYPTION_SECRET`, `POSTGRES_PASSWORD` y `ADMIN_PASSWORD` por valores únicos antes del primer arranque. Para generar secretos aleatorios en Windows con Node:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Para mantener los valores de demostración, no publiques el entorno en Internet ni reutilices sus claves.
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

## Pruebas unitarias y de integración

Instala dependencias para desarrollo una sola vez:

```powershell
npm install
npm test
npm run test:unit
```

La integración necesita la base levantada y apunta a una base de pruebas aislada. En PowerShell:

```powershell
$env:TEST_DATABASE_URL = "postgres://atlas:atlas-local-only@127.0.0.1:15432/atlas"
npm run test:integration
```

La prueba crea un usuario y un cliente temporales y los elimina al finalizar; no la ejecutes contra datos reales o una base compartida. Si cambiaste claves en `.env`, actualiza la URL de prueba. `npm run test:coverage` genera el reporte `coverage/lcov.info`; para incluir la integración en el reporte, define primero `TEST_DATABASE_URL`. Conserva capturas/logs de la ejecución para tu informe. Un test omitido por falta de `TEST_DATABASE_URL` no equivale a una prueba aprobada.

## Inspección SonarQube de acuerdo con el material del curso

1. Inicia SonarQube local y verifica en el navegador que esté operativo en `http://localhost:9000`.
2. Crea un proyecto local llamado `atlas-is1102` y genera un token de análisis desde SonarQube.
3. En una terminal, ve a la carpeta del proyecto e instala dependencias; inicia cobertura con `npm run test:coverage`.
4. Descarga/instala SonarScanner compatible con tu plataforma, agrega su carpeta `bin` al `PATH` y verifica `java -version` (JDK 17) y `sonar-scanner --version`.
5. Ejecuta el comando mostrado por la interfaz de SonarQube. Alternativamente, configura `SONAR_HOST_URL` y `SONAR_TOKEN` en la sesión (no los guardes en el repositorio) y ejecuta:

   ```powershell
   sonar-scanner "-Dsonar.host.url=$env:SONAR_HOST_URL" "-Dsonar.token=$env:SONAR_TOKEN"
   ```

6. Guarda evidencia legible de la pantalla de resumen y registra bugs, vulnerabilidades, hotspots, code smells y cobertura en tu bitácora. El análisis solo produce resultados al ejecutarlo: este repositorio no contiene cifras de Sonar inventadas.

## Evidencias e informe

Sigue la secuencia de laboratorio del material: registra versiones de SO/navegador/base de datos, verifica `docker compose ps`, ejecuta smoke test primero, y solo luego continúa con los casos. Para cada caso de [`docs/casos-prueba.md`](./docs/casos-prueba.md), anota entrada, esperado, obtenido, estado, defecto asociado y ruta de captura/log. Para cada defecto informa severidad, pasos de reproducción y requisito asociado.

No uses PII real. Las credenciales y claves incluidas por defecto son únicamente de laboratorio. No se configura TLS en el enlace local HTTP, por lo que CP-SEG-01 queda pendiente en el modo local; un despliegue real debe terminar TLS en un proxy HTTPS y definir secretos fuera del código. La gestión documental almacena referencias, no archivos. Los objetivos de disponibilidad/carga deben medirse en el entorno y condiciones establecidos por el ERS antes de afirmar cumplimiento.

## Tecnologías

Node.js, Express, PostgreSQL, bcryptjs, JSON Web Token, Helmet, Zod, Docker Compose, Node Test Runner, Supertest y SonarQube.
