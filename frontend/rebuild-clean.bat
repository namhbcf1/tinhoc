@echo off
echo Cleaning build cache and rebuilding...
cd /d %~dp0
if exist dist rmdir /s /q dist
if exist node_modules\.vite rmdir /s /q node_modules\.vite
echo Building...
call npm run build
echo Build complete!









