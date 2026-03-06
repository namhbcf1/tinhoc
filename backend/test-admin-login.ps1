# Test Admin Login
$body = @{
    username = "admin1"
    password = "admin12345"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "https://vantrangedu-api.bangachieu2.workers.dev/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
Write-Host "Response:" -ForegroundColor Yellow
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
