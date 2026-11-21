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
- Sonar sigue sin ejecutarse por falta de credenciales. El último run conocido de Actions en la rama corresponde al commit `8040a2d`; no valida los commits CIERRE posteriores.

La evidencia fechada y los comandos completos de CIERRE-05 se listan en
[`docs/evidencias/README.md`](./evidencias/README.md).
