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
