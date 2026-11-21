# Prueba de carga con Apache JMeter

El plan [`atlas-load-test.jmx`](./atlas-load-test.jmx) consulta `GET /api/clients` con un
token proporcionado al inicio de cada ejecución. El login se realiza una sola vez por
corrida, fuera de JMeter, para no activar el límite de 10 intentos por IP cada 15 minutos.
El plan está preparado para CP-PERF-01 y debe ejecutarse únicamente contra el entorno de
laboratorio autorizado.

## Ejecución en Windows

Con Atlas y PostgreSQL levantados:

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3333/api/auth/login `
  -ContentType 'application/json' `
  -Body (@{ email = $env:ADMIN_EMAIL; password = $env:ADMIN_PASSWORD } | ConvertTo-Json)
$env:ATLAS_PERF_TOKEN = $login.token

jmeter -n -t .\jmeter\atlas-load-test.jmx `
  -JBASE_HOST=127.0.0.1 -JBASE_PORT=3333 `
  -JTOKEN=$env:ATLAS_PERF_TOKEN -JUSERS=50 -JRAMP_UP=30 `
  -l .\docs\evidencias\carga\jmeter-50.jtl
```

Para 200 usuarios, realiza nuevamente un único login y cambia `-JUSERS=50` por
`-JUSERS=200`, con una ruta de salida JTL distinta. El token y la contraseña son datos
temporales: no los escribas en archivos de evidencia, capturas ni repositorio. Genera el
reporte HTML desde el JTL después de cada corrida.

Prepara los 500 clientes sintéticos con `node scripts/seed-load-data.js`. El script solo
reemplaza datos que identifica por su nombre sintético y se detiene si encuentra datos
ajenos o contratos asociados. Después de las mediciones, retíralos con
`node scripts/seed-load-data.js --clean`.
