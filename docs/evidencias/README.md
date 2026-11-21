# Índice de evidencias EP5

Las evidencias marcadas como finales corresponden al cierre del 2026-11-21. Las corridas
preliminares fallidas se conservan como antecedentes y no se usan para afirmar rendimiento. Los
tokens de carga se pasaron en variables de entorno efímeras: jamás se guardaron en JTL, logs,
capturas ni comandos archivados; los marcadores `<token efímero>` son redacciones.

| Tarea | Comando / acción | Fecha | Resultado y código | Archivo |
|---|---|---|---|---|
| DEF-13 datos sintéticos | `node scripts/seed-load-data.js` | 2026-11-21 15:18 | 500 clientes creados; código 0 | [`carga/01-preparacion-carga-valid-2026-11-21.txt`](./carga/01-preparacion-carga-valid-2026-11-21.txt) |
| DEF-13 k6 50 VU | `k6 run --quiet --no-color --summary-trend-stats avg,min,med,max,p(90),p(95),p(99) cp08-clients.js`, `BASE_URL=http://localhost:3334`, `VUS=50`, `HOLD_DURATION=5m` | 2026-11-21 15:18–15:24 | 8.446 requests, 0 errores, 23,40 req/s; P95 1.190 ms, P99 1.310 ms; código 99 por umbral P95 | [`carga/k6-50vu-final-2026-11-21.txt`](./carga/k6-50vu-final-2026-11-21.txt) |
| DEF-13 k6 200 VU | Mismo comando con `VUS=200` | 2026-11-21 15:25–15:31 | 8.749 requests, 0 errores, 24,27 req/s; P95 7.700 ms, P99 8.030 ms; código 99 por umbral P95 | [`carga/k6-200vu-final-2026-11-21.txt`](./carga/k6-200vu-final-2026-11-21.txt) |
| DEF-13 JMeter 50 | `java -jar ApacheJMeter.jar -n -t jmeter/atlas-load-test.jmx -l jmeter-50users-groovy-env.jtl -JBASE_HOST=localhost -JBASE_PORT=3334 -JUSERS=50 -JRAMP_UP=30 -JLOOPS=10`; `TOKEN` por entorno | 2026-11-21 15:37–15:38 | 500 muestras, 0 errores, 16,7 req/s; P95 70 ms, P99 107 ms; código 0 | [`carga/jmeter-50users-groovy-env-2026-11-21.txt`](./carga/jmeter-50users-groovy-env-2026-11-21.txt), [JTL](./carga/jmeter-50users-groovy-env.jtl) |
| DEF-13 JMeter 200 | Mismo comando con `-JUSERS=200` y JTL separado | 2026-11-21 15:38–15:39 | 2.000 muestras, 0 errores, 23,0 req/s; P95 7.894 ms, P99 7.998 ms; código 0 | [`carga/jmeter-200users-groovy-env-2026-11-21.txt`](./carga/jmeter-200users-groovy-env-2026-11-21.txt), [JTL](./carga/jmeter-200users-groovy-env.jtl) |
| DEF-13 análisis percentiles/diagnóstico | Recalculo desde JTL; revisión de telemetría y traza `--trace-gc` | 2026-11-21 | Causa del máximo histórico 4,64 s no determinada; la traza GC terminó más de seis minutos antes de la carga y no se correlaciona. CPU de app ~102–110 %, evidencia limitada de esperas PostgreSQL | [`carga/07-resumen-carga-2026-11-21.txt`](./carga/07-resumen-carga-2026-11-21.txt), [`carga/05-gc-summary-2026-11-21.txt`](./carga/05-gc-summary-2026-11-21.txt), telemetría [`50 VU`](./carga/telemetria-final-50vu-2026-11-21.txt) / [`200 VU`](./carga/telemetria-final-200vu-2026-11-21.txt) |
| DEF-13 limpieza | `node scripts/seed-load-data.js --clean`; antes se verificó que no existieran contratos | 2026-11-21 | 0 contratos asociados antes; 0 clientes sintéticos tras limpiar; código 0 | [`carga/06-limpieza-sinteticos-2026-11-21.txt`](./carga/06-limpieza-sinteticos-2026-11-21.txt) |
| DEF-14 imagen final | `docker build --progress plain -t atlas-is1102-final:2026-11-21 .` | 2026-11-21 | Build correcto; código 0 | [`14-docker-build-2026-11-21.txt`](./14-docker-build-2026-11-21.txt) |
| DEF-14 Trivy final | `trivy image --severity HIGH,CRITICAL --exit-code 1 --format json --output docs/evidencias/14-trivy-final-2026-11-21.json atlas-is1102-final:2026-11-21` | 2026-11-21 | 0 HIGH, 0 CRITICAL; código 0 | [Salida](./14-trivy-final-2026-11-21.txt), [reporte JSON](./14-trivy-final-2026-11-21.json) |
| TLS | `npm.cmd run test:tls` | 2026-11-21 | 3/3, 0 omitidas; código 0 | [`EP5-tls-final-2026-11-21.txt`](./EP5-tls-final-2026-11-21.txt) |
| Node | `npm.cmd test` | 2026-11-21 | 9/9, 0 fallidas, 0 omitidas; código 0 | [`EP5-regresiones-final-2026-11-21.txt`](./EP5-regresiones-final-2026-11-21.txt) |
| Vitest | `npm.cmd run test:vitest` | 2026-11-21 | 4/4; código 0 | [`EP5-regresiones-final-2026-11-21.txt`](./EP5-regresiones-final-2026-11-21.txt) |
| Seguridad dinámica | `npm.cmd run test:security` | 2026-11-21 | 19/19; código 0 | [`EP5-regresiones-final-2026-11-21.txt`](./EP5-regresiones-final-2026-11-21.txt) |
| Cobertura | `npm.cmd run test:coverage` | 2026-11-21 | Lines/statements 79.89 %, branches 75.88 %, functions 85.71 %; código 0 | [`EP5-regresiones-final-2026-11-21.txt`](./EP5-regresiones-final-2026-11-21.txt) |
| Accesibilidad | `npm.cmd run test:accessibility`, capturas en `docs/evidencias/ui/retest-2026-11-21-final` | 2026-11-21 | 6/6; código 0 | [`EP5-regresiones-final-2026-11-21.txt`](./EP5-regresiones-final-2026-11-21.txt), [capturas](./ui/retest-2026-11-21-final/) |
| Auditoría npm | `npm.cmd audit` y `npm.cmd audit --omit=dev` | 2026-11-21 | 0 vulnerabilidades en ambas; código 0 | [`EP5-regresiones-final-2026-11-21.txt`](./EP5-regresiones-final-2026-11-21.txt) |
| Sonar | No ejecutado: faltan secretos/servicio | 2026-11-21 | Bloqueado; no se simula Quality Gate ni resolución del hallazgo `--ignore-scripts` | Sin reporte |
| GitHub Actions | Push de este cierre | Pendiente | Registrar URL y resultado real una vez finalice el workflow; la última ejecución histórica es [44931959132](https://github.com/AngelGByte/atlas-is1102/actions/runs/44931959132) | Sin URL nueva aún |

Las salidas preliminares con puerto incorrecto, 401 o token pasado como propiedad de JMeter se
mantienen como antecedentes, pero no son las métricas finales. No deben citarse como aprobaciones.
