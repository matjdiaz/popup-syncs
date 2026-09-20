# Guía de Exportación e Instalación

Para llevar esta aplicación a otro servidor, tienes dos opciones: exportar el **Código Fuente** (para seguir desarrollando) o exportar el **Build de Producción** (para hosting).

## Opción Rápida: Script Automático (Windows)

Si tienes problemas de permisos con PowerShell, usa la versión por lotes:
1. Simplemente haz **doble clic** en el archivo `export-app.bat`.
2. O desde la terminal (CMD), ejecuta:
   ```bash
   npm run export
   ```

Esto generará un archivo `.zip` con todo el código listo, omitiendo las carpetas pesadas de sistema (`node_modules`).

## Opción 1: Exportar Código Fuente (Manual)

1. **Preparar el archivo:**
   Comprime la carpeta del proyecto `Welcome Popup Sync`, pero **EXCLUYE** la carpeta `node_modules` (es pesada y se regenera).

2. **En el nuevo servidor:**
   - Asegúrate de tener **Node.js** instalado (versión 18 o superior).
   - Descomprime el código.
   - Abre una terminal en esa carpeta y ejecuta:
     ```bash
     npm install
     ```
   - Para iniciar en modo desarrollo:
     ```bash
     npm run dev
     ```

## Opción 2: Exportar Build de Producción (Para que sea rápido)

1. **Generar el build:**
   En tu servidor actual, ejecuta:
   ```bash
   npm run build
   ```
   Esto creará una carpeta llamada `dist`.

2. **Instalar en el nuevo servidor:**
   - Sube el contenido de la carpeta `dist` a tu servidor web (Apache, Nginx, o cualquier hosting estático).
   - **IMPORTANTE:** Como la app usa rutas de React, asegúrate de que el servidor esté configurado para redirigir todas las peticiones a `index.html`.

## Configuración Crucial

- **URL del Vault:** Asegúrate de que el archivo `welcome-loader.js` y `src/config.js` apunten a la ruta correcta del `storage-bridge.html` si lo mueves de dominio.
- **Vite:** Si vas a usar un dominio específico, puedes configurar el `base` en `vite.config.js`.

---
¿Quieres que te genere un script automático para comprimir solo lo necesario?
