# Matriz inicial de casos de prueba

Los casos están diseñados para el Sistema Atlas descrito en la primera entrega. Se aplican particiones de equivalencia, valores límite, pruebas negativas, pruebas funcionales y priorización basada en riesgo. Esta matriz es de diseño; el resultado obtenido y la evidencia se completan después de ejecutar cada caso en el entorno de laboratorio.

| ID | Prioridad | Requisito ERS | Precondiciones y datos | Pasos principales | Resultado esperado / aceptación | Tipo |
|---|---|---|---|---|---|---|
| CP-AUT-01 | Alta | RF autenticación | Sistema disponible; cuenta activa; credenciales válidas | Abrir Atlas, ingresar correo y clave válidos, iniciar sesión | Se autentica, muestra el resumen según rol y registra el inicio en auditoría | Funcional / smoke |
| CP-AUT-02 | Alta | NFR-SEG-2 | Cuenta activa; contraseña incorrecta | Intentar login con correo válido y clave errónea | Respuesta genérica 401, no revela si existe el correo y no crea sesión | Seguridad / negativo |
| CP-CLI-01 | Alta | RF gestión de clientes | Sesión admin; datos válidos | Crear cliente con nombre, empresa, correo y contacto | HTTP 201; aparece en la tabla; evento create queda en auditoría | Funcional / integración |
| CP-CLI-02 | Alta | NFR-SEG-3 | Sesión admin; cuenta de prueba `001234567890` | Crear cliente con cuenta bancaria; revisar vista y almacenamiento autorizado | La interfaz y API muestran solo los últimos cuatro dígitos; la BD guarda texto cifrado, no el número original | Seguridad / inspección |
| CP-CLI-03 | Media | ERS datos de cliente | Sesión admin | Probar correo inválido, nombre vacío y nota de más de 1000 caracteres | El sistema responde 400; no persiste el registro inválido | Funcional / particiones |
| CP-ROL-01 | Alta | NFR-SEG-4, RB-4 | Sesión editor activa | Enviar una solicitud POST para crear cliente y luego consultar clientes | Lectura permitida; escritura denegada con 403; ningún registro nuevo | Seguridad / autorización |
| CP-ROL-02 | Alta | NFR-SEG-4 | Editor autenticado y administrador disponible | Administrador desactiva al editor; reutilizar el token del editor | Solicitud posterior responde 401 y la cuenta no conserva acceso | Seguridad / sesión |
| CP-AUD-01 | Alta | RF-6.1, NFR-SEG-6 | Sesión admin | Crear, actualizar y eliminar una entidad de prueba | Cada operación se registra con actor, módulo, identificador y hora; cambios y auditoría son atómicos | Integración / auditoría |
| CP-CTO-01 | Alta | Reglas de contratos | Cliente existente; sesión admin | Crear contrato con valor cero y fechas iguales; luego probar término anterior al inicio | Caso límite válido se acepta; intervalo invertido se rechaza con 400 | Funcional / valores límite |
| CP-DOC-01 | Media | RF gestión documental | Contrato existente; sesión admin | Crear documento vinculado al contrato y cambiar su estado | Documento aparece con contrato y estado correctos; operación se registra en auditoría | Funcional / integración |
| CP-UI-01 | Media | NFR-USAB-1 a NFR-USAB-4 | Navegador de escritorio y móvil; sesión activa | Navegar por módulos a 320 px y 1280 px; completar una tarea de lectura | Navegación visible, campos etiquetados, foco perceptible y sin desplazamiento horizontal de página | Usabilidad / compatibilidad |
| CP-PERF-01 | Media | NFR-PERF-1 a NFR-PERF-3 | Ambiente y volumen de datos controlados | Medir CRUD y página con carga y concurrencia acordadas | Registrar percentiles, errores y concurrencia; comparar con los límites exactos del ERS (<300 ms CRUD, <2 s carga y 200 usuarios) | Rendimiento |
| CP-SEG-01 | Alta | NFR-SEG-1 | Entorno TLS configurado por el laboratorio | Navegar por HTTPS; inspeccionar certificado, protocolo y redirección | Certificado válido para el entorno, TLS habilitado y sin transmitir credenciales por HTTP | Seguridad / configuración |
| CP-SEG-02 | Alta | NFR-SEG-2 | Aplicación levantada | Verificar hash de la cuenta en BD; probar clave que no cumple política | No hay contraseña en texto plano; hash bcrypt; política exige 12 caracteres, mayúscula, minúscula, número y símbolo | Seguridad / inspección |
| CP-SEG-03 | Alta | NFR-SEG-5 | Sesión admin; entorno de prueba aislado | Enviar valores inválidos y caracteres de marcado desde formulario/API; revisar salida, logs y cookies | Rechazo o representación segura; no se ejecuta entrada como HTML; errores no exponen SQL, secretos o trazas; autenticación no depende de cookies | Seguridad / negativo |
| CP-SEG-04 | Alta | NFR-SEG-7 | Base de datos de laboratorio y volumen de prueba | Generar backup con `pg_dump`, restaurarlo en una base descartable y verificar registros | Copia restaurable y datos íntegros; registrar duración, comandos y evidencia sin exponer claves | Recuperación / laboratorio |
| CP-SEG-05 | Alta | NFR-SEG-8 | Datos sintéticos; revisión de flujo de tratamiento | Revisar campos recogidos, finalidad, acceso por rol, retención y registros | Solo se almacenan datos necesarios; acceso y auditoría son verificables; documentar brechas legales pendientes | Cumplimiento / revisión |
| CP-DIS-01 | Media | NFR-DIS-1, NFR-DIS-2 | Ventana de observación y entorno estable | Registrar disponibilidad; simular parada/mantenimiento siguiendo autorización y revisar recuperación | Comparar medición con 99,5% mensual y ventana de mantenimiento definida en ERS; no inferir cumplimiento desde prueba breve | Disponibilidad / recuperación |

## Registro de ejecución (completar en el laboratorio)

Para cada fila registra fecha/hora, navegador/versión, sistema operativo, versión de base de datos, build, pasos exactos, resultado obtenido, estado `Aprobado / Falla / Bloqueado`, ID de defecto y nombre/ruta de la captura o log. No marques un caso como aprobado hasta comparar evidencia con su criterio de aceptación.

## Ciclo sugerido

1. **Preparación:** anota entorno, versión, datos de prueba y herramientas; captura estado inicial.
2. **Ciclo 1 — Smoke test:** ejecuta CP-AUT-01 y verifica que la pantalla principal cargue. Si falla, detén la prueba y registra los casos dependientes como bloqueados.
3. **Ciclo 2 — Casos funcionales y negativos:** sigue los pasos en el orden de la matriz y compara resultado esperado con obtenido.
4. **Ciclo 3 — Seguridad y calidad:** ejecuta permisos, datos sensibles, auditoría, usabilidad y rendimiento en el entorno controlado.
5. **Defectos:** registra un ID `BUG-###`, severidad `Crítica / Mayor / Menor / Cosmética`, pasos de reproducción, esperado/obtenido, evidencia y requisito afectado.
6. **Cierre:** contabiliza casos ejecutados/aprobados/fallidos/bloqueados y recomienda liberar o corregir y repetir el ciclo.

Las pruebas de seguridad deben limitarse a esta aplicación y al entorno de laboratorio autorizado. No uses datos personales reales.
