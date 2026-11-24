# Changelog EP5

## 2026-11-21 — revisión previa B1/B3 (histórica respecto de CIERRE-05)

Las mediciones de carga y cobertura de esta sección corresponden a una ejecución anterior
del mismo día. El addendum CIERRE-05 más abajo contiene las corridas posteriores y vigentes.

- Añadida paginación a `GET /api/clients` con límite 50 por defecto, máximo 200, `page`/`offset`, orden estable y metadatos de total; la interfaz permite navegar páginas.
- Los perfiles de rendimiento midieron SQL, descifrado, serialización y tamaño JSON con 502 filas. La medición confirma menor trabajo por página de 50, pero a 200 usuarios el P95 fue 2.95 s en k6 y 2.294 s en JMeter; no se cumple <300 ms.
- k6 a 50 VU midió P95 97.86 ms; JMeter a 50 usuarios, 53 ms. El JMeter de 200 registró 1 `BindException` entre 5,800 muestras, aunque el proceso terminó con código 0.
- Se añadió comparación de recorrido de las 11 páginas: k6 P95 11.39 s y JMeter 10.342 s por recorrido. Se conserva además el caso por página.
- La corrida de 200 VU alcanzó máximo HTTP 4.57 s, próximo al histórico 4.64 s. Se intentó correlacionar GC/pool, pero el login del proceso instrumentado recibió 401 y no se reintentó; causa indeterminada.
- Tras verificar que no existían contratos asociados, se eliminaron 500 clientes sintéticos y la compañía sintética vacía; la comprobación confirmó cero fixtures.
- Playwright/axe aprobado 9/9 a 1280x800, 390x844 y 320x700; se conservaron las capturas de la primera corrida y un segundo conjunto de 9 capturas de viewport visible para legibilidad, sin sobrescribir evidencias previas.
- La integración comprueba el prefijo bcrypt `$2` y que el hash no contenga la contraseña, sin imprimir el hash; se añadió cobertura para la depuración de registros de auditoría antiguos.
- Se confirmó backup/restauración con conteos por tabla y comparación SHA-256; TLS 3/3 con Caddy en stack aislado.
- Disponibilidad observada durante 1,814.2 s: 61/61 sondas HTTPS 200, un reinicio controlado, RTO 5.5 s. Es una medición breve de laboratorio, no SLA.
- Cobertura c8 medida: 80.91 % líneas/sentencias, 78.44 % ramas y 86.95 % funciones. Node 9/9 sin omitidas, Vitest 4/4, seguridad 19/19, auditorías npm con 0 vulnerabilidades.
- Trivy 0.76.2: imagen reconstruida, 0 HIGH y 0 CRITICAL; informe completo 4 LOW y 7 MEDIUM.
- SonarQube local respondió `UP`, pero no había credenciales para crear token ni secretos Sonar; no se ejecutó el scanner ni se informa Quality Gate.
- El workflow incorpora accesibilidad, TLS, backup/restore y omisión Sonar explícita. El run de esta rama [44948089169](https://github.com/AngelGByte/atlas-is1102/actions/runs/44948089169), commit `8040a2d`, aprobó todos los jobs; Sonar quedó visiblemente omitido y no produjo Quality Gate.
- Se actualizaron los estados de los 18 casos, el registro DEF-01 a DEF-09, la política/matriz de privacidad, procedimiento de disponibilidad e índice de evidencias.

Las salidas, comandos, códigos de salida, diferencias históricas y límites están en
[`docs/evidencias/README.md`](./evidencias/README.md).

## 2026-11-21 — continuación CIERRE-04 a CIERRE-07

- Se implementaron solicitudes administrativas de oposición con estados y auditoría, y bloqueo/desbloqueo de clientes con fecha y motivo. Permanecen como flujos parciales de atención al titular.
- `test:backup` usa Node y puede seleccionar Docker o herramientas PostgreSQL locales; verifica conteos por tabla y hash de `users` sin imprimirlo.
- Se documentaron las fuentes oficiales consultadas sobre la tramitación de la Ley 21.719. No se afirma que la modificación haya sido publicada como ley en el Diario Oficial a la fecha de consulta.
- JMeter se reconfiguró con HttpClient4 y keep-alive. Las corridas repetidas a 50 y 200 usuarios terminaron sin errores de conexión; a 200 usuarios el P95 continúa sobre 300 ms.
- CIERRE-05 midió k6 P95 56.09 ms (50 VU) y 1.73 s (200 VU), y JMeter 63 ms (50 usuarios) y 1,104 ms (200 usuarios). No se atribuye causalidad a pool/GC para el máximo histórico de 4.64 s.
- Se limpiaron los 500 clientes sintéticos tras verificar que no tenían contratos asociados.
- La regresión final local contra PostgreSQL obtuvo Node 9/9 sin omitidas, Vitest 4/4, seguridad 19/19 y c8 83.50/82.15/88.46 % (statements/branches/functions); códigos de salida 0.
- SonarScanner local sigue sin ejecutarse por falta de credenciales; SonarCloud analizó automáticamente el PR y el primer Quality Gate falló. El estado y las correcciones pendientes de re-evaluación se documentan en `docs/sonar-ejecucion.md`.

La evidencia fechada y los comandos completos de CIERRE-05 se listan en
[`docs/evidencias/README.md`](./evidencias/README.md).

## 2026-11-21 — optimización adicional del listado y preparación de presentación

- Se redujo el trabajo de `GET /api/clients`: metadatos de total con `COUNT(*) OVER()`,
  proyección limitada a los campos de tabla y detalle bajo demanda para campos que no
  muestra la lista. La autenticación y comprobación de cuenta activa siguen por solicitud.
- Se midió k6/JMeter con 50 y 200 usuarios, 500 clientes sintéticos, token de un único login
  por corrida y keep-alive en JMeter. Los cuatro conjuntos de medición tuvieron cero errores
  HTTP/conexión. A 200 usuarios, P95 quedó en 746.95 ms (k6) y 494 ms (JMeter): aún supera
  el objetivo de 300 ms.
- k6 pasó dos corridas a 100 VU; a 150 VU hubo una pasada y una repetición fuera del umbral.
  No se declara capacidad universal ni se atribuye causalidad a GC/pool para el máximo
  histórico de 4.64 s.
- La regresión final local obtuvo Node 9/9, Vitest 4/4, seguridad 19/19 y c8 83.87 %
  líneas/sentencias, 82.27 % ramas y 88.88 % funciones; auditorías npm 0.
- Trivy 0.76.2 reportó 0 HIGH/CRITICAL, 4 LOW y 7 MEDIUM. El último Actions conocido de
  `main` (44955653856) falló en Gitleaks; Sonar quedó sin análisis/Quality Gate.
- Se prepararon capturas móviles de UI con datos sintéticos/de demostración. La presentación
  se edita como copia; Sonar y TestCase Studio quedan sin rellenar al no existir evidencia
  actual accesible.

Los valores completos y los archivos de salida nuevos están en
[`docs/resultados-validacion.md`](./resultados-validacion.md) y
[`docs/evidencias/README.md`](./evidencias/README.md).

## 2026-11-22 — CIERRE-10: SonarCloud y hardening del CI

- Se verificó que SonarCloud ya tiene la organización gratuita `angelgbyte` y el proyecto
  público `AngelGByte_atlas-is1102`, vinculado al repositorio. La integración automática
  analizó `main` en `a97a8c8`; el Quality Gate fue `ERROR` con 7 vulnerabilidades abiertas.
- Se fijaron todas las GitHub Actions a los SHA completos consultados en sus tags oficiales.
- Gitleaks no encontró secretos en los cambios staged; se suprimieron únicamente cuatro
  fingerprints exactos de identificadores públicos SonarCloud confirmados como falsos
  positivos.
- Las pruebas de seguridad ahora generan sus credenciales inválidas de forma aleatoria en
  tiempo de ejecución, sin literales que parezcan secretos.
- El test de respaldo invoca Docker por ruta absoluta configurable mediante `DOCKER_PATH`;
  rechaza rutas relativas y la ruta se documentó en README. La configuración Sonar ahora
  usa la clave de proyecto y organización correctas.
- Regresión local final: Node 9/9 sin omitidas, Vitest 4/4, seguridad 19/19, c8
  83.87/82.27/88.88 % y backup/restauración verificado; todos los comandos finales
  terminaron con código 0.
- SonarCloud analizó automáticamente el commit publicado y aprobó el Quality Gate (`OK`),
  con cero issues abiertos. El job manual de Actions siguió omitido por falta de secretos;
  su estado verde no se confunde con el resultado independiente de SonarCloud.

La evidencia completa está en [`docs/evidencias/README.md`](./evidencias/README.md).

## 2026-11-22 — CIERRE-11: verificación posterior a publicación

- Se confirmó el run `44980251380` sobre `2b9c756` con todos los jobs de Actions en
  `success`. El job manual de Sonar informó omisión por falta de secretos; el análisis
  automático independiente de SonarCloud sí se ejecutó.
- SonarCloud confirmó Quality Gate `OK` y cero issues abiertos en el commit publicado.
- Gitleaks volvió a pasar sin hallazgos no suprimidos; sus exclusiones adicionales cubren
  únicamente seis identificadores públicos del reporte SonarCloud.
- Las respuestas de API y el resumen del run quedaron guardados en
  [`docs/evidencias/README.md`](./evidencias/README.md).

## 2026-11-23 — escalado para 200 usuarios y evidencias EP5

- Se implementó `node:cluster`, con `WEB_CONCURRENCY` configurable y acotado por los CPU
  asignados. Compose configura 2 CPU y 2 workers. Se verificaron reemplazo de workers caídos,
  health HTTP 200 y cierre ordenado por SIGTERM.
- El rate limit de login (10 intentos/15 min) se trasladó a un almacén PostgreSQL compartido
  y atómico. La prueba S-18, ejecutada con dos procesos, confirma HTTP 429 en el intento 11.
  El pool se mantuvo en 10; 2 workers × 10 = 20, frente a `max_connections=100`.
- La regresión final fue `npm test` 9/9, Vitest 4/4, seguridad 19/19, cobertura c8
  76.06/81.81/81.08 % (líneas/sentencias, ramas, funciones), `npm audit` 0 y
  Playwright/axe 9/9.
- Se midió k6 y JMeter a 50, 100, 150 y 200 usuarios, con `limit=50`, 500 clientes
  sintéticos, un login por corrida y 1 s de espera. Todas las 11 corridas registraron cero
  errores. A 200, k6 P95 419.92 ms y JMeter 154 ms; el objetivo <300 ms no se cumple de forma
  consistente. A 150, dos corridas por instrumento quedaron bajo 300 ms; es el máximo probado
  repetidamente que cumple, no una capacidad universal.
- Se guardaron las métricas P95/P99, throughput y CPU promedio/máxima de app, PostgreSQL y
  generador; el resumen y las salidas están en
  [`EP5-20261123-performance-results.csv`](./evidencias/final/EP5-20261123-performance-results.csv)
  y en [`evidencias/README.md`](./evidencias/README.md).
- SonarCloud y Actions se consultaron sin credenciales: ambos reportaban `OK/success` para
  `main` en `c6dbe5d`; no constituyen una validación de la rama actual. Trivy 0.76.2 reportó
  0 HIGH/CRITICAL, 4 LOW, 7 MEDIUM; `npm audit` reportó 0.
- Gitleaks staged no encontró secretos no suprimidos. Cuatro alertas iniciales correspondían
  a IDs públicos de análisis/evento SonarCloud comprobados sin autenticación; se añadieron
  exclusiones por línea exacta y se volvió a escanear.
- Se capturaron dashboard, clientes y contratos con Playwright a 390×844. No existe
  `docs/evidencias/testcase-studio/`; los espacios TCS/código generado de la presentación
  quedan deliberadamente sin completar.
- Se actualizaron resultados de validación, DEF-09 e índice de evidencias. La presentación
  completa se registra con su propio commit y sus propias evidencias.

## 2026-11-23 — presentación final y render PDF

- Se completaron 12 marcadores visuales con evidencias de la rama. El diagrama de
  arquitectura y la cobertura destacada también se actualizaron para reflejar Caddy/TLS
  configurado y la cobertura medida de 76,06 %.
- La diapositiva de rendimiento informa las corridas reales k6/JMeter y la diapositiva
  DEF-09 refleja el resultado a 200 usuarios. Se preservaron el campo del docente y las
  observaciones del profesor.
- Se generaron el PPTX y el PDF finales con 15 diapositivas. Se revisaron las 15
  diapositivas renderizadas a PNG (1600×900); no se observaron desbordamientos de texto.
- PH_TCS y PH_UIAUTO permanecen como recuadros pendientes: no existe
  `docs/evidencias/testcase-studio/`.
- El comando, fecha, tamaños y validación están en
  [`EP5-20261123-presentacion.txt`](./evidencias/final/EP5-20261123-presentacion.txt);
  el índice enlaza el [PPTX](./Presentacion_Final_EP5_Atlas_completada.pptx) y el
  [PDF](./Presentacion_Final_EP5_Atlas_completada.pdf).
