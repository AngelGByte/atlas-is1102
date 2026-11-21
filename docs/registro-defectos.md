# Registro de defectos DEF-01 a DEF-08

| ID | Hallazgo | Causa | Corrección | Commit | Regresión |
|---|---|---|---|---|---|
| DEF-01 | Configuración aceptaba secretos débiles o ausentes | Validación incompleta | Se exigieron JWT_SECRET y secretos cifrados en arranque | c3e3d4a | 9/9 Node |
| DEF-02 | Instalación podía ejecutar scripts de dependencias | Uso inseguro de npm ci | Dockerfile usa `--omit=dev --ignore-scripts` | d529b65 | Seguridad e imagen |
| DEF-03 | Rutas podían aceptar identificadores inválidos | Falta de validación numérica | Validación de IDs | ba8bf95 | 9/9 Node |
| DEF-04 | Errores del analizador JSON exponían detalle interno | Tratamiento insuficiente de parser | Respuesta genérica 400 | 0ab36fd | Seguridad S-13 |
| DEF-05 | Posible problema de integridad del cifrado | Prueba/corrección de bit invertido | Se corrigió el cifrado y regresión asociada | df01ae9 | 9/9 Node |
| DEF-06 | Cobertura antigua y dependencias vulnerables | Herramienta desactualizada | c8 actualizado y auditoría de dependencias | 6804a51 | c8 79.89 % actual |
| DEF-07 | Calidad no integrada | Falta de CI | PostgreSQL y pruebas en GitHub Actions | 3e24cea, 4a00585 | Última ejecución conocida fallida por Gitleaks |
| DEF-08 | Comunicación sin TLS completo | Proxy HTTP no configurado | Caddyfile y compose TLS preparados | 2dd4dc0 | Solo 1/3 validado por puertos ausentes |
