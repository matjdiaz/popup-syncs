# PROJECT_STATUS.md — Welcome Popup Sync

> **Última actualización:** 20 de Septiembre, 2026  
> **Estado general:** En producción y activo (`newspopup.vadigu.com`)  
> **Repositorio GitHub:** `https://github.com/matjdiaz/popup-syncs` (`main`)  
> **Stack principal:** React 19, Vite 7, Supabase (PostgreSQL + Auth + Storage), Vanilla JS Loader

---

## 1. Resumen Ejecutivo y Propósito

**Welcome Popup Sync** es una plataforma SaaS multi-tenant ligera diseñada para la gestión, emisión y sincronización de popups de bienvenida, novedades de software, comunicados multimedia y avisos relámpago de emergencia en múltiples aplicaciones web y sitios gubernamentales/corporativos (ej. *sanjuan.gob.ar*, *formosa.gob.ar*, *vadigu.com*).

### Objetivos Clave
1. **Embebido Zero-Friction:** Inserción en cualquier sitio web cliente mediante un único `<script>` (`welcome-loader.js`) que autodetecta el cliente por dominio o parámetro `data-client-id`.
2. **Persistencia Multi-Capa / Cross-Domain Vault:** Garantiza que la opción "No volver a mostrar" persista entre sesiones y limpiezas de almacenamiento local mediante un puente invisible (`storage-bridge.html`), cookies de dominio raíz, LocalStorage e IndexedDB.
3. **Gestión Dual (Administración Central vs. Portal de Emergencia):** Panel administrativo completo con autenticación Supabase y un portal simplificado accesible por URL y protegido por PIN numérico para operadores de guardia.

---

## 2. Arquitectura y Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│                       Clientes Web                          │
│        (Sitios de clientes / Portales de Gobierno)           │
│                                                             │
│   <script src="https://newspopup.vadigu.com/welcome-loader.js"│
│           data-client-id="sanjuan.gob.ar"></script>         │
└──────────────┬───────────────────────────────▲──────────────┘
               │ Consulta REST (Anónima)       │ Renderiza Popup / Drawer
               ▼                               │
┌───────────────────────────────┐  Sincroniza  │
│       Supabase Backend        │◄─────────────┼──────────────┐
│  - Auth (Admin/Operadores)    │              │              │
│  - Postgres DB (REST API)     │              │              │
│  - Storage (Buckets/Media)    │              │              │
└──────────────▲────────────────┘              │              │
               │                               │              │
       Gestión │ Admin                         │ Storage      │ Emisión
       CRUD    │                               │ Bridge       │ con PIN
               │                               │              │
┌──────────────┴────────────────┐   ┌──────────┴──────────┐   │
│       Panel Administrativo    │   │ Cross-Domain Vault  │   │
│      (ConfigPortal.jsx)       │   │(storage-bridge.html)│   │
│      React 19 + Vite 7        │   └─────────────────────┘   │
└───────────────────────────────┘                             │
                                                              │
┌─────────────────────────────────────────────────────────────┴┐
│             Portal de Emergencia por Cliente                 │
│                 (EmergencyPortal.jsx)                        │
│            /emergencia/:clienteId (Autenticado con PIN)      │
└──────────────────────────────────────────────────────────────┘
```

### Tecnologías
- **Frontend / Panel Admin:** React 19.2.0, Vite 7.2.4, Lucide React (íconos), XLSX (procesamiento de planillas).
- **Backend as a Service:** Supabase (`@supabase/supabase-js` v2.112.4).
- **Client Loader:** JavaScript Vanilla moderno (sin dependencias externas), inyección dinámica de estilos CSS y contenedores en DOM.
- **Persistencia en Navegador:** LocalStorage, Cookies de dominio raíz (`SameSite=Lax`), IndexedDB (`WelcomeSyncDB` / `WelcomeSyncVault`), Cache Storage API.
- **Despliegue:** Vercel (`vercel.json` con soporte SPA), scripts Windows `.bat` / `.ps1` para compresión y empaquetado de exportación.

---

## 3. Modelo de Datos y Esquema Supabase

### Tabla `clientes`
Almacena la configuración institucional de cada tenant / dominio cliente.
- `id` (`text`, Primary Key): Identificador del cliente, típicamente su dominio (ej. `sanjuan.gob.ar`, `formosa.gob.ar`, `client_A`).
- `nombre` (`text`): Nombre legible del organismo o empresa (ej. `Gobierno de San Juan`).
- `logo_url` (`text`, nullable): URL del imagotipo/logotipo institucional por defecto.
- `pin` (`text`, default `'1234'`): PIN numérico de 4 dígitos para acceder al portal de emergencia de este cliente.
- `created_at` (`timestamptz`, default `now()`): Fecha de registro.

### Tabla `mensajes`
Novedades, comunicados y notas de actualización programadas por cliente.
- `id` (`uuid` / `text`, Primary Key): Identificador único del mensaje.
- `cliente_id` (`text`, FK -> `clientes.id`): Tenant al que corresponde.
- `title` (`text`): Título de la novedad.
- `message` (`text`): Cuerpo del comunicado. Soporta etiquetas HTML (`<b>`, `<i>`, `<img src="...">` base64/URL).
- `mainImageUrl` (`text`, nullable): URL de imagen destacada o PDF en Drive.
- `videoUrl` (`text`, nullable): URL de video de YouTube o Google Drive.
- `logoUrl` (`text`, nullable): Logotipo específico para este mensaje (sobrescribe el del cliente).
- `activo` (`boolean`, default `true`): Flag de publicación.
- `orden` (`integer`, nullable): Prioridad o índice de ordenamiento.
- `created_at` (`timestamptz`, default `now()`).

### Tabla `avisos_globales`
Avisos relámpago e interrupciones de servicio con caducidad por tiempo.
- `id` (`uuid` / `int`, Primary Key): ID del aviso.
- `mensaje` (`text`): Texto del aviso o JSON empaquetado (`_isPacked: true` con `texto`, `img`, `vid`).
- `target_clientes` (`text[]` o `jsonb`): Clientes destinatarios (ej. `['all']` o `['sanjuan.gob.ar']`).
- `duracion_horas` (`numeric`): Horas de vigencia desde `fecha_inicio`.
- `fecha_inicio` (`timestamptz`, default `now()`): Momento de activación.
- `activo` (`boolean`, default `true`): Si está activo manualmente.
- `mainImageUrl` (`text`, nullable): Imagen adjunta opcional.
- `videoUrl` (`text`, nullable): Video adjunto opcional.
- `created_at` (`timestamptz`, default `now()`).

---

## 4. Módulos y Estructura del Proyecto

```
Welcome Popup Sync/
├── index.html                  # Punto de entrada HTML Vite
├── package.json                # Configuración de dependencias y scripts
├── vercel.json                 # Configuración de rewrite de rutas SPA para Vercel
├── vite.config.js              # Configuración del bundler Vite
├── export-app.bat / .ps1       # Scripts de exportación de código fuente a ZIP
├── HANDOVER_REPORT.md          # Reporte técnico de entrega
├── EXPORT_GUIDE.md             # Guía de instalación y exportación
├── PROJECT_STATUS.md           # [ESTE ARCHIVO] Documentación viva del estado del repo
│
├── public/
│   ├── welcome-loader.js       # Script embebible cliente final (widget)
│   ├── storage-bridge.html     # Vault iframe cross-domain para persistencia de lectura
│   ├── client-test.html        # Entorno local de prueba para clientes
│   ├── demo.html               # Demostración del widget
│   └── logo_vadigu.png         # Activos gráficos
│
└── src/
    ├── main.jsx                # Bootstrap de React
    ├── App.jsx                 # Router básico (Admin Login vs /emergencia/:id)
    ├── App.css                 # Estilos globales de la app administrativa
    ├── supabase.js             # Inicializador del cliente Supabase
    ├── config.js               # Utilidades de persistencia (IDB, cookies, cache, storage)
    │
    └── components/
        ├── ConfigPortal.jsx    # Panel de control administrativo maestro
        ├── EmergencyPortal.jsx # Portal público restringido por PIN para incidentes
        ├── WelcomePopup.jsx    # Componente React de previsualización en vivo
        └── WelcomePopup.css    # Estilos del popup y drawer modal
```

---

## 5. Componentes Principales

| Componente / Archivo | Rol | Características Clave |
| :--- | :--- | :--- |
| [`App.jsx`](file:///d:/Users/mdiaz/ANTIGRAVITY/Welcome%20Popup%20Sync/src/App.jsx) | Controlador Raíz y Auth | Si la URL inicia con `/emergencia/:clienteId`, monta `EmergencyPortal`. Si no, exige login Supabase y monta `ConfigPortal`. |
| [`ConfigPortal.jsx`](file:///d:/Users/mdiaz/ANTIGRAVITY/Welcome%20Popup%20Sync/src/components/ConfigPortal.jsx) | Panel Administrativo | CRUD de clientes, edición de PIN, subida/pegado de capturas con compresión de imagen en `<canvas>` a JPEG/base64, formateo de texto, importación de JSON/JS legacy, lanzamiento de avisos relámpago con plantilla y previsualizador en vivo. |
| [`EmergencyPortal.jsx`](file:///d:/Users/mdiaz/ANTIGRAVITY/Welcome%20Popup%20Sync/src/components/EmergencyPortal.jsx) | Portal de Incidentes | Autenticación silenciosa bajo `emergencias@vadigu.com`, validación del PIN del cliente, creación y baja de avisos urgentes con vigencia horaria. |
| [`WelcomePopup.jsx`](file:///d:/Users/mdiaz/ANTIGRAVITY/Welcome%20Popup%20Sync/src/components/WelcomePopup.jsx) | Previsualizador React | Renderiza el popup dentro del panel administrativo con soporte de modal de confirmación, zoom de imagen y reproductor embed. |
| [`welcome-loader.js`](file:///d:/Users/mdiaz/ANTIGRAVITY/Welcome%20Popup%20Sync/public/welcome-loader.js) | Widget Embebible | Script ligero que consulta la REST API de Supabase, comprueba avisos relámpago activos, renderiza el popup responsive y crea un drawer lateral con historial de novedades vistas. |
| [`storage-bridge.html`](file:///d:/Users/mdiaz/ANTIGRAVITY/Welcome%20Popup%20Sync/public/storage-bridge.html) | Cross-Domain Vault | Iframe aislado que atiende eventos `window.postMessage` (`GET_PREF`, `SET_PREF`) con IndexedDB y LocalStorage persistente. |

---

## 6. Bitácora de Cambios Técnicos Recientes

- **2026-09-20:**
  - Inicialización del repositorio Git local con rama principal `main` y configuración de autor (`Matias Javier Diaz <mdiaz@vadigu.com>`).
  - Vinculación con repositorio remoto en GitHub: `https://github.com/matjdiaz/popup-syncs.git`.
  - Configuración y saneamiento de `.gitignore` para excluir `node_modules/`, `dist/`, `.env*`, `.vercel/`, temporales y zips de exportación.
  - Generación del commit inicial y sincronización (`git push -u origin main`).
- **2026-09-17:**
  - Creación del archivo de living documentation `PROJECT_STATUS.md` conforme a las directivas globales del espacio de trabajo.
  - Relevamiento y consolidación de la arquitectura multi-tenant, esquema de Supabase y flujo de emergencias.
- **Entregas Previas:**
  - Implementación del sistema de persistencia **Cross-Domain Vault** vía iframe `storage-bridge.html` y fallback multi-capa (IndexedDB + cookies de dominio raíz + LocalStorage).
  - Integración del **Portal de Emergencias (`/emergencia/:clienteId`)** con autenticación por PIN individual de cliente.
  - Soporte de pegado directo de imágenes (`Ctrl+V`) desde portapapeles con autocrompresión en canvas a JPEG.
  - Soporte multimedia extendido: URLs directas, YouTube responsive embeds y Google Drive embeds/PDFs.
  - Plantillas de texto rápido para avisos de mantenimiento programado e interrupciones.
  - Incorporación de scripts automáticos de empaquetado de producción (`export-app.bat` / `export-app.ps1`).

---

## 7. Tareas Pendientes y Próximos Pasos Técnicos

1. **Gestión de Archivos en Supabase Storage:**
   - Migrar el almacenamiento de imágenes pegadas (actualmente incrustadas en Base64 en el cuerpo del mensaje) al bucket público `client_repos` para reducir el tamaño del payload de la base de datos y mejorar la velocidad de carga.
2. **Validación de Schema en Supabase:**
   - Asegurar que la columna `pin` (`text`) en la tabla `clientes` esté creada y tenga índice si el volumen de tenants crece.
   - Confirmar que las columnas `mainImageUrl` y `videoUrl` en `avisos_globales` existan como columnas nativas o continúen utilizando el empaquetado seguro JSON (`_isPacked`).
3. **Seguridad y Variables de Entorno:**
   - Trasladar las URLs y claves anónimas de Supabase a variables de entorno `.env` en los entornos de staging/producción para evitar hardcoding en clientes compilados.
