# Checklist para informe y presentación EP5

Este checklist vincula los requisitos de la pauta con evidencia reproducible del proyecto.
Las ejecuciones deben realizarse con datos sintéticos y en un entorno autorizado.

| Requisito | Implementación / evidencia | Estado |
|---|---|---|
| Pruebas funcionales automatizadas | Node Test Runner, Vitest y Supertest; `npm run test:all` | Listo |
| Pruebas de seguridad | Roles, JWT, rate limit, validación Zod, bcrypt, cifrado AES-256-GCM y auditoría | Listo para ejecutar casos |
| Pruebas de carga | Plan [`../jmeter/atlas-load-test.jmx`](../jmeter/atlas-load-test.jmx) y scripts k6 existentes | Listo para ejecutar |
| Calidad y vulnerabilidades | SonarQube, cobertura c8, `npm audit --audit-level=high` y workflow CI | Listo |
| Automatización futura | [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml) ejecuta pruebas y auditoría en cada PR | Listo |
| Normativa y aspectos legales | Minimización de datos, roles, auditoría, retención y uso de datos sintéticos | Revisar y documentar con el docente |
| HTTPS/TLS | La configuración local usa HTTP deliberadamente | Pendiente de proxy TLS del laboratorio |
| Accesibilidad y responsive | Casos CP-UI-01 en [`casos-prueba.md`](./casos-prueba.md) | Ejecutar con navegador |
| Respaldos y restauración | Procedimiento `pg_dump`/restauración en [`../README.md`](../README.md) | Ejecutar y adjuntar evidencia |

## Evidencia mínima por ejecución

Registrar fecha, commit, sistema operativo, versiones de Node/PostgreSQL/JMeter,
configuración de concurrencia, resultado, percentiles, errores, capturas y ruta del log.
No incluir contraseñas, tokens, PII ni respaldos sin protección.

## Comandos principales

```powershell
npm.cmd run quality
npm.cmd run test:integration
docker compose ps
docker compose --profile analysis up -d sonarqube
jmeter -n -t .\jmeter\atlas-load-test.jmx -JUSERS=50 -JDURATION=300 -l .\jmeter\results.jtl -e -o .\jmeter\report
```

Un caso omitido por falta de base de datos o herramienta no equivale a un caso aprobado:
debe registrarse como **Bloqueado** y explicarse la acción de mitigación.
