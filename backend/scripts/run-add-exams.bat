@echo off
echo ========================================
echo   Chay script them bai thi vao database
echo ========================================
echo.

cd /d "%~dp0"
cd ..

echo Dang chay add-exams-cli.js...
node scripts/add-exams-cli.js

if errorlevel 1 (
    echo.
    echo ❌ Co loi xay ra!
    pause
    exit /b 1
)

echo.
echo ✅ Hoan thanh!
pause








