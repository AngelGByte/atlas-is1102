# Resultados de validacion tecnica

Fecha de ejecucion: 2026-10-28

## Entorno y pruebas

- Atlas y PostgreSQL se iniciaron con Docker Compose; se reconstruyo la imagen de Atlas y `/api/health` respondio `ok`.
- Pruebas automatizadas con PostgreSQL disponible: 9 aprobadas, 0 fallidas y 0 omitidas. Incluyen integracion de inicio de sesion, roles, proteccion de datos y auditoria.
- Cobertura de c8: 59.59 % de statements/lineas, 64.78 % de branches y 72.22 % de funciones.
- `npm audit`: 0 vulnerabilidades reportadas.

## Analisis SonarQube

Analisis finalizado correctamente el 2026-10-28 en el proyecto `atlas-is1102`, usando SonarQube Community Build 26.10.0.133 y SonarScanner CLI 8.1.0.6389.

El servidor local usa una base de datos embebida de evaluacion. SonarQube advierte que esa base no debe usarse para escalar ni como almacenamiento de produccion.

| Medida | Resultado |
|---|---:|
| Lineas de codigo (NCLOC) | 1266 |
| Bugs | 0 |
| Vulnerabilidades | 0 |
| Security hotspots | 0 |
| Code smells | 0 |
| Duplicacion | 2.1 % |
| Cobertura informada por SonarQube | 43.0 % |
| Quality Gate | OK |

El Quality Gate figura como `OK`, pero SonarQube informa `ignoredConditions: true` y las condiciones mostradas son de codigo nuevo. Por tanto, ese estado no significa que la cobertura total de 43.0 % cumpla por si sola un umbral general. La cobertura de SonarQube y la de c8 se conservan como medidas distintas.

Durante el primer analisis se detecto una condicion redundante en una lista desplegable; se simplifico y el analisis final ya no reporta bugs abiertos.

## Alcance pendiente

Estos resultados no acreditan pruebas de TLS/HTTPS, accesibilidad, restauracion de respaldos ni cumplimiento normativo. Deben ejecutarse y documentarse por separado antes de afirmar que esos requisitos estan aprobados. La gestion documental almacena referencias y metadatos, no archivos.

## CP-08 — Prueba de rendimiento

**Estado: APROBADO.**

- Se implementó la relación `clients.empresa_id` con la tabla `companies` y el endpoint protegido `GET /api/empresas/:id/clients`.
- La base local contiene 500 clientes generados exclusivamente para la prueba en `empresa_id=1`. La consulta reproducible esta en [`docs/cp08-evidence.sql`](./cp08-evidence.sql) y su resultado en [`docs/cp08-sql-result.txt`](./cp08-sql-result.txt).
- La comprobación funcional respondió `200 OK` y devolvió `500` clientes para `GET /api/empresas/1/clients`.
- El archivo [`docs/cp08-endpoint-smoke.txt`](./cp08-endpoint-smoke.txt) corresponde a un smoke test preliminar fallido con 1 VU durante 10 segundos; se conserva como antecedente y no como evidencia de aprobación.
- [`cp08.js`](../cp08.js) ejecutó 50 VU durante 5 minutos, con ramp-up de 30 segundos y ramp-down de 30 segundos.
- Resultado k6: código de salida `0`, 14.885 iteraciones, `http_req_duration p(95)=213.65 ms`, `http_req_failed=0 %` y `checks=100 %`.
- Se cumplieron los umbrales: P95 menor a 300 ms, errores HTTP menores a 1 % y checks mayores a 99 %. La salida completa sin credenciales está en [`docs/cp08-result.txt`](./cp08-result.txt).

### Ejecución solicitada sobre `GET /api/clients`

- La verificación funcional respondió `200 OK` y devolvió `500` clientes. La consulta y el resultado están en [`docs/cp08-clients-evidence.sql`](./cp08-clients-evidence.sql) y [`docs/cp08-clients-sql-result.txt`](./cp08-clients-sql-result.txt).
- La configuración específica está en [`cp08-clients.js`](../cp08-clients.js), con 50 VU durante 5 minutos, más 30 segundos de subida y 30 segundos de descenso.
- Resultado final k6: código de salida `0`, 14.528 iteraciones, `http_req_duration p(95)=244.95 ms`, `http_req_failed=0 %` y `checks=100 %`.
- Esta es la evidencia principal para el requisito que solicita explícitamente `GET /api/clients`; el resumen completo está en [`docs/cp08-clients-result.txt`](./cp08-clients-result.txt).

## Evidencia para el informe

El dashboard local esta disponible en <http://localhost:9000/dashboard?id=atlas-is1102>. Guardar una captura legible del resumen y adjuntarla al informe junto con la fecha y las medidas anteriores. No incluir tokens, contrasenas, datos personales ni respaldos con datos del laboratorio en las capturas.

## Resultados anteriores al cierre final (2026-11-21)

Esta sección conserva el estado documentado antes de las corridas finales: k6 usó un puerto
incorrecto, JMeter respondió 401, TLS quedó en 1/3 y Trivy reportó 10 HIGH. Esos datos no son
resultados de la medición final y no se reutilizan como si fueran nuevos. La última ejecución
histórica de Actions fue
[44931959132](https://github.com/AngelGByte/atlas-is1102/actions/runs/44931959132); sus jobs
test, coverage, security, dependency-audit y gitleaks aprobaron, con Sonar omitido por falta de
secretos.

## Cierre final ejecutado el 2026-11-21

Las evidencias actuales están fechadas y conservan sus códigos de salida en
[`docs/evidencias/README.md`](./evidencias/README.md). PostgreSQL del stack aislado estuvo activo
durante la regresión; las corridas de carga usaron 500 clientes sintéticos, sin contratos. Los
500 clientes fueron eliminados después de comprobar cero contratos asociados.

### Regresiones y seguridad

- Node: 9/9 aprobadas, 0 fallidas, 0 omitidas; código 0.
- Vitest: 4/4 aprobadas; código 0.
- Seguridad dinámica: 19/19 aprobadas; código 0.
- Playwright/axe: 6/6 aprobadas en escritorio 1280x800 y móvil 390x844; código 0. Capturas nuevas en [`docs/evidencias/ui/retest-2026-11-21-final/`](./evidencias/ui/retest-2026-11-21-final/).
- TLS: 3/3 aprobadas contra Caddy en puertos 8080/8443 del stack aislado; código 0. Es una CA local de laboratorio, no una validación de certificado público.
- Cobertura c8: 79.89 % statements/lines, 75.88 % branches y 85.71 % functions; umbral 70 % aprobado, código 0.
- `npm audit` y `npm audit --omit=dev`: 0 vulnerabilidades, código 0 en ambas.
- Imagen final: build correcto; Trivy con `--severity HIGH,CRITICAL --exit-code 1`: 0 HIGH y 0 CRITICAL, código 0. Se retiraron npm/npx del runtime.
- SonarQube/SonarCloud: no ejecutado. No están configurados los secretos o variables de servicio requeridos. Por tanto, no se puede afirmar que los hallazgos anteriores sobre contraseña predeterminada o `--ignore-scripts` hayan desaparecido de Sonar.
- GitHub Actions: [44937594638](https://github.com/AngelGByte/atlas-is1102/actions/runs/44937594638) validó el commit de código `ee12d35` con conclusión `success`; la ejecución posterior [44937788677](https://github.com/AngelGByte/atlas-is1102/actions/runs/44937788677) también terminó `success` para `283b36d`. En ambas aprobaron test, coverage, security, dependency-audit y gitleaks. Sonar indicó configuración pendiente y omitió sus pasos de análisis; no se ejecutó Sonar ni Quality Gate.
- No se imprimió ni archivó ningún token de carga. El detalle del workflow está en [`EP5-actions-final-2026-11-21.txt`](./evidencias/EP5-actions-final-2026-11-21.txt).

### Carga y diagnóstico

Corridas k6 contra `/api/clients`, con un login por corrida y token solo en memoria:

| Herramienta | Concurrencia | Solicitudes/muestras | Errores HTTP | Throughput | P95 | P99 | Salida / umbral |
|---|---:|---:|---:|---:|---:|---:|---|
| k6 | 50 VU | 8.446 | 0 | 23,40 req/s | 1.190 ms | 1.310 ms | código 99 por P95; no cumple <300 ms |
| k6 | 200 VU | 8.749 | 0 | 24,27 req/s | 7.700 ms | 8.030 ms | código 99 por P95; no cumple <300 ms |
| JMeter | 50 usuarios | 500 | 0 | 16,7 req/s | 70 ms | 107 ms | código 0; cumple P95 <300 ms |
| JMeter | 200 usuarios | 2.000 | 0 | 23,0 req/s | 7.894 ms | 7.998 ms | código 0; no cumple P95 <300 ms |

El máximo histórico de 4,64 s no tiene causa única demostrada. En las corridas actuales la CPU
de aplicación estuvo aproximadamente entre 102 y 110 %; PostgreSQL tuvo normalmente una consulta
activa y cero esperas observadas, con una muestra de dos activas y una en espera. El pool tenía
`max=10` y el servidor PostgreSQL `max_connections=100`, pero no se midió espera de adquisición
del pool. Una traza GC separada registró una pausa máxima de 71,81 ms, pero finalizó más de seis
minutos antes de las corridas; no es una medición bajo carga ni permite atribución. Tampoco se
aisló arranque en frío frente a caliente. La causa histórica queda indeterminada.

### Estado real de DEF-01 a DEF-15

| Tarea | Estado | Motivo / evidencia |
|---|---|---|
| DEF-01 | Hecho (histórico) | Configuración de secretos y ausencia de contraseña predeterminada implementadas en commits previos; la revalidación Sonar sigue pendiente. |
| DEF-02 | Parcial | El build conserva `npm ci --ignore-scripts`; no se ejecutó Sonar para confirmar el hallazgo original. |
| DEF-03 | Hecho | IDs inválidos cubiertos por integración Node; regresión final 9/9. |
| DEF-04 | Hecho | Parser JSON responde de forma genérica; Node 9/9 y seguridad 19/19. |
| DEF-05 | Hecho | Regresión de cifrado y datos sensibles aprobada en Node. |
| DEF-06 | Hecho | Cobertura y auditoría actuales superan umbral; c8 79.89/75.88/85.71 y npm audit 0. |
| DEF-07 | Hecho | Los workflows para `ee12d35` y `283b36d` fueron verdes: [44937594638](https://github.com/AngelGByte/atlas-is1102/actions/runs/44937594638) y [44937788677](https://github.com/AngelGByte/atlas-is1102/actions/runs/44937788677); los jobs de test, cobertura, seguridad, auditoría y Gitleaks aprobaron. |
| DEF-08 | Hecho | TLS 3/3 en el stack local aislado; código 0. |
| DEF-09 | Hecho históricamente | Implementado antes de `67dbeba`; no modificado en este cierre. |
| DEF-10 | Hecho históricamente | Implementado antes de `67dbeba`; no modificado en este cierre. |
| DEF-11 | Hecho históricamente | Implementado antes de `67dbeba`; no modificado en este cierre. |
| DEF-12 | Hecho y revalidado | Accesibilidad Playwright/axe 6/6; código 0. |
| DEF-13 | Parcial | Corridas válidas y reproducibles; el P95 <300 ms se incumple a 200 usuarios. |
| DEF-14 | Hecho | Imagen reconstruida; Trivy 0 HIGH/CRITICAL, código 0. |
| DEF-15 | Parcial / bloqueado | Gitleaks aprobó en Actions; Sonar quedó pendiente y ambos pasos de análisis fueron omitidos por falta de configuración/credenciales. |
