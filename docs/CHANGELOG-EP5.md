# CHANGELOG EP5

## 2026-11-21

- Eliminada la contraseña administrativa predeterminada; ahora `ADMIN_PASSWORD` es obligatorio.
- `.env.example` dejó marcadores de secretos en blanco.
- Preparados datos sintéticos de 500 clientes y limpieza sin contratos.
- Corregida la configuración del host predeterminado de k6 y parametrizados los loops de JMeter; el token de JMeter se obtiene del entorno sin pasarlo como propiedad.
- Corridas finales k6/JMeter contra 500 clientes: 0 errores HTTP; P95 <300 ms solo en JMeter a 50 usuarios. Las otras tres corridas no cumplen el umbral.
- Analizada la telemetría y la traza GC; no hay evidencia suficiente para atribuir el máximo histórico de 4,64 s a una causa única.
- Verificada la ausencia de contratos y limpiados los 500 clientes sintéticos.
- Reconstruida la imagen retirando npm/npx del runtime; Trivy final: 0 HIGH y 0 CRITICAL.
- TLS en stack aislado: 3/3; Node 9/9 sin omitidas, Vitest 4/4, seguridad 19/19, accesibilidad 6/6.
- Cobertura c8 final: 79.89 % statements/lines, 75.88 % branches y 85.71 % functions; ambas auditorías npm reportaron 0 vulnerabilidades.
- Sonar permanece bloqueado por secretos/servicio ausentes; no se atribuye la desaparición de hallazgos de Sonar. El resultado de Actions del push actual debe añadirse después de verificarlo.
- Las salidas, fechas, comandos, códigos de salida y límites históricos están indexados en [`docs/evidencias/README.md`](./evidencias/README.md).
