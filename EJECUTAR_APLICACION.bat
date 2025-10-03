@echo off
chcp 65001 >nul
title Formato de Campo V2
color 0B

echo ========================================
echo   FORMATO DE CAMPO V2
echo ========================================
echo.
echo Iniciando aplicación...
echo.

:: Navigate to project directory
cd /d "%~dp0.."

:: Check if node_modules exists
if not exist "node_modules" (
    echo ❌ ERROR: Las dependencias no están instaladas.
    echo.
    echo Por favor, ejecuta primero: INSTALAR.bat
    echo.
    pause
    exit /b 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js no está instalado.
    echo.
    echo Por favor, instala Node.js desde:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✓ Dependencias verificadas
echo ✓ Node.js encontrado
echo.
echo ========================================
echo   La aplicación se está iniciando...
echo ========================================
echo.
echo Se abrirá automáticamente en tu navegador
echo en unos segundos en: http://localhost:3000
echo.
echo IMPORTANTE:
echo - NO CIERRES esta ventana mientras uses la aplicación
echo - Para detener la aplicación, presiona Ctrl+C aquí
echo.
echo ----------------------------------------
echo.

:: Start the application
npm run windows

:: If the app exits, wait for user input
echo.
echo ========================================
echo   La aplicación se ha detenido
echo ========================================
echo.
pause
