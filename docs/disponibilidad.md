# Procedimiento y resultado de disponibilidad

## Procedimiento reproducible

1. Delimitar el sistema y la ventana; documentar versión de aplicación, infraestructura,
   ubicación del probe y dependencias incluidas.
2. Consultar periódicamente `GET /api/health` por el mismo camino usado por clientes.
   Registrar fecha/hora, código HTTP, duración, fallos de conexión y reinicios.
3. Definir antes de medir qué cuenta como indisponibilidad, el intervalo de sondeo y el
   tiempo máximo aceptable de recuperación (RTO).
4. Calcular disponibilidad observada como `sondeos exitosos / sondeos totales × 100`.
   Informar el tamaño de la muestra y reconocer que un sondeo periódico no detecta
   fallos ocurridos entre intervalos.
5. Para una prueba de recuperación, reiniciar una vez un contenedor de laboratorio con
   autorización, registrar inicio del reinicio y primer HTTP 200 posterior. No hacerlo
   en producción sin ventana aprobada.
6. Una prueba breve no acredita un objetivo mensual de disponibilidad. Para comparar con
   99,5 %, se requiere una ventana representativa y una política de mantenimiento que
   excluya únicamente los periodos acordados.

## Resultado de laboratorio — 2026-11-21

Se observó la pila TLS aislada durante **1.814,2 s (30 min 14 s)**, con 30 s entre
sondeos y un reinicio controlado de la aplicación a los 15 minutos. Los **61/61 sondeos**
respondieron HTTP 200; disponibilidad observada por sondeo: **100 %**. El tiempo de
recuperación observado tras el reinicio fue **5,5 s**, con un único sondeo de recuperación.
El reinicio terminó con código 0 y la ventana de observación también terminó con código 0.

La evidencia completa, incluidos los intervalos, reinicio, comandos y salidas, está en
[`evidencias/final/B3-disponibilidad-2026-11-21.txt`](./evidencias/final/B3-disponibilidad-2026-11-21.txt).
Una prevalidación inicial con HTTPS a una dirección IP falló por SNI y se corrigió antes
de iniciar la ventana medida; no forma parte del denominador.

Es una muestra breve de laboratorio. Un sondeo cada 30 s puede pasar por alto interrupciones
entre muestras; 100 % observado no acredita un SLA mensual ni disponibilidad de producción.
