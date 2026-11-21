# Política de privacidad — prototipo académico

**Estado:** borrador para evaluación académica. No constituye asesoría jurídica ni una
política aprobada para tratar datos personales reales. Antes de cualquier uso productivo,
la organización responsable debe completar sus datos de contacto, validar las bases de
licitud y revisar el texto conforme a la normativa vigente, incluida la Ley 21.719.
La ley fue publicada el 13-12-2024 y el texto oficial de LeyChile fija entrada en vigencia
para el 1-12-2026 (consulta: 2026-11-21). A esa fecha no se localizó en las ediciones
consultadas del Diario Oficial una ley que cambie esa fecha. La ficha legislativa oficial
de la Cámara indica que el proyecto que posterga la vigencia al 15-10-2027 está en trámite
de aprobación presidencial y la nota de la Cámara del 20-11-2026 informa que fue despachado
a promulgación. No se verificó su publicación como ley en las ediciones consultadas; por
tanto, no se presenta la nueva fecha como vigencia legal confirmada. Reconsultar las fuentes
oficiales antes de tomar decisiones. Véase la
[matriz de revisión normativa](./matriz-cumplimiento-datos.md) para fuentes y limitaciones.

## 1. Responsable y alcance

Atlas es un prototipo académico de gestión de clientes, contratos, referencias documentales,
usuarios y auditoría. La entidad responsable del tratamiento, su domicilio y el canal oficial
para solicitudes de titulares están **pendientes de designación**. La instalación de
demostración debe utilizar exclusivamente datos sintéticos.

## 2. Finalidades y bases de licitud

Los datos se tratarían para:

- autenticar usuarios, administrar permisos y proteger las cuentas;
- gestionar clientes, contratos y metadatos de documentos;
- mantener trazabilidad de operaciones relevantes y responder a incidentes;
- atender solicitudes de acceso, rectificación, supresión, oposición y portabilidad;
- conservar o eliminar información según obligaciones contractuales y legales aplicables.

La base de licitud debe determinarse para cada finalidad por la entidad responsable antes
del despliegue. Según el caso, podría corresponder a la ejecución de una relación contractual,
el cumplimiento de una obligación legal, el consentimiento u otra base reconocida por la
normativa aplicable. Este borrador no presume que una base específica sea válida.

## 3. Datos tratados

El modelo contempla nombre, empresa, RUT, correo electrónico, teléfono, nivel de riesgo,
estado y notas del cliente; datos de contratos; nombres, categorías, referencias y estados de
documentos; y nombre, correo, rol, estado y hash de contraseña de usuarios. Las contraseñas
no se almacenan en texto plano.

La cuenta bancaria del cliente se cifra en la base de datos. Las respuestas de la API solo
exponen sus últimos cuatro dígitos. Los registros de auditoría conservan el actor, la
operación, la entidad, su identificador, metadatos técnicos y fecha. No deben registrarse
contraseñas, tokens ni el contenido completo de cuentas bancarias en dichos registros.

## 4. Acceso, destinatarios y seguridad

El acceso se limita a usuarios autenticados según su rol; las operaciones administrativas se
reservan al rol administrador. Los datos se protegen mediante controles de acceso, consultas
parametrizadas, cifrado de campos sensibles en reposo y TLS en el perfil local de laboratorio.
La CA autofirmada de laboratorio no es apropiada para producción.

El prototipo no define destinatarios externos ni transferencias internacionales. Cualquier
proveedor de infraestructura, integración o transferencia debe ser identificado y evaluado por
la entidad responsable antes del uso real.

## 5. Conservación y eliminación

El plazo de conservación de registros de auditoría es configurable mediante
`AUDIT_RETENTION_DAYS`; el valor predeterminado es 365 días. `npm run retention:purge`
elimina registros anteriores al plazo y crea un evento de auditoría con el plazo y la cantidad
eliminada, sin incluir los datos eliminados. La ejecución debe programarse y supervisarse por
la organización responsable.

El prototipo no elimina automáticamente clientes, contratos ni metadatos documentales. Sus
plazos deben definirse de acuerdo con la finalidad, la relación con el titular y las
obligaciones legales aplicables. Las copias de respaldo y sus plazos de expiración también
deben quedar cubiertos por una política operativa.

## 6. Derechos de las personas titulares

La persona titular puede solicitar acceso, rectificación, supresión, oposición, portabilidad
y, cuando corresponda, bloqueo o restricción del tratamiento, conforme a los requisitos y
límites establecidos por la normativa vigente. Para ejercerlos,
deberá utilizar el canal oficial que designe la entidad responsable, acreditar razonablemente
su identidad y señalar el derecho que desea ejercer y los datos involucrados. El canal y los
datos de contacto están pendientes de completar; no se deben inventar direcciones ni
responsables.

El responsable deberá registrar la solicitud, verificar identidad y alcance, responder dentro
del plazo legal aplicable y conservar evidencia mínima del trámite. La ruta
`GET /api/clients/:id/export` genera una copia estructurada, pero solo está disponible para
administradores autenticados; no reemplaza el canal de solicitud del titular ni permite al
titular acceder directamente al sistema. La cuenta bancaria se entrega enmascarada. Las rutas
administrativas `PUT /api/clients/:id` y `DELETE /api/clients/:id` permiten modificar o
eliminar clientes, respectivamente; no registran una solicitud del titular, y la eliminación
puede estar impedida por relaciones de contratos o solicitudes de oposición asociadas.

El prototipo incorpora un registro administrativo de oposición mediante
`POST /api/clients/:id/opposition` y su resolución mediante
`PATCH /api/clients/:id/oppositions/:oppositionId`, con motivo, estado, fechas y auditoría.
También permite bloquear y desbloquear administrativamente mediante
`PATCH /api/clients/:id/block` y `PATCH /api/clients/:id/unblock`. Un cliente bloqueado se
excluye de listados y resúmenes por defecto, no puede modificarse ni eliminarse hasta su
desbloqueo explícito y sigue disponible para exportación administrativa. Solo un administrador
puede ejecutar estos flujos o incluir bloqueados en el listado. Son capacidades técnicas
parciales: no habilitan solicitudes directas del titular, verificación de identidad, evaluación
jurídica, comunicación de la decisión ni control integral de todos los tratamientos. Estas
brechas se detallan en
[`matriz-cumplimiento-datos.md`](./matriz-cumplimiento-datos.md).

## 7. Incidentes y notificación de brechas

Ante una sospecha de acceso, pérdida, alteración o divulgación no autorizada, el equipo debe
contener el incidente, preservar evidencia, evaluar el alcance y los riesgos para las personas,
documentar las decisiones y escalarlo al responsable de privacidad y seguridad. La entidad
responsable determinará las notificaciones a la autoridad y a las personas afectadas conforme
a la normativa vigente, los plazos aplicables y la evaluación del riesgo. El prototipo no
implementa por sí solo un canal de notificación ni un flujo de respuesta formal.

## 8. Revisión

Este borrador debe ser revisado por la entidad responsable y asesoría competente antes de
ser publicado o usado con datos reales. Deben completarse, como mínimo, la identidad y
contacto del responsable, los canales de ejercicio de derechos, las bases de licitud por
finalidad, los plazos de conservación por categoría y los destinatarios efectivos.
