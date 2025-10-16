@echo off
chcp 65001 >nul
title Instalador - Formato de Campo V2
color 0A

echo ========================================
echo   INSTALADOR - FORMATO DE CAMPO V2
echo ========================================
echo.
echo Este script instalará todas las dependencias
echo necesarias para ejecutar la aplicación.
echo.
echo Presiona cualquier tecla para comenzar...
pause >nul

echo.
echo [1/5] Verificando Node.js...
echo ----------------------------------------

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Node.js no está instalado.
    echo.
    echo Por favor, instala Node.js desde:
    echo https://nodejs.org/
    echo.
    echo Descarga la versión LTS ^(recomendada^) e instálala.
    echo Después, ejecuta este instalador nuevamente.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js encontrado: %NODE_VERSION%

echo.
echo [2/5] Verificando npm...
echo ----------------------------------------

call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: npm no está instalado.
    echo npm debería venir con Node.js.
    echo Por favor, reinstala Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm encontrado: %NPM_VERSION%

echo.
echo [3/5] Navegando al directorio del proyecto...
echo ----------------------------------------

cd /d "%~dp0.."
echo ✓ Directorio: %CD%

echo.
echo [4/5] Limpiando instalaciones previas...
echo ----------------------------------------

if exist "node_modules" (
    echo Eliminando node_modules...
    rmdir /s /q "node_modules" 2>nul
    echo ✓ node_modules eliminado
) else (
    echo ✓ No hay node_modules previos
)

if exist "package-lock.json" (
    echo Eliminando package-lock.json...
    del /f /q "package-lock.json" 2>nul
    echo ✓ package-lock.json eliminado
) else (
    echo ✓ No hay package-lock.json previo
)

echo.
echo [5/5] Instalando dependencias del proyecto...
echo ----------------------------------------
echo.
echo Esto puede tardar varios minutos...
echo Por favor, espera...
echo.

npm install

if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: La instalación de dependencias falló.
    echo.
    echo Posibles soluciones:
    echo 1. Verifica tu conexión a Internet
    echo 2. Ejecuta este archivo como Administrador
    echo 3. Cierra otros programas que puedan estar usando Node.js
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✓ INSTALACIÓN COMPLETADA
echo ========================================
echo.
echo Todas las dependencias se instalaron correctamente.
echo.
echo Ahora puedes ejecutar la aplicación usando:
echo   - EJECUTAR_APLICACION.bat
echo.
echo Presiona cualquier tecla para cerrar...
pause >nul
