# Script de Exportación Automática para Windows (PowerShell)

$projectName = "WelcomePopupSync-Export"
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$zipFile = "$projectName-$timestamp.zip"

Write-Host "--- Iniciando Exportación de Proyecto ---" -ForegroundColor Cyan

# Lista de carpetas y archivos a excluir
$excludeList = @("node_modules", "dist", ".git", ".next", "*.zip", ".DS_Store", "*.cjs", "inspect_excel.cjs", "package-lock.json")

Write-Host "Comprimiendo archivos (excluyendo node_modules y temporales)..." -ForegroundColor Yellow

# Obtenemos todos los archivos excepto los excluidos
$files = Get-ChildItem -Path . -Exclude $excludeList -Recurse

# Creamos el ZIP
Compress-Archive -Path $files -DestinationPath $zipFile -Force

Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host "¡Éxito! Proyecto exportado en: $zipFile" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host "Pasos en el nuevo servidor:"
Write-Host "1. Descomprimir el archivo."
Write-Host "2. Ejecutar 'npm install'."
Write-Host "3. Ejecutar 'npm run dev'."
