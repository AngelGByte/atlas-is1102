# Registro de defectos DEF-01 a DEF-08

| ID | Hallazgo | Causa | Corrección | Commit | Regresión |
|---|---|---|---|---|---|
| DEF-01 | Configuración aceptaba secretos débiles o ausentes | Validación incompleta | Se exigieron JWT_SECRET y secretos cifrados en arranque | c3e3d4a | 9/9 Node; Sonar no se ejecutó en este cierre, por lo que su hallazgo histórico no se considera revalidado |
| DEF-02 | Instalación podía ejecutar scripts de dependencias | Uso inseguro de npm ci | Dockerfile usa `--omit=dev --ignore-scripts`; npm/npx se retiran de la imagen runtime | d529b65 | Imagen final y Trivy 0 HIGH/CRITICAL; el hallazgo de Sonar sobre `--ignore-scripts` no se confirmó ni descartó |
| DEF-03 | Rutas podían aceptar identificadores inválidos | Falta de validación numérica | Validación de IDs | ba8bf95 | 9/9 Node |
| DEF-04 | Errores del analizador JSON exponían detalle interno | Tratamiento insuficiente de parser | Respuesta genérica 400 | 0ab36fd | Seguridad S-13 |
| DEF-05 | Posible problema de integridad del cifrado | Prueba/corrección de bit invertido | Se corrigió el cifrado y regresión asociada | df01ae9 | 9/9 Node |
| DEF-06 | Cobertura antigua y dependencias vulnerables | Herramienta desactualizada | c8 actualizado y auditoría de dependencias | 6804a51 | c8 final: 79.89 % líneas/sentencias, 75.88 % ramas, 85.71 % funciones; `npm audit` y `npm audit --omit=dev` reportaron 0 |
| DEF-07 | Calidad no integrada | Falta de CI | PostgreSQL y pruebas en GitHub Actions | 3e24cea, 4a00585 | Workflow del commit `aad4e43` [44937958682](https://github.com/AngelGByte/atlas-is1102/actions/runs/44937958682) aprobó test, coverage, security, dependency-audit y gitleaks |
| DEF-08 | Comunicación sin TLS completo | Proxy HTTP no configurado | Caddyfile y compose TLS preparados | 2dd4dc0 | TLS 3/3 en el stack local aislado; [`EP5-tls-final-2026-11-21.txt`](./evidencias/EP5-tls-final-2026-11-21.txt) |

Las evidencias de la regresión final y las limitaciones de las corridas están en
[`docs/evidencias/README.md`](./evidencias/README.md). La causa del máximo histórico de 4,64 s
permanece indeterminada; no se atribuye a GC, pool o arranque en frío sin prueba concluyente.
