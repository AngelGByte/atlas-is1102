# Matriz de revisión de datos personales — Ley 21.719

**Alcance:** revisión documental del prototipo Atlas; no es dictamen jurídico ni
certificación de cumplimiento. Se comparó lo que implementa el código con los principios
y derechos solicitados. La existencia de una ruta administrativa no equivale por sí sola
a un procedimiento efectivo para titulares.

## Fuente y estado temporal

La Ley 21.719 fue publicada el 13-12-2024. El texto oficial disponible en LeyChile de la
Biblioteca del Congreso Nacional indica como fecha de entrada en vigencia el
**1-12-2026**. Consulta: **2026-11-21**. Fuente oficial:
[Ley 21.719, LeyChile/BCN](https://www.bcn.cl/leychile/navegar?idNorma=1209272).

Durante la búsqueda de esta revisión no se pudo corroborar en una fuente legislativa
oficial el estado de un proyecto que movería la fecha al **15-10-2027**. Por tanto, esa
fecha se registra como antecedente no verificado, no como una modificación aprobada ni
como vigencia vigente. Antes de tomar decisiones de cumplimiento, el responsable debe
consultar el historial legislativo oficial y el Diario Oficial nuevamente.

## Principios

| Principio | Evidencia del código | Evaluación real | Brecha / acción |
|---|---|---|---|
| Seguridad | Claves obligatorias al arrancar: `src/server.js:73-75`; cifrado AES-256-GCM: `src/crypto.js:3-38`; acceso por rol y autenticación: `src/server.js:190-220`; TLS de laboratorio: `Caddyfile`, `docker-compose.tls.yml`. | Parcial. Hay controles técnicos y TLS local. | La CA TLS es de laboratorio; faltan despliegue, gestión operativa de llaves, monitoreo y evaluación de incidentes en producción. |
| Confidencialidad | Rutas de escritura/exportación protegidas por `requireAdmin`: `src/server.js:218-220`, `344-381`, `386-447`; campos sensibles cifrados y cuenta bancaria enmascarada: `src/server.js:33-50`. | Parcial. El backend impone roles, pero no existe evidencia de operación productiva. | Definir responsables y perfiles reales, revisar autorizaciones periódicamente y evitar datos reales en laboratorio. |
| Calidad | Validación de clientes, contratos, documentos y usuarios con Zod: `src/validation.js:1-76`; límites de paginación: `src/server.js:85-111`. | Parcial. Se validan forma, formato y límites de entradas. | No hay un proceso del titular para corregir datos ni evidencia de verificación de exactitud durante el ciclo de vida. |
| Proporcionalidad | Campos recogidos en `src/validation.js:9-23` y `db/init.sql:17-46`; cuenta bancaria opcional y notas limitadas. | Parcial. Se observan algunos límites, pero no una evaluación formal de necesidad por finalidad. | Revisar si RUT, teléfono, cuenta bancaria y notas son imprescindibles para cada uso; reducir campos/plazos cuando corresponda. |
| Finalidad e información | Finalidades descritas en `docs/politica-privacidad.md`; el esquema define clientes, contratos y documentos (`db/init.sql:17-74`). | No implementado como mecanismo verificable en la interfaz/API. | Falta responsable identificado, base de licitud por finalidad, aviso visible y registro de preferencias/consentimiento cuando sea aplicable. |
| Responsabilidad | Registro transaccional de eventos: `src/server.js:224-233`; depuración configurable y evento de resultado: `scripts/retention-purge.js:11-44`. | Parcial. Hay trazabilidad técnica y retención de auditoría. | No hay registro de actividades formal, responsable designado, evaluación de impacto, flujo de brechas ni calendario aprobado por categoría. |

## Derechos de las personas titulares

| Derecho | Evidencia del código | Evaluación real | Brecha / acción |
|---|---|---|---|
| Acceso | Exportación JSON de cliente, contratos y documentos: `GET /api/clients/:id/export`, `src/server.js:344-381`. | Parcial. Solo admin autenticado puede ejecutarla; la cuenta bancaria se entrega enmascarada. | No hay canal de solicitud del titular, verificación de identidad, plazo, resolución ni evidencia de entrega. |
| Rectificación | `PUT /api/clients/:id`, `src/server.js:404-425`. | Parcial. Permite corrección administrativa general, no un flujo de derecho del titular. | Añadir recepción, validación, trazabilidad del solicitante y respuesta; conservar dato solo cuando sea lícito. |
| Supresión | `DELETE /api/clients/:id`, `src/server.js:427-445`. | Parcial. La eliminación puede estar impedida por relaciones de contratos y solo la ejecuta un admin. | Definir evaluación de obligaciones/retención, propagación a copias y notificación; el endpoint no implementa solicitud ni respuesta al titular. |
| Oposición | `POST /api/clients/:id/opposition` registra motivo, solicitante y fecha; `PATCH /api/clients/:id/oppositions/:oppositionId` registra resolución, motivo y fecha: `src/server.js:421-474`; validación: `src/validation.js:26-36`; tabla y estados: `db/init.sql:54-72`; auditoría transaccional en `src/server.js:435-438,468-471`. | Parcial. Solo un administrador puede registrar y resolver solicitudes; se conserva el estado `pendiente`, `aceptada` o `rechazada` y la operación queda auditada. | No existe canal de recepción del titular, verificación de identidad, evaluación por finalidad/base, plazo ni comunicación de la decisión. No acredita que se suspenda cada tratamiento relacionado. |
| Portabilidad | Exportación JSON descrita en `src/server.js:344-381`. | Parcial. Es un formato estructurado, pero solo administrativo y con campos sensibles enmascarados. | Definir el alcance/export completo que corresponda, canal seguro y entrega directa al titular o a otro responsable. |
| Bloqueo | Campos `blocked`, `blocked_at` y `blocked_reason`: `db/init.sql:17-39`; operaciones administrativas: `PATCH /api/clients/:id/block` y `/unblock`, `src/server.js:477-524`; exclusión por defecto de listados y resumen: `src/server.js:342-367,526-529`; validación de edición/eliminación: `src/server.js:264-275,554-580`; exportación: `src/server.js:387-419`. | Parcial. El administrador registra motivo y fecha, puede desbloquear explícitamente; el listado y resumen omiten bloqueados, y la exportación continúa disponible. | Es un control administrativo limitado al registro de cliente, no una restricción integral por finalidad ni un flujo ejercido por el titular. No incluye identidad, revisión, plazo ni notificación. |

## Conclusión

El prototipo ofrece controles de seguridad, validación, auditoría, exportación y
eliminación administrativa, pero **no está listo para tratar datos personales reales ni
se declara conforme a la Ley 21.719**. La política en
[`politica-privacidad.md`](./politica-privacidad.md) debe completarse y validarse por la
entidad responsable y asesoría jurídica. La matriz describe solo capacidades observadas
en el repositorio y no acredita su operación en producción.
