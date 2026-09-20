@echo off
setlocal enabledelayedexpansion

:: Generar timestamp básico
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a%%b)
set timestamp=%mydate%-%mytime%
set zipName=WelcomePopupSync-Export-%timestamp%.zip

echo --- Iniciando Exportacion de Proyecto (Version BAT) ---

:: Verificar si tar existe (disponible en Windows 10+)
where tar >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: No se encontro el comando 'tar'. Asegurate de estar en Windows 10 o superior.
    pause
    exit /b 1
)

echo Comprimiendo archivos (excluyendo node_modules y temporales)...

:: Crear el ZIP usando tar (que soporta exclusion y formato zip)
tar -a -c -f "%zipName%" --exclude="node_modules" --exclude="dist" --exclude=".git" --exclude="*.zip" --exclude="inspect_excel.cjs" --exclude="export-app.ps1" .

if %ERRORLEVEL% equ 0 (
    echo ----------------------------------------
    echo ¡Exito! Proyecto exportado en: %zipName%
    echo ----------------------------------------
    echo Pasos en el nuevo servidor:
    echo 1. Descomprimir el archivo.
    echo 2. Ejecutar 'npm install'.
    echo 3. Ejecutar 'npm run dev'.
) else (
    echo Ocurrio un error durante la compresion.
)

pause
