# Evidencias EP5

Toda evidencia incluye fecha, comando o suite y resultado real. Los resultados antiguos no se mezclan con esta ejecución.

| Tarea | Comando o acción | Fecha | Resultado | Archivo |
|---|---|---|---|---|
| DEF-13 k6 50 VU | `k6 run` con `BASE_URL=http://localhost:3333`, `VUS=50`, `HOLD_DURATION=1m` | 2026-11-21 | No válido: corrida previa quedó contra puerto incorrecto y login bloqueado posteriormente | `carga/k6-50vu-2026-11-21.txt` |
| DEF-13 k6 200 VU | `k6 run` con `BASE_URL=http://localhost:3333`, `VUS=200`, `HOLD_DURATION=1m` | 2026-11-21 | No válido: corrida previa quedó contra puerto incorrecto y login bloqueado posteriormente | `carga/k6-200vu-2026-11-21.txt` |
| DEF-13 JMeter 50/200 | JMeter no GUI con `-JUSERS=50/200 -JBASE_PORT=3333` | 2026-11-21 | 401; salida no representa rendimiento | `carga/jmeter-50vu-2026-11-21.*`, `carga/jmeter-200vu-2026-11-21.*` |
| DEF-13 datos sintéticos | `node scripts/seed-load-data.js` y `node scripts/seed-load-data.js --clean` | 2026-11-21 | 500 creados; 500 eliminados sin contratos asociados | `carga/00-preparacion-carga-2026-11-21.txt` |
| DEF-14 Trivy | `trivy image --severity HIGH,CRITICAL atlas-is1102-ep5-app:latest` | 2026-11-21 | 10 HIGH, 0 CRITICAL | `14-trivy-2026-11-21.json` |
| DEF-15 Gitleaks | `gitleaks git --redact --report-format json .` | 2026-11-21 | 2 hallazgos históricos en un commit antiguo; archivo redactado | `15-gitleaks-2026-11-21.json` |
| Regresión Node | `npm.cmd test` | 2026-11-21 | 9/9, 0 omitidas | `EP5-npm-test-2026-11-21.txt` |
| Regresión Vitest | `npm.cmd run test:vitest` | 2026-11-21 | 4/4 | `EP5-vitest-2026-11-21.txt` |
| Seguridad dinámica | `npm.cmd run test:security` | 2026-11-21 | 19/19 | `EP5-security-2026-11-21.txt` |
| TLS | `npm.cmd run test:tls` | 2026-11-21 | 1/3; puertos 8080/8443 ausentes | `EP5-tls-2026-11-21.txt` |
| Cobertura | `npm.cmd run test:coverage` | 2026-11-21 | líneas 79.89 %, ramas 75.88 %, funciones 85.71 % | `EP5-coverage-2026-11-21.txt` |
| Accesibilidad | `npm.cmd run test:accessibility` | 2026-11-21 | 6/6 | `EP5-accessibility-2026-11-21.txt` |
| GitHub Actions | Push de `c1d257d` | 2026-11-21 | Verde: test, coverage, security, dependency-audit y gitleaks; Sonar omitido por secretos | https://github.com/AngelGByte/atlas-is1102/actions/runs/44931959132 |
