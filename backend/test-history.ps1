param(
    [string]$ApiKey = "<WEB_API_KEY>",
    [string]$Email = "test@aletheia.com",
    [string]$Password = "test123456",
    [string]$BaseUrl = "http://localhost:3000"
)

function Get-ErrorBody($errorRecord) {
    if ($errorRecord.ErrorDetails -and $errorRecord.ErrorDetails.Message) {
        return $errorRecord.ErrorDetails.Message
    }
    try {
        $stream = $errorRecord.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        return $reader.ReadToEnd()
    } catch {
        return $errorRecord.Exception.Message
    }
}

if ($ApiKey -eq "<WEB_API_KEY>") {
    Write-Host "Falta la Web API Key. Pasala con -ApiKey." -ForegroundColor Red
    Write-Host "La encontras en Firebase Console -> icono de engranaje -> Configuracion del proyecto -> pestana General -> campo 'Clave de API web'." -ForegroundColor Red
    Write-Host "Empieza con AIzaSy... (NO es la VAPID key de Cloud Messaging, ni el Project ID)." -ForegroundColor Red
    exit 1
}

Write-Host "1) Consiguiendo token para $Email..." -ForegroundColor Cyan
$authBody = @{ email = $Email; password = $Password; returnSecureToken = $true } | ConvertTo-Json
try {
    $auth = Invoke-RestMethod -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$ApiKey" -Method Post -Body $authBody -ContentType "application/json"
} catch {
    Write-Host "  signInWithPassword fallo, probando signUp (puede ser la primera vez que se crea este usuario)..." -ForegroundColor Yellow
    try {
        $auth = Invoke-RestMethod -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$ApiKey" -Method Post -Body $authBody -ContentType "application/json"
    } catch {
        Write-Host "  signUp tambien fallo. Respuesta del servidor:" -ForegroundColor Red
        Write-Host "  $(Get-ErrorBody $_)" -ForegroundColor Red
        Write-Host "  Revisa que la ApiKey sea la 'Clave de API web' correcta (Firebase Console -> Configuracion del proyecto -> General)." -ForegroundColor Red
        exit 1
    }
}
$token = $auth.idToken
Write-Host "  Token obtenido (uid: $($auth.localId))" -ForegroundColor Green

Write-Host "`n2) GET /history SIN token (esperado: 401)..." -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "$BaseUrl/history" -Method Get
    Write-Host "  -> Respondio 200. Esto esta mal, deberia ser 401." -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 401) {
        Write-Host "  -> Status 401. Correcto." -ForegroundColor Green
    } else {
        Write-Host "  -> Status $status (se esperaba 401)" -ForegroundColor Red
        Write-Host "  $(Get-ErrorBody $_)" -ForegroundColor Red
    }
}

Write-Host "`n3) GET /history CON token (esperado: 200)..." -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $token" }
try {
    $history = Invoke-RestMethod -Uri "$BaseUrl/history" -Method Get -Headers $headers
    Write-Host "  -> Status 200. Correcto." -ForegroundColor Green
    $history | ConvertTo-Json -Depth 6
} catch {
    Write-Host "  -> Fallo:" -ForegroundColor Red
    Write-Host "  $(Get-ErrorBody $_)" -ForegroundColor Red
    exit 1
}

Write-Host "`n4) GET /history?limit=1&offset=0 (paginacion)..." -ForegroundColor Cyan
try {
    $page = Invoke-RestMethod -Uri "$BaseUrl/history?limit=1&offset=0" -Method Get -Headers $headers
    Write-Host "  -> Status 200. Correcto." -ForegroundColor Green
    $page | ConvertTo-Json -Depth 6
} catch {
    Write-Host "  -> Fallo:" -ForegroundColor Red
    Write-Host "  $(Get-ErrorBody $_)" -ForegroundColor Red
}

Write-Host "`n5) POST /analyze con este mismo token, para generar un analisis real (puede tardar por el grounding de Gemini)..." -ForegroundColor Cyan
$analyzeBody = @{ url = "https://es.wikipedia.org/wiki/Argentina" } | ConvertTo-Json
$analyzeOk = $false
try {
    $analyzeResult = Invoke-RestMethod -Uri "$BaseUrl/analyze" -Method Post -Body $analyzeBody -ContentType "application/json" -Headers $headers
    Write-Host "  -> Analisis guardado. score=$($analyzeResult.score) label=$($analyzeResult.label)" -ForegroundColor Green
    $analyzeOk = $true
} catch {
    Write-Host "  -> Fallo /analyze:" -ForegroundColor Red
    Write-Host "  $(Get-ErrorBody $_)" -ForegroundColor Red
}

if ($analyzeOk) {
    Write-Host "`n6) GET /history de nuevo: deberia aparecer el analisis recien creado..." -ForegroundColor Cyan
    try {
        $history2 = Invoke-RestMethod -Uri "$BaseUrl/history" -Method Get -Headers $headers
        Write-Host "  -> Status 200. Cantidad de analisis: $($history2.analyses.Count)" -ForegroundColor Green
        $history2 | ConvertTo-Json -Depth 6
    } catch {
        Write-Host "  -> Fallo:" -ForegroundColor Red
        Write-Host "  $(Get-ErrorBody $_)" -ForegroundColor Red
    }
}
