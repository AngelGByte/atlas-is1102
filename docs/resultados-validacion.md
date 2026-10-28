# Resultados de validacion tecnica

Fecha de ejecucion: 2026-10-28

## Entorno y pruebas

- Atlas y PostgreSQL se iniciaron con Docker Compose; se reconstruyo la imagen de Atlas y `/api/health` respondio `ok`.
- Pruebas automatizadas con PostgreSQL disponible: 9 aprobadas, 0 fallidas y 0 omitidas. Incluyen integracion de inicio de sesion, roles, proteccion de datos y auditoria.
- Cobertura de c8: 59.59 % de statements/lineas, 64.78 % de branches y 72.22 % de funciones.
- `npm audit`: 0 vulnerabilidades reportadas.

## Analisis SonarQube

Analisis finalizado correctamente el 2026-10-28 en el proyecto `atlas-is1102`, usando SonarQube Community Build 26.10.0.133 y SonarScanner CLI 8.1.0.6389.

El servidor local usa una base de datos embebida de evaluacion. SonarQube advierte que esa base no debe usarse para escalar ni como almacenamiento de produccion.

| Medida | Resultado |
|---|---:|
| Lineas de codigo (NCLOC) | 1266 |
| Bugs | 0 |
| Vulnerabilidades | 0 |
| Security hotspots | 0 |
| Code smells | 0 |
| Duplicacion | 2.1 % |
| Cobertura informada por SonarQube | 43.0 % |
| Quality Gate | OK |

El Quality Gate figura como `OK`, pero SonarQube informa `ignoredConditions: true` y las condiciones mostradas son de codigo nuevo. Por tanto, ese estado no significa que la cobertura total de 43.0 % cumpla por si sola un umbral general. La cobertura de SonarQube y la de c8 se conservan como medidas distintas.

Durante el primer analisis se detecto una condicion redundante en una lista desplegable; se simplifico y el analisis final ya no reporta bugs abiertos.

## Alcance pendiente

Estos resultados no acreditan pruebas de TLS/HTTPS, rendimiento o carga, accesibilidad, restauracion de respaldos ni cumplimiento normativo. Deben ejecutarse y documentarse por separado antes de afirmar que esos requisitos estan aprobados. La gestion documental almacena referencias y metadatos, no archivos.

## Evidencia para el informe

El dashboard local esta disponible en <http://localhost:9000/dashboard?id=atlas-is1102>. Guardar una captura legible del resumen y adjuntarla al informe junto con la fecha y las medidas anteriores. No incluir tokens, contrasenas, datos personales ni respaldos con datos del laboratorio en las capturas.
