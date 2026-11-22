# Resultados de validación técnica EP5

**Fecha de revisión:** 2026-11-21  
**Rama de referencia:** `main` (`32a38b0`; optimización local aún no publicada)  
**Entorno:** Node.js 22, PostgreSQL 16 de laboratorio, 500 clientes sintéticos más 2 clientes
de demostración. No se usaron datos personales reales.

Los resultados de esta revisión se separan de los históricos. Cada comando, salida y código
de salida reproducible se conserva bajo [`evidencias/README.md`](./evidencias/README.md).

## Comparación con el informe anterior

Los valores de la columna anterior son cifras informadas en el reporte precedente; no se
volvieron a ejecutar durante esta revisión. La última columna sí corresponde a ejecuciones
nuevas de esta rama.

| Métrica | Informe anterior | Medición actual | Diferencia / interpretación |
|---|---:|---:|---|
| c8 líneas/sentencias | 79.89 % | 80.91 % | +1.02 puntos porcentuales |
| c8 ramas | 75.88 % | 78.44 % | +2.56 puntos porcentuales |
| c8 funciones | 85.71 % | 86.95 % | +1.24 puntos porcentuales |
| `npm test` | 9/9, 0 omitidas | 9/9, 0 omitidas | Sin cambio |
| `npm run test:security` | 19/19 | 19/19 | Sin cambio |
| k6, 50 VU, listado paginado P95 | 1,190 ms | 97.86 ms | Menor latencia; carga y configuración nuevas |
| k6, 200 VU, listado paginado P95 | 7.7 s | 2.95 s | Mejora, pero incumple <300 ms |
| JMeter, 50 usuarios, P95 | 70 ms | 53 ms | Menor latencia |
| JMeter, 200 usuarios, P95 | 7.894 s | 2.294 s | Mejora, pero incumple <300 ms; nueva corrida tuvo 1 error de conexión |

La cobertura aumentó tras incorporar pruebas de hash bcrypt, retención y paginación. El
umbral de c8 se mantiene en 70 %: aunque la cobertura actual de ramas permite 75 %, el
resultado histórico de ramas estaba solo 0.88 puntos sobre ese límite, un margen insuficiente
para subirlo con seguridad. Las pruebas nuevas de carga usan `limit=50`; no son directamente
comparables con todas las corridas históricas de listado completo.

## Parte A — reconfirmación

La salida completa de las cuatro regresiones, auditorías y 300 repeticiones se preservó en
[`final/A-reconfirmacion-2026-11-21.txt`](./evidencias/final/A-reconfirmacion-2026-11-21.txt).

| Verificación | Resultado actual | Estado |
|---|---|---|
| `npm test` | 9 aprobadas, 0 fallidas, 0 omitidas; código 0 | Reconfirmado |
| `npm run test:vitest` | 4 aprobadas; código 0 | Reconfirmado |
| `npm run test:security` | 19/19; código 0 | Reconfirmado |
| `npm run test:coverage` | c8: 80.91 % statements/lines, 78.44 % branches, 86.95 % functions; umbral 70 %; código 0 | Reconfirmado |
| `npm audit` | 0 vulnerabilidades; código 0 | Reconfirmado |
| `npm audit --omit=dev` | 0 vulnerabilidades; código 0 | Reconfirmado |
| `node --test test/crypto.test.js`, 300 repeticiones | 0 fallos; código final 0 | Reconfirmado |
| `docker-compose.yml` | Secretos requeridos sin valores predeterminados (`:?...`); líneas 7, 25, 27-31 | Reconfirmado por inspección |
| `Dockerfile` | `npm ci --omit=dev --ignore-scripts`; línea 5 | Reconfirmado por inspección |
| Validación de `id` | `app.param('id', ...)`, `src/server.js:253` | Reconfirmado por inspección |
| Parser JSON | `entity.parse.failed` responde mensaje genérico 400, `src/server.js:619-620` | Reconfirmado por inspección |
| Exportación de cliente | `GET /api/clients/:id/export`, auditoría `recordAudit`, `src/server.js:344-381` | Reconfirmado por inspección |

## Parte B1 — rendimiento y paginación

`GET /api/clients` conserva un arreglo JSON, limita la página por defecto a 50 y permite un
máximo de 200 mediante `limit` y `page` u `offset`; incluye cabeceras de total y mantiene un
orden estable. La UI ofrece navegación entre páginas. Las pruebas de integración cubren
límite, entradas inválidas, orden y total.

### Perfil de 502 filas

| Consulta | Filas | SQL medido | Descifrado | JSON | Tamaño JSON |
|---|---:|---:|---:|---:|---:|
| Completa | 502 | 10.877 ms | 46.318 ms | 4.610 ms | 193,030 bytes |
| Página de 50 | 50 | 4.064 ms | 8.158 ms | 1.504 ms | 19,251 bytes |
| Página de 200 | 200 | 8.113 ms | 61.895 ms | 4.270 ms | 77,001 bytes |

La muestra de descifrado de 200 filas es atípica frente a las otras dos; no se atribuye a GC
ni a arranque en frío. `EXPLAIN ANALYZE` sobre 502 filas usó secuencial scan y sort top-N.
El tiempo de ejecución SQL del plan fue menor a 1 ms; el perfil también incluye ida y vuelta
de consulta. No se añadió un índice porque la muestra pequeña no mostró beneficio que lo
justifique. La configuración de pool conserva `PG_POOL_MAX=10` por defecto.

### Cargas nuevas

Cada perfil tuvo un único login; el token se mantuvo solo en una variable de proceso. Los
parámetros comparables fueron 30 s de rampa, 60 s de carga sostenida, límite 50, think time
1 s y 502 filas. k6 hizo ramp-down de 30 s; JMeter usó duración total de 90 s, incluidos
30 s de rampa. Los comandos exactos y salidas completas se enlazan en cada fila.

| Modo / herramienta | Usuarios | Muestras HTTP | Errores | Throughput | P95 HTTP | P99 HTTP | CPU app (% de un núcleo) | Código |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Paginado, k6 | 50 VU | 4,374 | 0 | 36.35 req/s | 97.86 ms | 408.46 ms | 34.3 % | 0 |
| Paginado, k6 | 200 VU | 8,816 | 0 | 72.96 req/s | 2,950 ms | 4,140 ms | 69.9 % | 99 por umbral P95 |
| Paginado, JMeter | 50 | 3,641 | 0 | 41.05 req/s | 53 ms | 84 ms | 32.0 % | 0 |
| Paginado, JMeter | 200 | 5,800 | 1 `BindException` | 87.09 req/s | 2,294 ms | 2,558 ms | 70.2 % | 0 |
| Recorrido de páginas, k6 | 50 VU | 4,708 | 0 | 37.04 req/s | 40.61 ms/página | 90.89 ms/página | 25.8 % | 0 |
| Recorrido de páginas, JMeter | 50 | 3,650 | 0 | 41.05 req/s | 32 ms/página | 56 ms/página | 24.1 % | 0 |

Para el recorrido completo de 11 páginas, k6 midió P95/P99 de iteración de 11.39/11.50 s.
JMeter completó 307 recorridos y midió 10,342/10,453 ms P95/P99 desde el inicio de la primera
página hasta el fin de la página 11. Los percentiles de página no equivalen a los del recorrido
completo. Evidencia: [`B1-jmeter-full-traversal-2026-11-21.txt`](./evidencias/final/B1-jmeter-full-traversal-2026-11-21.txt).

El objetivo de P95 <300 ms se cumple a 50 usuarios para páginas individuales y se incumple a
200 en ambas herramientas. JMeter a 200 reportó una muestra `Non HTTP response code:
java.net.BindException: Address already in use: connect`; el proceso terminó con código 0,
pero se informa el error explícitamente. Ningún JTL incluye el prefijo característico de un JWT.

Los resultados k6/JMeter difieren aunque ambas configuraciones usaron autenticación válida,
un solo token temporal por corrida, la misma página de 50 filas y pacing de 1 s. En los datos
se observan diferencias de throughput, modelo de concurrencia y una falla de socket de JMeter;
no se aisló de forma independiente la reutilización keep-alive ni la distribución de conexión
al pool. Por ello, no se atribuye la diferencia a credenciales, payload, keep-alive o pool sin
medición que lo demuestre.

El máximo de k6 en la corrida de 200 VU fue 4.57 s, próximo al máximo histórico de 4.64 s.
Esto reproduce la magnitud, no su causa. La telemetría previa independiente registró una pausa
GC máxima de 49.65 ms y un `pool.waitingCount` máximo de 167; terminó aproximadamente 32 minutos
antes de las corridas k6 y no se puede asociar a ellas. El intento adicional de correlacionar
GC/pool bajo carga no llegó a medir tráfico porque el login del proceso instrumentado recibió
401; no se reintentó ni se reinició para eludir límites. La espera de pool durante las corridas
k6 queda sin medición y la causa del máximo sigue **indeterminada**. Las salidas están en
`final/B1-*`.

## Parte B2 — imagen y Sonar

La imagen `atlas-is1102-final:2026-11-21`, digest
`sha256:693ee3aba6ec979af1c00dce18198a77e3653546b13f2a586d35e4869bf8bb4c`, se reconstruyó.
Trivy 0.76.2 encontró 0 HIGH y 0 CRITICAL; el informe completo encontró 4 LOW y 7 MEDIUM.
El escaneo con umbral HIGH/CRITICAL terminó con código 0. El reporte histórico de 10 HIGH no
se reproduce en esta imagen; imagen/digest y base de vulnerabilidades deben considerarse al
comparar. No quedaron vulnerabilidades altas o críticas que requirieran corrección en este
resultado.

SonarQube local 26.10.0.133078 respondió `UP`, pero no había credenciales administrativas ni
token local; no se intentaron credenciales predeterminadas y no se ejecutó SonarScanner local.
Posteriormente, la integración automática de SonarCloud analizó el PR #1 y falló el Quality
Gate por Security Rating C y cinco issues abiertos en código nuevo (tres medios del workflow
y dos bajos de resolución de ejecutables por `PATH`). La evidencia API está en
[`cierre/CIERRE-02-sonar-pr-1-pre-correccion-2026-11-21.json`](./evidencias/cierre/CIERRE-02-sonar-pr-1-pre-correccion-2026-11-21.json).
Se corrigió la instalación del workflow para usar `--ignore-scripts` en todos los `npm ci` y
ejecutar el Playwright local; también se justificaron las dos llamadas de herramientas fijas
del script local. La re-evaluación queda pendiente: no se afirma aún que el Gate pase ni que los
hallazgos hayan desaparecido. Véase [`sonar-ejecucion.md`](./sonar-ejecucion.md).

## Parte B3 — casos parciales, privacidad y disponibilidad

- CP-UI-01: Playwright/axe 9/9: login, listado y formulario a 1280x800, 390x844 y 320x700.
  Capturas legibles en [`evidencias/final/ui-2026-11-21-final-confirmation/`](./evidencias/final/ui-2026-11-21-final-confirmation/).
- CP-SEG-02: la integración comprueba hash bcrypt `$2` y ausencia de la contraseña en el hash
  sin imprimir el valor.
- CP-SEG-04: backup/restore comparó conteos por tabla y SHA-256 de `users`; la restauración
  coincidió. Salida en [`final/B3-backup-2026-11-21.txt`](./evidencias/final/B3-backup-2026-11-21.txt).
- CP-SEG-05: oposición y bloqueo administrativos están implementados con auditoría y pruebas,
  pero no existe autoservicio del titular ni un proceso integral por finalidad. El prototipo
  no se declara conforme ni apto para datos personales reales.
- Ley 21.719: la ficha oficial de BCN/LeyChile consultada el 2026-11-21 indica vigencia
  2026-12-01. No se corroboró en fuente legislativa oficial la propuesta de postergación al
  2027-10-15; esa fecha permanece no verificada en
  [`matriz-cumplimiento-datos.md`](./matriz-cumplimiento-datos.md).
- CP-DIS-01: ventana aislada de 1.814,2 s, 61/61 respuestas HTTP 200 y reinicio controlado;
  disponibilidad observada por sondeo 100 %, RTO 5,5 s. No acredita SLA mensual; véase
  [`disponibilidad.md`](./disponibilidad.md).

## Parte B4 — CI

El run histórico de `main`, [44938310610](https://github.com/AngelGByte/atlas-is1102/actions/runs/44938310610),
commit `d3970f1`, terminó `success`; no valida esta rama. Tras publicar `ep5-cierre-final`,
el run [44948089169](https://github.com/AngelGByte/atlas-is1102/actions/runs/44948089169)
del commit `8040a2d4a20a5a2395d964cd49f62862841a4b6a` terminó `success` (código 0):
`accessibility`, `gitleaks`, `dependency-audit`, `security`, `test`, `backup-restore`,
`tls` y `coverage` aprobaron. El job `sonar` también terminó success al informar la omisión
explícita; los pasos de análisis fueron skipped por falta de secretos y no hay Quality Gate.
Salida y comando verificables en
[`final/B4-actions-branch-44948089169-2026-11-21.txt`](./evidencias/final/B4-actions-branch-44948089169-2026-11-21.txt).

El workflow actualizado incorpora jobs para accesibilidad, TLS y backup/restore, y marca
explícitamente Sonar como `OMITIDO` cuando faltan secretos. La sintaxis YAML, los jobs, el
ámbito de variables Sonar y la espera de PostgreSQL se validaron localmente; evidencia en
[`final/B4-workflow-syntax-2026-11-21.txt`](./evidencias/final/B4-workflow-syntax-2026-11-21.txt).

## Parte B5 — documentación y casos

La matriz contiene 18 casos con estados actuales e históricos separados en
[`casos-prueba.md`](./casos-prueba.md). DEF-01 a DEF-08 registran causa, corrección, commit y
regresión histórica; DEF-09 documenta el defecto de rendimiento en
[`registro-defectos.md`](./registro-defectos.md). El índice de evidencias mantiene comandos,
fechas, resultados y archivos; el changelog distingue los cambios de esta revisión.

## Resultados históricos que no se atribuyen a esta ejecución

El análisis SonarQube de 2026-10-28 y sus métricas se conservan únicamente como antecedente.
También se conservan CP-08 previos de 213.65 ms y 244.95 ms, las corridas iniciales de carga,
el máximo de 4.64 s y el reporte Trivy anterior de 10 HIGH. Ninguna de esas cifras sustituye
las mediciones nuevas presentadas arriba.

## Addendum CIERRE-05 — carga y regresión posterior (2026-11-21)

Las corridas JMeter nuevas usaron HttpClient4 y keep-alive y no reprodujeron `BindException`;
no se atribuye una causa raíz al error anterior. El comando inicial con la imagen Docker no
llegó a enviar solicitudes por un error de parseo de argumentos y se excluye de las métricas.

| Herramienta | Usuarios | Muestras | Errores | Throughput | P95 | P99 | CPU app (% de un núcleo) | Código |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| k6 | 50 VU | 4,448 | 0 | 36.95 req/s | 56.09 ms | 108.32 ms | 30.6 % | 0 |
| k6 | 200 VU | 10,343 | 0 | 85.66 req/s | 1.73 s | 2.07 s | 82.9 % | 99 por umbral P95 |
| JMeter | 50 | 3,633 | 0 | 40.3 req/s | 63 ms | 266 ms | 33.6 % | 0 |
| JMeter | 200 | 10,639 | 0 | 117.7 req/s | 1,104 ms | 1,391 ms | 87.5 % | 0 |

El objetivo P95 <300 ms se cumple a 50 usuarios en ambas herramientas y no se cumple a 200.
La carga fue paginada a 50 registros por solicitud. k6 incluyó 30 s de ramp-down, mientras
JMeter tuvo 90 s totales; ambos usaron un login por corrida, token temporal y 1 s de think
time. No se midieron niveles entre 50 y 200, por lo que 50 es el único nivel probado que
cumple, no una capacidad máxima demostrada.

La telemetría sincronizada observó CPU de hasta 82.9 % (k6) y 87.5 % (JMeter) a 200 usuarios,
espera del pool (`waitingCount` máximo 128 y 115) y pausas GC máximas aproximadas de 45.48 ms
y 31.44 ms, respectivamente. El perfil CPU agregado incluyó intervalos sin carga y muestra
trabajo de cifrado/descifrado y serialización, pero no cuantifica su contribución por solicitud.
`EXPLAIN ANALYZE` midió 1.062 ms para la página de 50 filas sobre 502 registros. El
experimento único con pool 20 dio P95 1.91 s frente a 1.73 s con pool 10; se conserva el
predeterminado 10. El máximo nuevo fue 2.23 s y no reprodujo el histórico de 4.64 s; aunque
se midieron simultáneamente pool y GC, no se demuestra causalidad y el origen del máximo
histórico sigue indeterminado.

Tras CIERRE-04, los flujos administrativos de oposición/bloqueo están implementados y cubiertos
por pruebas; su estado es parcial como derecho del titular. El caso CP-SEG-05 y la matriz
reflejan esa limitación.

La regresión posterior a CIERRE-04/05, contra PostgreSQL 16, terminó con código 0 en los
cuatro comandos: Node 9/9 con cero omitidas; Vitest 4/4; seguridad 19/19; c8 83.50 %
statements/lines, 82.15 % branches y 88.46 % functions. Evidencia completa:
[`cierre/CIERRE-05-regresion-reintento-2026-11-21.txt`](./evidencias/cierre/CIERRE-05-regresion-reintento-2026-11-21.txt).
El detalle de carga, los perfiles, EXPLAIN y limpieza está en
[`cierre/CIERRE-05-resumen-2026-11-21.txt`](./evidencias/cierre/CIERRE-05-resumen-2026-11-21.txt)
y el índice actualizado en [`evidencias/README.md`](./evidencias/README.md).

## Addendum — optimización de listado y presentación (2026-11-21)

Esta ejecución parte del `main` local `32a38b0`; los cambios de código y evidencias aún no
están publicados. Las mediciones de este addendum son nuevas y prevalecen para evaluar la
optimización local. No reemplazan ni reescriben los informes históricos.

| Herramienta | Usuarios | Muestras | Errores | Throughput | P95 | P99 | CPU promedio/máximo app (ventana Docker) | Código |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| k6 | 50 VU | 4,480 | 0 | 37.12 req/s | 24.40 ms | 57.91 ms | 32.1/108.2 % | 0 |
| k6 | 200 VU | 13,589 | 0 | 112.52 req/s | 746.95 ms | 930.60 ms | 47.6/105.5 % | 99 (umbral P95) |
| JMeter | 50 | 3,678 | 0 | 40.8 req/s | 16 ms | 33 ms | 32.1/108.2 % | 0 |
| JMeter | 200 | 12,747 | 0 | 141.2 req/s | 494 ms | 598 ms | 47.6/105.5 % | 0 |

Todas las corridas usaron `limit=50`, 502 registros (500 sintéticos más 2 de demostración),
un login y un token temporal por corrida y 1 s de espera. k6 usó rampa de 30 s y 60 s de
carga sostenida; JMeter fue no GUI, HttpClient4 con keep-alive, rampa de 30 s y 90 s totales.
Los errores de conexión fueron cero. El código 99 de k6 a 200 VU indica que se cruzó el
umbral de latencia configurado, no errores HTTP. El objetivo P95 <300 ms no se cumple a 200.
100 VU pasó dos corridas (P95 97.98 y 89.06 ms); 150 VU pasó una (294.16 ms) y falló la
repetición (338.65 ms). Se identifica 100 VU como el nivel máximo probado repetidamente
que cumple el umbral, no como una capacidad universal.

Respecto de las últimas cifras documentadas de CIERRE-05 (k6 56.09 ms/1.73 s y JMeter
63 ms/1,104 ms a 50/200 usuarios), los P95 nuevos disminuyeron en 56.5 %, 56.8 %, 74.6 %
y 55.3 %, respectivamente. Una medición baseline adicional en la misma sesión obtuvo
k6 27.97 ms/1.15 s y JMeter 25/931 ms; frente a esa línea base, los P95 optimizados
fueron 24.40 ms/746.95 ms y 16/494 ms. Estas series son ejecuciones separadas, no se
mezclan en una única línea base.

`docker stats` promedió 32.1 % de un núcleo a 50 usuarios y 47.6 % a 200; el máximo
observado fue 108.2 % y 105.5 %. A 200, memoria promedió 82.2 MiB y alcanzó 96.4 MiB.
El pool `pg` permaneció en `PG_POOL_MAX=10`; el perfil instrumentado observó
`waitingCount` máximo 80 y pausas GC de hasta 31.85 ms, pero incluyó intervalos sin carga
y no explica causalmente picos de latencia. `EXPLAIN ANALYZE` sobre 502 filas midió 1.349 ms
para la consulta de página y mostró `Seq Scan`, `WindowAgg` y orden top-N; no se añadió un
índice por falta de beneficio medible en este volumen. No hay límites CPU/memoria en el
contenedor app. Se mantuvo la consulta de autenticación de usuario en cada solicitud para
preservar revocación inmediata.

Una muestra del perfil de página bajó de 19,251 a 13,114 bytes (31.9 %). En esas muestras
SQL/descifrado variaron de 4.064/8.158 ms a 7.539/10.087 ms y serialización de 1.504 a
1.409 ms; son observaciones únicas y no prueban una mejora de cada etapa por separado. El
máximo histórico de 4.64 s no se reprodujo en las corridas optimizadas (máximo k6 1.04 s) y
su causa continúa indeterminada.

La regresión medida tras la optimización fue Node 9/9 sin omitidas, Vitest 4/4, seguridad
19/19 y c8 83.87 % líneas/sentencias, 82.27 % ramas y 88.88 % funciones; los cuatro
comandos finalizaron con código 0 contra PostgreSQL 16. `npm audit` y
`npm audit --omit=dev` reportaron cero vulnerabilidades. Trivy 0.76.2 reportó 0 HIGH,
0 CRITICAL, 4 LOW y 7 MEDIUM.

El run más reciente de Actions en `main` a la fecha de esta revisión histórica
(2026-11-21) fue
[44955653856](https://github.com/AngelGByte/atlas-is1102/actions/runs/44955653856),
commit `32a38b07e05c90add48196ca5e8af99fe788f623`: seguridad, backup-restore, coverage,
test, accessibility, dependency-audit, TLS y el job condicional de Sonar concluyeron
`success`; Gitleaks concluyó `failure` por coincidencias históricas en el reporte Sonar.
El job de Sonar no ejecutó análisis ni Quality Gate. Un escaneo local completo también
detectó los valores del `.env` local ignorado por Git y dos identificadores de proyecto
Sonar; el informe está redactado y no se versionan credenciales. No se afirma que Gitleaks
ni Sonar hayan quedado aprobados en Actions.

Playwright generó capturas móviles de dashboard, clientes y contratos con datos de
demostración/sintéticos. Un contrato temporal sintético de presentación se eliminó antes
del cierre. La carpeta `docs/evidencias/testcase-studio/` no existe; no hay captura TCS.
En esa revisión del 2026-11-21 tampoco se produjo una captura/Quality Gate actual de Sonar;
la actualización CIERRE-10 a continuación registra el análisis automático que se obtuvo
después. La presentación original se conserva; la copia completada está en
`C:\Users\rpg72\Downloads\Presentacion_Final_EP5_Atlas_completada.pptx`. Se reemplazaron
12 placeholders y se actualizaron las cifras de carga; quedan vacíos Sonar y TestCase
Studio por falta de evidencia. La apertura/exportación a PDF no se ejecutó porque no hay
un renderizador local disponible; la comprobación realizada es estructural, no visual.
El índice de comandos, fechas, resultados y salidas está en
[`evidencias/README.md`](./evidencias/README.md).

## Actualización CIERRE-10 — 2026-11-22

Se confirmó en SonarCloud la organización gratuita `angelgbyte` y el proyecto público
`AngelGByte_atlas-is1102`. El análisis automático de `main` para el commit
`a97a8c8146a775fbf0282c4acb55d80c19fbc568` finalizó con Quality Gate `ERROR` y
7 vulnerabilidades abiertas: 1 blocker, 3 de impacto alto, 2 de impacto medio y 1 bajo.
La salida completa de API es
[`CIERRE-10-sonar-baseline-2026-11-22.json`](./evidencias/final/CIERRE-10-sonar-baseline-2026-11-22.json).

### Verificación posterior CIERRE-11

El análisis SonarCloud posterior, para el commit publicado
`2b9c756ddb0f3e7e0f734efe7274316c2e3ac01b`, terminó con Quality Gate `OK` y 0 issues
abiertos, incluidas 0 vulnerabilidades abiertas. Esto confirma en la revisión actual que
las reglas previas no aparecen como hallazgos abiertos. Su respuesta API está en
[`CIERRE-11-sonar-post-2026-11-22.json`](./evidencias/final/CIERRE-11-sonar-post-2026-11-22.json).

El run más reciente de Actions de `main` sobre el commit publicado fue
[#44980251380](https://github.com/AngelGByte/atlas-is1102/actions/runs/44980251380),
con conclusión `success`; sus jobs test, security, coverage, dependency-audit, gitleaks,
accessibility, TLS y backup-restore pasaron. El job `sonar` informó la omisión por falta
de secretos y sus pasos de scanner fueron `skipped`; el Quality Gate `OK` corresponde al
análisis automático independiente de SonarCloud. La salida completa está en
[`CIERRE-11-actions-2026-11-22.txt`](./evidencias/final/CIERRE-11-actions-2026-11-22.txt).

La regresión final ejecutada en PostgreSQL aislado fue Node 9/9 sin omitidas, Vitest 4/4,
seguridad 19/19, c8 83.87 % líneas/sentencias, 82.27 % ramas y 88.88 % funciones; además,
backup/restauración verificó conteos y hash coincidentes. Todos los comandos finales
terminaron con código 0. La evidencia también conserva los primeros intentos fallidos y
explica por qué no son el resultado final:
[`CIERRE-10-regresion-2026-11-22.txt`](./evidencias/final/CIERRE-10-regresion-2026-11-22.txt).
