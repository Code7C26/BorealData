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
    Write-Host "Falta la Web API Key. Pasala con -ApiKey (Firebase Console -> Configuracion del proyecto -> General -> Clave de API web)." -ForegroundColor Red
    exit 1
}

Write-Host "1) Consiguiendo token para $Email..." -ForegroundColor Cyan
$authBody = @{ email = $Email; password = $Password; returnSecureToken = $true } | ConvertTo-Json
try {
    $auth = Invoke-RestMethod -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$ApiKey" -Method Post -Body $authBody -ContentType "application/json"
} catch {
    Write-Host "  signInWithPassword fallo, probando signUp..." -ForegroundColor Yellow
    try {
        $auth = Invoke-RestMethod -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$ApiKey" -Method Post -Body $authBody -ContentType "application/json"
    } catch {
        Write-Host "  signUp tambien fallo:" -ForegroundColor Red
        Write-Host "  $(Get-ErrorBody $_)" -ForegroundColor Red
        exit 1
    }
}
$token = $auth.idToken
$headers = @{ Authorization = "Bearer $token" }
Write-Host "  Token obtenido (uid: $($auth.localId))" -ForegroundColor Green

Write-Host "`n2) GET /me (esperado: 200, fullName probablemente null la primera vez)..." -ForegroundColor Cyan
try {
    $me = Invoke-RestMethod -Uri "$BaseUrl/me" -Method Get -Headers $headers
    Write-Host "  -> Status 200. Correcto." -ForegroundColor Green
    $me | ConvertTo-Json
} catch {
    Write-Host "  -> Fallo:" -ForegroundColor Red
    Write-Host "  $(Get-ErrorBody $_)" -ForegroundColor Red
    exit 1
}

Write-Host "`n3) POST /me con fullName (esperado: 200)..." -ForegroundColor Cyan
$body = @{ fullName = "Ciro Di Marsico" } | ConvertTo-Json
try {
    $saved = Invoke-RestMethod -Uri "$BaseUrl/me" -Method Post -Body $body -ContentType "application/json" -Headers $headers
    Write-Host "  -> Status 200. Correcto." -ForegroundColor Green
    $saved | ConvertTo-Json
} catch {
    Write-Host "  -> Fallo:" -ForegroundColor Red
    Write-Host "  $(Get-ErrorBody $_)" -ForegroundColor Red
    exit 1
}

Write-Host "`n4) GET /me de nuevo (esperado: fullName = 'Ciro Di Marsico')..." -ForegroundColor Cyan
try {
    $me2 = Invoke-RestMethod -Uri "$BaseUrl/me" -Method Get -Headers $headers
    Write-Host "  -> Status 200. fullName = $($me2.fullName)" -ForegroundColor Green
    $me2 | ConvertTo-Json
} catch {
    Write-Host "  -> Fallo:" -ForegroundColor Red
    Write-Host "  $(Get-ErrorBody $_)" -ForegroundColor Red
}

Write-Host "`n5) POST /me sin fullName (esperado: 400)..." -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "$BaseUrl/me" -Method Post -Body (@{} | ConvertTo-Json) -ContentType "application/json" -Headers $headers
    Write-Host "  -> Respondio 200. Esto esta mal, deberia ser 400." -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 400) {
        Write-Host "  -> Status 400. Correcto." -ForegroundColor Green
    } else {
        Write-Host "  -> Status $status (se esperaba 400)" -ForegroundColor Red
    }
}
