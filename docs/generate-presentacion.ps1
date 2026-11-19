$ErrorActionPreference = 'Stop'
$root = 'C:\Users\rpg72\.copilot\chats\bc161b48-539d-4eb7-be46-d3b2d0e6c2e7\atlas-is1102'
$output = Join-Path $root 'docs\Presentacion_Final_EP5_Atlas.pptx'
$downloads = 'C:\Users\rpg72\Downloads\Presentacion_Final_EP5_Atlas.pptx'
$assetDir = Join-Path $env:TEMP 'atlas-presentation-assets'
if (Test-Path $assetDir) { Remove-Item -Recurse -Force $assetDir }
New-Item -ItemType Directory -Path $assetDir | Out-Null

function Write-Svg([string]$name, [string]$body) {
  $path = Join-Path $assetDir $name
  Set-Content -Path $path -Value $body -Encoding UTF8
  return $path
}

$dashboard = Write-Svg 'dashboard.svg' @'
<svg xmlns="http://www.w3.org/2000/svg" width="880" height="495" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#f4f7fb"/><rect width="250" height="720" fill="#102a43"/>
<text x="35" y="58" fill="#fff" font-family="Arial" font-size="28" font-weight="bold">A  atlas.</text>
<text x="28" y="110" fill="#a9bfd1" font-family="Arial" font-size="12">ESPACIO DE TRABAJO</text>
<g fill="#eaf3f7" font-family="Arial" font-size="16"><text x="55" y="155">▣  Resumen</text><text x="55" y="205">◉  Clientes</text><text x="55" y="255">▤  Contratos</text><text x="55" y="305">▧  Documentos</text><text x="55" y="355">♙  Usuarios</text><text x="55" y="405">◷  Auditoría</text></g>
<text x="285" y="48" fill="#6b7c93" font-family="Arial" font-size="12" letter-spacing="2">PANEL DE CONTROL</text><text x="285" y="82" fill="#172b4d" font-family="Arial" font-size="28" font-weight="bold">Resumen</text>
<text x="285" y="135" fill="#172b4d" font-family="Arial" font-size="22" font-weight="bold">Hola, Administrador</text><text x="285" y="162" fill="#6b7c93" font-family="Arial" font-size="14">Este es el estado actual de tu espacio de trabajo.</text>
<g fill="#fff" stroke="#e6edf3"><rect x="285" y="195" width="215" height="120" rx="14"/><rect x="520" y="195" width="215" height="120" rx="14"/><rect x="755" y="195" width="215" height="120" rx="14"/><rect x="990" y="195" width="215" height="120" rx="14"/></g>
<g fill="#6b7c93" font-family="Arial" font-size="14"><text x="305" y="225">Clientes</text><text x="540" y="225">Contratos</text><text x="775" y="225">Activos</text><text x="1010" y="225">Riesgo alto</text></g>
<g fill="#172b4d" font-family="Arial" font-size="34" font-weight="bold"><text x="305" y="275">24</text><text x="540" y="275">18</text><text x="775" y="275">12</text><text x="1010" y="275">3</text></g>
<rect x="285" y="345" width="920" height="275" rx="14" fill="#fff" stroke="#e6edf3"/><text x="310" y="382" fill="#172b4d" font-family="Arial" font-size="18" font-weight="bold">Clientes y contratos recientes</text>
<g font-family="Arial" font-size="14" fill="#526170"><text x="320" y="430">Andes Tecnología SpA</text><text x="320" y="475">Norte Servicios Ltda.</text><text x="320" y="520">Pacífico Ingeniería</text><text x="760" y="430">Implementación plataforma Atlas</text><text x="760" y="475">Soporte y continuidad operacional</text></g>
</svg>
'@

$clients = Write-Svg 'clients.svg' @'
<svg xmlns="http://www.w3.org/2000/svg" width="880" height="495" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#f4f7fb"/><rect width="250" height="720" fill="#102a43"/><text x="35" y="58" fill="#fff" font-family="Arial" font-size="28" font-weight="bold">A  atlas.</text>
<g fill="#eaf3f7" font-family="Arial" font-size="16"><text x="55" y="155">▣  Resumen</text><text x="55" y="205" font-weight="bold">◉  Clientes</text><text x="55" y="255">▤  Contratos</text><text x="55" y="305">▧  Documentos</text><text x="55" y="355">♙  Usuarios</text><text x="55" y="405">◷  Auditoría</text></g>
<text x="285" y="48" fill="#6b7c93" font-family="Arial" font-size="12" letter-spacing="2">RELACIONES COMERCIALES</text><text x="285" y="84" fill="#172b4d" font-family="Arial" font-size="28" font-weight="bold">Clientes</text><text x="285" y="128" fill="#172b4d" font-family="Arial" font-size="20" font-weight="bold">Clientes registrados</text><text x="285" y="153" fill="#6b7c93" font-family="Arial" font-size="13">Información de empresas y contactos</text>
<rect x="285" y="185" width="920" height="360" rx="14" fill="#fff" stroke="#e6edf3"/><g fill="#6b7c93" font-family="Arial" font-size="12"><text x="310" y="220">CLIENTE</text><text x="570" y="220">CONTACTO</text><text x="760" y="220">RIESGO</text><text x="870" y="220">ESTADO</text><text x="990" y="220">CUENTA BANCARIA</text></g>
<g font-family="Arial" font-size="14" fill="#172b4d"><text x="310" y="270">Andes Tecnología SpA</text><text x="570" y="270">camila@andes.cl</text><text x="760" y="270">Bajo</text><text x="870" y="270">Activo</text><text x="990" y="270">•••• 7890</text><text x="310" y="350">Norte Servicios Ltda.</text><text x="570" y="350">diego@norte.cl</text><text x="760" y="350">Medio</text><text x="870" y="350">Activo</text><text x="990" y="350">•••• 4421</text><text x="310" y="430">Pacífico Ingeniería</text><text x="570" y="430">sofia@pacifico.cl</text><text x="760" y="430">Alto</text><text x="870" y="430">Activo</text><text x="990" y="430">•••• 1198</text></g>
</svg>
'@

$contracts = Write-Svg 'contracts.svg' @'
<svg xmlns="http://www.w3.org/2000/svg" width="880" height="495" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#f4f7fb"/><rect width="250" height="720" fill="#102a43"/><text x="35" y="58" fill="#fff" font-family="Arial" font-size="28" font-weight="bold">A  atlas.</text>
<g fill="#eaf3f7" font-family="Arial" font-size="16"><text x="55" y="155">▣  Resumen</text><text x="55" y="205">◉  Clientes</text><text x="55" y="255" font-weight="bold">▤  Contratos</text><text x="55" y="305">▧  Documentos</text><text x="55" y="355">♙  Usuarios</text><text x="55" y="405">◷  Auditoría</text></g>
<text x="285" y="48" fill="#6b7c93" font-family="Arial" font-size="12" letter-spacing="2">ACUERDOS Y SERVICIOS</text><text x="285" y="84" fill="#172b4d" font-family="Arial" font-size="28" font-weight="bold">Contratos</text><text x="285" y="128" fill="#172b4d" font-family="Arial" font-size="20" font-weight="bold">Seguimiento de acuerdos</text><text x="285" y="153" fill="#6b7c93" font-family="Arial" font-size="13">Fechas, responsables, montos y estados</text>
<rect x="285" y="185" width="920" height="290" rx="14" fill="#fff" stroke="#e6edf3"/><g fill="#6b7c93" font-family="Arial" font-size="12"><text x="310" y="220">CONTRATO</text><text x="570" y="220">CLIENTE</text><text x="760" y="220">VIGENCIA</text><text x="950" y="220">MONTO CLP</text><text x="1100" y="220">ESTADO</text></g>
<g font-family="Arial" font-size="14" fill="#172b4d"><text x="310" y="275">Implementación plataforma Atlas</text><text x="570" y="275">Andes Tecnología SpA</text><text x="760" y="275">2026</text><text x="950" y="275">$12.500.000</text><text x="1100" y="275">Activo</text><text x="310" y="365">Soporte y continuidad operacional</text><text x="570" y="365">Norte Servicios Ltda.</text><text x="760" y="365">2026</text><text x="950" y="365">$4.800.000</text><text x="1100" y="365">Pendiente</text></g>
</svg>
'@

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = -1
$pres = $ppt.Presentations.Add()
$pres.PageSetup.SlideSize = 15
$navy = 0x432A10
$teal = 0x927D14
$ink = 0x4D2B17
$muted = 0x937C6B
$light = 0xFBF7F4

function Add-Text($slide, [string]$text, [float]$left, [float]$top, [float]$width, [float]$height, [float]$size = 20, [bool]$bold = $false, [int]$color = $ink) {
  $box = $slide.Shapes.AddTextbox(1, $left, $top, $width, $height)
  $box.TextFrame.TextRange.Text = $text
  $box.TextFrame.TextRange.Font.Name = 'Aptos'
  $box.TextFrame.TextRange.Font.Size = $size
  $box.TextFrame.TextRange.Font.Bold = $bold
  $box.TextFrame.TextRange.Font.Color.RGB = $color
  $box.TextFrame.WordWrap = -1
  return $box
}

function Add-Title($slide, [string]$title, [string]$kicker) {
  Add-Text $slide $kicker 42 25 850 20 11 $true $teal | Out-Null
  Add-Text $slide $title 42 48 850 50 28 $true $navy | Out-Null
}

function Add-Footer($slide, [int]$number) {
  Add-Text $slide "Atlas · ISY1102 · EP5" 42 505 400 18 9 $false $muted | Out-Null
  Add-Text $slide "$number" 900 505 25 18 9 $true $muted | Out-Null
}

function Add-Bullets($slide, [string[]]$items, [float]$left = 65, [float]$top = 150, [float]$width = 820, [float]$height = 300, [float]$size = 18) {
  $box = Add-Text $slide (($items | ForEach-Object { "• $_" }) -join "`r") $left $top $width $height $size $false $ink
  $box.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 9
  return $box
}

function Add-TableText($slide, [string]$text, [float]$left = 55, [float]$top = 145, [float]$width = 850, [float]$height = 300, [float]$size = 14) {
  $shape = Add-Text $slide $text $left $top $width $height $size $false $ink
  $shape.Fill.ForeColor.RGB = 0xFFFFFF
  $shape.Line.ForeColor.RGB = 0xDDE7EE
  $shape.TextFrame.MarginLeft = 14
  $shape.TextFrame.MarginTop = 12
  return $shape
}

function Add-Slide([string]$title, [string]$kicker, [string[]]$bullets, [int]$number) {
  $slide = $pres.Slides.Add($pres.Slides.Count + 1, 12)
  $bg = $slide.Shapes.AddShape(1, 0, 0, 960, 540)
  $bg.Fill.ForeColor.RGB = $light
  $bg.Line.Visible = 0
  Add-Title $slide $title $kicker
  Add-Bullets $slide $bullets 65 150 820 300 16
  Add-Footer $slide $number
  return $slide
}

$slide = $pres.Slides.Add(1, 12)
$bg = $slide.Shapes.AddShape(1, 0, 0, 960, 540); $bg.Fill.ForeColor.RGB = $navy; $bg.Line.Visible = 0
Add-Text $slide 'ISY1102 · SEGURIDAD Y CALIDAD' 62 70 700 22 13 $true 0xD7F2EE | Out-Null
Add-Text $slide 'Sistema de Gestión Atlas' 62 170 820 75 40 $true 0xFFFFFF | Out-Null
Add-Text $slide 'Entrega final · Iteración 3' 62 255 700 40 24 $false 0xD7F2EE | Out-Null
Add-Text $slide 'Ángel Eleazar Venegas Valladares · Israel Jesús Poblete Gajardo' 62 425 820 25 13 $false 0xFFFFFF | Out-Null
Add-Text $slide 'Sección 001D · 19 de noviembre de 2026' 62 458 820 22 11 $false 0xB9D2D7 | Out-Null

Add-Slide '¿Qué evaluamos?' '01 · CONTEXTO' @(
  'Aplicación web para administrar clientes, contratos, documentos, usuarios y auditoría.',
  'Arquitectura: frontend estático, API REST Express y PostgreSQL en Docker Compose.',
  'Objetivo: verificar funcionalidad, seguridad, calidad, rendimiento y cumplimiento.',
  'Alcance controlado: laboratorio con datos sintéticos; no equivale a producción.'
) 2
Add-Slide 'Criterios de calidad' '02 · CALIDAD' @(
  'Usabilidad: navegación clara, formularios etiquetados y diseño responsive.',
  'Seguridad: JWT, roles, bcrypt, AES-256-GCM, rate limit, Helmet y SQL parametrizado.',
  'Confiabilidad: validación de entradas, transacciones, auditoría y healthcheck.',
  'Rendimiento: P95 < 300 ms, errores HTTP < 1 % y checks > 99 % en el escenario.',
  'Mantenibilidad: SonarQube, cobertura c8, Vitest y GitHub Actions.'
) 3
Add-Slide 'Estrategia de pruebas' '03 · PLAN' @(
  'Enfoque mixto: automatizado, integración, seguridad, carga y revisión visual.',
  'Preparación → smoke test → funcional/negativo → seguridad → rendimiento → cierre.',
  'Priorización por riesgo: autenticación, permisos, datos sensibles y auditoría.',
  'Datos sintéticos, entorno aislado, evidencias con fecha y repetición de fallas.',
  'Salida: sin fallas críticas abiertas y pendientes explícitos.'
) 4
Add-Slide 'Herramientas y automatización' '04 · TOOLCHAIN' @(
  'Node Test Runner + Supertest: pruebas unitarias, API e integración.',
  'Vitest 5.1.1: validación rápida de reglas de negocio.',
  'k6 + Apache JMeter: carga, percentiles, checks y errores.',
  'SonarQube + c8: calidad estática, seguridad, duplicación y cobertura.',
  'GitHub Actions: npm ci, pruebas y npm audit en cada PR.'
) 5

$slide = Add-Slide 'Casos de prueba principales' '05 · COBERTURA' @(
  'CP-03: editor puede leer, pero no escribir.',
  'CP-06: acción crítica genera auditoría con actor y entidad.',
  'CP-07: entrada manipulada no crea sesión ni revela SQL.',
  'CP-08: listado de clientes dentro del umbral de latencia.',
  'CP-09: análisis estático y corrección del hallazgo inicial.',
  'Nuevos: CRUD, cifrado, revocación, contratos, documentos y responsive.'
) 6

Add-Slide 'Seguridad implementada' '06 · SEGURIDAD' @(
  'Autenticación genérica: no revela si el correo existe.',
  'Autorización backend por roles admin, editor y viewer.',
  'Contraseñas con bcrypt y política de 12+ caracteres.',
  'Datos personales y cuenta bancaria cifrados con AES-256-GCM.',
  'La interfaz y API muestran solo los últimos cuatro dígitos bancarios.',
  'Auditoría transaccional de operaciones críticas.'
) 7

$slide = Add-Slide 'Resultados de rendimiento' '07 · PERFORMANCE' @(
  'GET /api/clients: 50 usuarios virtuales, 5 minutos y ramp-up de 30 segundos.',
  '14.528 iteraciones ejecutadas.',
  'P95: 244,95 ms.',
  'Errores HTTP: 0 %.',
  'Checks: 100 %.',
  'Resultado: aprobado para el escenario k6 documentado; JMeter queda listo para corrida final.'
) 8

Add-Slide 'Calidad y análisis estático' '08 · QUALITY GATE' @(
  'SonarQube final: 0 bugs, 0 vulnerabilidades, 0 hotspots y 0 code smells.',
  'Duplicación: 2,1 %. Cobertura SonarQube: 43,0 %.',
  'Quality Gate: OK, con condiciones de código nuevo; no equivale a cobertura total.',
  'npm audit: sin vulnerabilidades altas o críticas; quedan moderadas transitorias de c8.',
  'CI automatiza la verificación en GitHub Actions.'
) 9

foreach ($item in @(@('Dashboard de Atlas', $dashboard), @('Clientes y protección de datos', $clients), @('Contratos y estados', $contracts))) {
  $slide = $pres.Slides.Add($pres.Slides.Count + 1, 12)
  $bg = $slide.Shapes.AddShape(1, 0, 0, 960, 540); $bg.Fill.ForeColor.RGB = $light; $bg.Line.Visible = 0
  Add-Title $slide $item[0] '09 · EVIDENCIA VISUAL' 
  $slide.Shapes.AddPicture($item[1], 0, -1, 45, 115, 870, 390) | Out-Null
  Add-Footer $slide ($pres.Slides.Count)
}

Add-Slide 'Ética, privacidad y normativa' '12 · CUMPLIMIENTO' @(
  'Usar datos sintéticos y no publicar PII, tokens, contraseñas ni respaldos.',
  'Ley 19.628 como referencia para datos personales; Ley 21.719 requiere verificar vigencia y alcance.',
  'ISO/IEC 25010 y OWASP Top 10 se usan como referencias, no como certificación.',
  'Secretos de demostración deben reemplazarse y rotarse antes de desplegar.',
  'Gitleaks no se declara ejecutado: no existe reporte verificable en el repositorio.'
) 13
Add-Slide 'Pendientes y cierre' '13 · PRÓXIMOS PASOS' @(
  'Ejecutar integración final con PostgreSQL y dejar 0 casos omitidos.',
  'Correr JMeter y adjuntar reporte HTML con P95, throughput y errores.',
  'Configurar HTTPS/TLS y validar certificado y transporte de credenciales.',
  'Ejecutar backup/restauración y revisión formal de accesibilidad.',
  'Documentar decisión sobre vulnerabilidades moderadas de c8.',
  'Conclusión: Atlas está preparado para la entrega con límites y evidencia trazables.'
) 14

$pres.SaveAs($output, 24)
$pres.SaveAs($downloads, 24)
$pres.Close()
$ppt.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
Write-Output $downloads
