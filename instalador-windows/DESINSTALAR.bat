@echo off
chcp 65001 >nul
title Desinstalador - Formato de Campo V2
color 0C

echo ========================================
echo   DESINSTALADOR - FORMATO DE CAMPO V2
echo ========================================
echo.
echo ⚠️  ADVERTENCIA ⚠️
echo.
echo Este script eliminará:
echo - Todas las dependencias instaladas (node_modules)
echo - Archivos de configuración de npm
echo.
echo NO eliminará:
echo - Tus datos guardados en Documents\Formato_Campo_V2
echo - El código fuente de la aplicación
echo.
echo ¿Estás seguro de que deseas continuar?
echo.
echo Presiona Ctrl+C para cancelar
echo Presiona cualquier tecla para continuar...
pause >nul

echo.
echo [1/3] Navegando al directorio del proyecto...
echo ----------------------------------------

cd /d "%~dp0.."
echo ✓ Directorio: %CD%

echo.
echo [2/3] Eliminando node_modules...
echo ----------------------------------------

if exist "node_modules" (
    echo Esto puede tardar un momento...
    rmdir /s /q "node_modules" 2>nul
    if %errorlevel% equ 0 (
        echo ✓ node_modules eliminado correctamente
    ) else (
        echo ❌ Error al eliminar node_modules
        echo Intenta cerrar todos los programas y ejecutar como Administrador
    )
) else (
    echo ℹ No hay node_modules para eliminar
)

echo.
echo [3/3] Eliminando archivos de configuración...
echo ----------------------------------------

if exist "package-lock.json" (
    del /f /q "package-lock.json" 2>nul
    echo ✓ package-lock.json eliminado
) else (
    echo ℹ No hay package-lock.json para eliminar
)

if exist ".expo" (
    rmdir /s /q ".expo" 2>nul
    echo ✓ Caché de Expo eliminado
)

echo.
echo ========================================
echo   ✓ DESINSTALACIÓN COMPLETADA
echo ========================================
echo.
echo Las dependencias han sido eliminadas.
echo.
echo Si deseas volver a usar la aplicación:
echo 1. Ejecuta INSTALAR.bat nuevamente
echo.
echo Para eliminar también tus datos guardados:
echo - Ve a: C:\Users\%USERNAME%\Documents\Formato_Campo_V2
echo - Elimina la carpeta manualmente
echo.
echo Presiona cualquier tecla para cerrar...
pause >nul
