# Reporte de Entrega: Welcome Popup Sync

Este documento resume el trabajo realizado, las nuevas funcionalidades y el proceso de instalación.

## 🚀 Funcionalidades Implementadas

### 1. Persistencia Ultra-Robusta (Cross-Domain Vault)
- Se implementó un **Storage Vault** invisible en un iframe (`storage-bridge.html`).
- Esto permite que la preferencia "No volver a mostrar" se guarde incluso si el sitio principal borra las cookies o el localStorage al cerrar sesión.

### 2. Gestión de Contenido Enriquecido
- **Soporte HTML y Markdown**: Ahora puedes usar etiquetas `<b>` o simplemente escribir `**negrita**` en los mensajes.
- **Asistente de IA**: Botón "Mejorar con IA" con estilos (Profesional, Amigable, Corto, Urgente).
- **Soporte de Imágenes y Video**: Carga de `mainImageUrl` (fotos), YouTube y Google Drive.

### 3. Herramientas de Productividad (Bulk & Order)
- **Importación Masiva Excel**: Botón para cargar archivos `.xlsx`. Mapea automáticamente columnas `Title`, `Type`, `Item` y `Sprint`.
- **Reordenación**: Flechas para subir y bajar mensajes en la lista y definir la secuencia de aparición.

## 🛠️ Guía de Instalación y Despliegue

### Requisitos Previos
- **Node.js** (v18 o superior).
- Servidor web para alojar el loader (puede ser el mismo donde está el configurador).

### Pasos para Instalar en un Nuevo Servidor
1. **Exportar el proyecto**:
   - En la carpeta actual, ejecuta `npm run export` o haz doble clic en `export-app.bat`.
   - Se generará un archivo `.zip` ligero.
2. **Desplegar**:
   - Descomprime el ZIP en el nuevo servidor.
   - Ejecuta `npm install` para instalar dependencias.
3. **Iniciar**:
   - Ejecuta `npm run dev` para abrir el panel de configuración.

### Archivos Clave
- `welcome-loader.js`: Script que se debe insertar en el sitio cliente.
- `storage-bridge.html`: Debe estar accesible en una URL fija para la persistencia.
- `ConfigPortal.jsx`: El cerebro del configurador.

---
**Contacto de Soporte:** mdiaz@vadigu.com
**Desarrollado por:** Antigravity AI
