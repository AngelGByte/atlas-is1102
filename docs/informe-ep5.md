# Informe semestral EP5 — Atlas

**Asignatura:** ISY1102  
**Proyecto:** Sistema de Gestión Atlas  
**Iteración:** 3  
**Fecha del informe:** 19 de noviembre de 2026  
**Repositorio:** `AngelGByte/atlas-is1102`

> Este informe utiliza datos sintéticos y resultados registrados en el repositorio. Los
> resultados de pruebas ejecutadas en el laboratorio deben conservar su fecha, entorno y
> archivo de evidencia original.

## 1. Resumen ejecutivo

Atlas es una aplicación web para administrar clientes, contratos, documentos, usuarios y
auditoría. La solución utiliza Node.js/Express, PostgreSQL, Docker Compose y una interfaz
web responsive.

Durante esta iteración se incorporaron controles de calidad, seguridad y automatización:

- Pruebas unitarias e integración con Node Test Runner, Supertest y Vitest.
- Validación de datos con Zod y política de contraseñas robustas.
- Autenticación JWT, control de roles y limitación de intentos.
- Hash bcrypt para contraseñas y cifrado AES-256-GCM para datos sensibles.
- Auditoría transaccional de operaciones críticas.
- Análisis estático con SonarQube y cobertura con c8.
- Plan reproducible de pruebas de carga con Apache JMeter y scripts k6.
- Integración continua mediante GitHub Actions.
- Rediseño responsive de la interfaz y evidencia visual para la presentación.

El estado general es **apto para continuar con los entregables**, con pendientes explícitos:
la ejecución real de HTTPS/TLS, accesibilidad, respaldo/restauración y las corridas finales
de JMeter deben realizarse en el entorno de laboratorio autorizado.

## 2. Objetivos

1. Analizar y ejecutar pruebas de seguridad y funcionalidad.
2. Identificar vulnerabilidades y definir mitigaciones.
3. Automatizar pruebas funcionales, de integración y de rendimiento.
4. Incorporar prácticas de calidad, seguridad, normativa y trazabilidad.
5. Dejar evidencia reproducible para el informe y la presentación.

## 3. Descripción de la solución

### 3.1 Arquitectura

| Componente | Tecnología | Propósito |
|---|---|---|
| Frontend | HTML, CSS y JavaScript | Interfaz responsive para operaciones de gestión |
| Backend | Node.js y Express | API REST, autenticación, autorización y reglas de negocio |
| Persistencia | PostgreSQL 16 | Datos de clientes, contratos, documentos, usuarios y auditoría |
| Despliegue local | Docker Compose | Ejecución reproducible de aplicación y base de datos |
| Calidad | SonarQube, c8 y npm audit | Análisis estático, cobertura y dependencias |
| Rendimiento | k6 y Apache JMeter | Carga, concurrencia, percentiles y errores |

### 3.2 Funcionalidades principales

- Inicio de sesión con JWT de corta duración.
- Roles `admin`, `editor` y `viewer`.
- CRUD de clientes, contratos y documentos.
- Visualización parcial de cuentas bancarias, mostrando solo los últimos cuatro dígitos.
- Cifrado de datos personales en reposo.
- Registro de operaciones críticas en auditoría.
- Interfaz con navegación por módulos, búsqueda, estados y acciones administrativas.

## 4. Estrategia de pruebas

Se utilizaron pruebas positivas, negativas, valores límite, integración, seguridad y
rendimiento. Los casos se encuentran en [`casos-prueba.md`](./casos-prueba.md).

### 4.1 Automatización disponible

```powershell
npm.cmd run test:all
npm.cmd run test:coverage
npm.cmd run test:integration
npm.cmd run quality
```

El workflow [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml) ejecuta las pruebas
y la auditoría de dependencias en cada pull request y push a `main`.

### 4.2 Resultados automatizados actuales

| Suite | Resultado |
|---|---:|
| Node Test Runner | 8 aprobadas, 0 fallidas, 1 omitida por falta de `TEST_DATABASE_URL` |
| Vitest | 4 aprobadas, 0 fallidas |
| Pruebas de integración | Disponibles; requieren PostgreSQL levantado |
| XML del plan JMeter | Válido |
| `npm ci --dry-run` | Correcto |

La integración omitida no se considera aprobada: debe ejecutarse con la base de datos de
laboratorio y registrarse su salida.

## 5. Pruebas de seguridad

### 5.1 Controles implementados

| Riesgo | Control aplicado | Evidencia |
|---|---|---|
| Contraseñas expuestas | bcrypt con política de longitud, mayúscula, minúscula, número y símbolo | `src/server.js`, `src/validation.js` |
| Robo o falsificación de sesión | JWT firmado y expiración | `src/server.js` |
| Escalamiento de privilegios | Roles y autorización en backend | `test/integration/api.test.js` |
| Fuerza bruta | Rate limit para autenticación | `src/server.js` |
| Inyección SQL | Consultas parametrizadas | `src/server.js` |
| Datos sensibles en base | AES-256-GCM para datos personales y cuenta bancaria | `src/crypto.js` |
| Exposición de cuenta bancaria | API muestra únicamente últimos cuatro dígitos | Pruebas de integración y vista Clientes |
| XSS en interfaz | Renderizado con nodos de texto, sin insertar HTML de usuario | `public/app.js` |
| Falta de trazabilidad | Auditoría de operaciones críticas | Tabla `audit_log` y pruebas de integración |
| Cabeceras inseguras | Helmet | `src/server.js` |

### 5.2 Resultados de análisis

El resultado registrado de SonarQube del **28 de octubre de 2026** informa:

| Métrica | Resultado |
|---|---:|
| Bugs | 0 |
| Vulnerabilidades | 0 |
| Security hotspots | 0 |
| Code smells | 0 |
| Duplicación | 2,1 % |
| Cobertura informada por SonarQube | 43,0 % |
| Quality Gate | OK |

El Quality Gate se informó como `OK`, pero se debe aclarar que SonarQube indicó condiciones
ignoradas y condiciones asociadas a código nuevo. Por eso no se interpreta como cumplimiento
automático de una cobertura total mínima.

## 6. Pruebas de rendimiento

### 6.1 Resultado k6 registrado

La prueba principal sobre `GET /api/clients` utilizó:

- 50 usuarios virtuales.
- 30 segundos de subida y bajada.
- 5 minutos de carga.
- 14.528 iteraciones.
- P95: **244,95 ms**.
- Errores HTTP: **0 %**.
- Checks exitosos: **100 %**.

El resultado cumple los umbrales registrados para el caso: P95 menor a 300 ms, errores
menores a 1 % y checks superiores a 99 %. La evidencia está en
[`cp08-clients-result.txt`](./cp08-clients-result.txt).

También existe una corrida sobre `GET /api/empresas/1/clients` con P95 de 213,65 ms,
0 % de errores y 100 % de checks, documentada en
[`resultados-validacion.md`](./resultados-validacion.md).

### 6.2 JMeter

Se incorporó el plan [`../jmeter/atlas-load-test.jmx`](../jmeter/atlas-load-test.jmx), que
ejecuta:

1. Login administrativo.
2. Extracción del token JWT.
3. Consulta autenticada de `GET /api/clients`.
4. Validación de códigos HTTP 200.

La corrida final debe ejecutarse con:

```powershell
jmeter -n -t .\jmeter\atlas-load-test.jmx `
  -JBASE_HOST=127.0.0.1 -JBASE_PORT=3333 `
  -JUSERS=50 -JRAMP_UP=30 -JDURATION=300 `
  -l .\jmeter\results.jtl -e -o .\jmeter\report
```

La salida debe incluirse como evidencia solo después de ejecutarla en el entorno de
laboratorio. Los resultados y reportes generados están excluidos de Git.

## 7. Calidad del software y mantenibilidad

Se aplicaron las siguientes prácticas:

- Separación entre validación, cifrado, servidor y pruebas.
- Scripts npm reproducibles.
- Dependencias fijadas mediante `package-lock.json`.
- CI con Node 22 y `npm ci`.
- Validación de formato con `git diff --check`.
- Documentación de procedimientos, evidencias y limitaciones.
- Uso de datos sintéticos para pruebas y capturas.

La auditoría actual no reporta vulnerabilidades altas ni críticas. Permanecen cuatro
vulnerabilidades moderadas transitorias asociadas a la cadena de `c8` (`glob` y
`minimatch`). No se aplicó `npm audit fix --force` porque propone cambios mayores y puede
romper la cobertura existente; debe revisarse como actividad posterior.

## 8. Normativa, privacidad y aspectos legales

Se aplican principios de minimización y protección de datos:

- No utilizar PII real en pruebas, capturas ni respaldos.
- Limitar la exposición de cuentas bancarias.
- Proteger contraseñas mediante hash irreversible.
- Mantener auditoría de acciones administrativas.
- Separar secretos del código mediante variables de entorno.
- No publicar tokens, contraseñas, respaldos ni archivos `.jtl`.

Pendientes para una revisión normativa completa:

- Definir formalmente finalidad, retención y eliminación de datos.
- Documentar responsables y perfiles de acceso.
- Validar requisitos legales aplicables con el docente o responsable institucional.
- Ejecutar la aplicación detrás de HTTPS/TLS.

## 9. Evidencia visual para la presentación

Las capturas se obtuvieron con datos sintéticos temporales:

1. Inicio de sesión en escritorio.
2. Inicio de sesión responsive en móvil.
3. Mensaje de error de autenticación.
4. Dashboard con métricas de clientes, contratos y riesgo.
5. Módulo Clientes con cuenta bancaria enmascarada.
6. Módulo Contratos con estados, fechas y montos.

Estas capturas demuestran la interfaz y la protección visual de datos, pero no reemplazan la
evidencia de una ejecución contra PostgreSQL real.

## 10. Pendientes y plan de cierre

| Prioridad | Actividad | Criterio de cierre |
|---|---|---|
| Alta | Levantar Docker Desktop y ejecutar integración | 0 fallas, 0 omitidas |
| Alta | Ejecutar plan JMeter final | Registrar P95, errores, throughput y reporte HTML |
| Alta | Ejecutar caso HTTPS/TLS | Certificado válido y sin credenciales por HTTP |
| Media | Ejecutar respaldo y restauración | Base restaurada y registros íntegros |
| Media | Ejecutar revisión responsive/accesibilidad | Casos CP-UI-01 documentados |
| Media | Revisar vulnerabilidades moderadas de c8 | Decisión documentada: actualizar, aceptar o reemplazar |
| Media | Completar trazabilidad de defectos | Cada falla con severidad, pasos y evidencia |

## 11. Conclusión

Atlas cuenta con una base funcional y técnica adecuada para la iteración 3. Las pruebas
automatizadas, los controles de seguridad, el análisis estático, la cobertura, la carga
registrada y la integración continua entregan evidencia verificable de calidad.

La solución no debe declararse completamente liberada hasta ejecutar los casos bloqueados
en el entorno final, especialmente integración con PostgreSQL, HTTPS/TLS, respaldo y
restauración. Con esas evidencias, el equipo podrá cerrar el informe y presentar una
evaluación trazable, reproducible y alineada con los requisitos de la pauta.

## Anexo A — Referencias del repositorio

- [`README.md`](../README.md)
- [`casos-prueba.md`](./casos-prueba.md)
- [`resultados-validacion.md`](./resultados-validacion.md)
- [`entregables-ep5.md`](./entregables-ep5.md)
- [`jmeter/README.md`](../jmeter/README.md)
- [`package.json`](../package.json)
- [`src/server.js`](../src/server.js)
- [`src/crypto.js`](../src/crypto.js)
- [`src/validation.js`](../src/validation.js)
