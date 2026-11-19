# Prueba de carga con Apache JMeter

El plan [`atlas-load-test.jmx`](./atlas-load-test.jmx) ejecuta un flujo de login y consulta de
`GET /api/clients`. Está preparado para CP-PERF-01 y debe ejecutarse únicamente contra el
entorno de laboratorio autorizado.

## Ejecución en Windows

Con Atlas y PostgreSQL levantados:

```powershell
jmeter -n -t .\jmeter\atlas-load-test.jmx `
  -JBASE_HOST=127.0.0.1 -JBASE_PORT=3333 `
  -JADMIN_EMAIL=admin@atlas.cl `
  -JADMIN_PASSWORD=$env:ADMIN_PASSWORD `
  -JUSERS=50 -JRAMP_UP=30 -JDURATION=300 `
  -l .\jmeter\results.jtl `
  -e -o .\jmeter\report
```

No escribas contraseñas reales en comandos guardados, capturas ni archivos `.jtl`.
Revisa el resumen HTML generado en `jmeter\report` y registra promedio, P90/P95,
errores y throughput en el informe. Para una corrida rápida usa `-JUSERS=1 -JDURATION=10`.
