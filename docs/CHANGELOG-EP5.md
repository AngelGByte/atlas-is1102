# Changelog EP5

## 2026-11-21 — revisión de cierre en `ep5-cierre-final`

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
- El workflow incorpora accesibilidad, TLS, backup/restore y omisión Sonar explícita. YAML validado localmente; el run de `main` [44938310610](https://github.com/AngelGByte/atlas-is1102/actions/runs/44938310610) aprobó jobs históricos, pero no valida el workflow nuevo de esta rama.
- Se actualizaron los estados de los 18 casos, el registro DEF-01 a DEF-09, la política/matriz de privacidad, procedimiento de disponibilidad e índice de evidencias.

Las salidas, comandos, códigos de salida, diferencias históricas y límites están en
[`docs/evidencias/README.md`](./evidencias/README.md).
