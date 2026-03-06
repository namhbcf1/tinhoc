# Script chạy add-exams-cli.js để thêm bài thi vào database
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Chạy script thêm bài thi vào database" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir
Set-Location ..

Write-Host "Đang chạy add-exams-cli.js..." -ForegroundColor Yellow
node scripts/add-exams-cli.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Có lỗi xảy ra!" -ForegroundColor Red
    Read-Host "Nhấn Enter để thoát"
    exit 1
}

Write-Host ""
Write-Host "✅ Hoàn thành!" -ForegroundColor Green
Read-Host "Nhấn Enter để thoát"








