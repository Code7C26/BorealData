# Prueba manual REAL (con Gemini de verdad) de /analyze/read y /analyze/content.
# SIN PROBAR en PowerShell: ajustá $apiKey y $imagePath. Mismo truco de token que test-history.ps1.
# Uso:  .\test-content.ps1 -ImagePath "C:\ruta\captura.png"
param([string]$ImagePath = ".\captura.png", [string]$Base = "http://localhost:4000")

$apiKey = "AIzaSyCxwsBpkPezCKgJkP0Oj51dqjigyrq1kSI"
$authBody = @{ email = "test@aletheia.com"; password = "test123456"; returnSecureToken = $true } | ConvertTo-Json
try   { $auth = Invoke-RestMethod -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$apiKey" -Method Post -Body $authBody -ContentType "application/json" }
catch { $auth = Invoke-RestMethod -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey" -Method Post -Body $authBody -ContentType "application/json" }
$h = @{ Authorization = "Bearer $($auth.idToken)" }

function Post-Json($path, $obj) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Depth 10 -Compress))
  Invoke-RestMethod -Uri "$Base$path" -Method Post -Headers $h -Body $bytes -ContentType "application/json; charset=utf-8"
}

Write-Host "`n[1] POST /analyze/read sin token -> esperado 401"
try { Invoke-RestMethod -Uri "$Base/analyze/read" -Method Post -Body "{}" -ContentType "application/json" } catch { $_.Exception.Response.StatusCode.value__ }

Write-Host "`n[2] POST /analyze/read con la imagen"
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path $ImagePath)))
$read = Post-Json "/analyze/read" @{ images = @(@{ dataBase64 = $b64 }) }
$read | ConvertTo-Json -Depth 10

if ($read.reading.hasVerifiableClaim) {
  Write-Host "`n[3] POST /analyze/content con lo leído (sin corregir)"
  $res = Post-Json "/analyze/content" @{
    source  = @{ kind = "capture"; platform = $read.reading.platform; pageUrl = "https://www.instagram.com/stories/x/1/?token=NO_DEBE_GUARDARSE" }
    content = @{ text = $read.reading.text; author = $read.reading.author }
  }
  $res | ConvertTo-Json -Depth 10
  Write-Host "`nVerificá en pgAdmin: source_type='capture', url SIN '?token=...', y que NO aparezca en GET /history de OTRO usuario."
} else { Write-Host "`nEl modelo no encontró una afirmación verificable: no se llama a /analyze/content." }
