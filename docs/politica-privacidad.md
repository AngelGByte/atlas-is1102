# Política de privacidad — borrador académico

**Estado:** borrador para evaluación académica. No constituye asesoría jurídica ni una
política aprobada para tratar datos personales reales. Antes de cualquier uso productivo,
la organización responsable debe completar sus datos de contacto, validar las bases de
licitud y revisar el texto conforme a la normativa vigente, incluida la Ley 21.719.

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
documentos; y datos de cuenta de usuario. Las contraseñas se almacenan como hashes.

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

La persona titular puede solicitar acceso, rectificación, supresión, oposición y portabilidad,
conforme a los requisitos y límites establecidos por la normativa vigente. Para ejercerlos,
deberá utilizar el canal oficial que designe la entidad responsable, acreditar razonablemente
su identidad y señalar el derecho que desea ejercer y los datos involucrados. El canal y los
datos de contacto están pendientes de completar; no se deben inventar direcciones ni
responsables.

El responsable deberá registrar la solicitud, verificar identidad y alcance, responder dentro
del plazo legal aplicable y conservar evidencia mínima del trámite. La ruta
`GET /api/clients/:id/export` genera una copia estructurada para portabilidad, pero solo está
disponible para administradores autenticados; no reemplaza el canal de solicitud del titular
ni permite al titular acceder directamente al sistema. La cuenta bancaria se entrega
enmascarada.

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
