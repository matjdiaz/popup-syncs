export const DEFAULT_MESSAGE = {
    id: "msg-" + Date.now(),
    title: "New Update Available",
    message: "Check out our latest features and improvements.",
    logoUrl: "",
    videoUrl: "",
    mainImageUrl: "",
    active: true
};

export const DEFAULT_CONFIG = {
    clientId: "client_A",
    messages: [
        {
            ...DEFAULT_MESSAGE,
            id: "initial-v1",
            title: "Welcome to our Platform",
            message: "We're glad to have you here. Learn how to use the dashboard."
        }
    ]
};

const REGISTRY_KEY = "welcome_sync_registry_v2";
const SEEN_ID_KEY = "_app_v_pref"; // Stealth key
const BASE_REPO_URL = "https://zuupzzjfxwadutblkncu.supabase.co/storage/v1/object/public/client_repos";

/**
 * IndexedDB Helpers
 */
const DB_NAME = 'WelcomeSyncDB';
const STORE_NAME = 'Prefs';

async function idbGet(key) {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const getReq = store.get(key);
                getReq.onsuccess = () => resolve(getReq.result);
                getReq.onerror = () => resolve(null);
            };
            request.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
    });
}

async function idbSet(key, value) {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put(value, key);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            };
            request.onerror = () => resolve(false);
        } catch (e) { resolve(false); }
    });
}

async function idbDel(key) {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open(DB_NAME, 1);
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.delete(key);
                tx.oncomplete = () => resolve(true);
            };
            request.onerror = () => resolve(false);
        } catch (e) { resolve(false); }
    });
}

export function getRegistry() {
    try {
        const saved = localStorage.getItem(REGISTRY_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
}

export function saveRegistry(registry) {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

export function getWelcomeConfig(clientId = null) {
    const registry = getRegistry();
    if (clientId && registry[clientId]) {
        return registry[clientId];
    }
    // Si no hay clientId o no existe, devolvemos el último editado o el default
    const lastClientId = localStorage.getItem("welcome_last_client_id");
    if (!clientId && lastClientId && registry[lastClientId]) {
        return registry[lastClientId];
    }
    return DEFAULT_CONFIG;
}

export function saveWelcomeConfig(config) {
    const registry = getRegistry();
    registry[config.clientId] = config;
    saveRegistry(registry);
    localStorage.setItem("welcome_last_client_id", config.clientId);
}

export function parseImportedConfig(content) {
    if (!content) return null;

    // Buscar el primer '{' y el último '}' ignorando todo el ruido alrededor (BOM, scripts, etc)
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        try {
            const jsonStr = content.substring(startIndex, endIndex + 1);
            const data = JSON.parse(jsonStr);
            // Validar estructura mínima
            if (data && (data.messages || data.clientId)) {
                return data;
            }
        } catch (err) {
            console.error("Error al parsear el bloque JSON extraído:", err);
        }
    }

    // Fallback: Intentar parsear como JSON directo por si acaso
    try {
        return JSON.parse(content.trim());
    } catch (e) { }

    return null;
}

export async function fetchRemoteWelcome(clientId) {
    return new Promise((resolve) => {
        const scriptId = 'w-preview-data-script';
        const oldScript = document.getElementById(scriptId);
        if (oldScript) oldScript.remove();

        const s = document.createElement('script');
        s.id = scriptId;
        s.charset = 'utf-8';
        const currentRepoUrl = BASE_REPO_URL;
        s.src = `${currentRepoUrl}/${clientId}.js?t=${Date.now()}`;

        s.onload = () => {
            const data = window.__welcomeConfig;
            delete window.__welcomeConfig;
            s.remove();
            resolve(data);
        };

        s.onerror = () => {
            console.warn(`No se pudo cargar la config remota (.js) para ${clientId}. Ignora esto si no has publicado aún.`);
            s.remove();
            resolve(null);
        };

        // Timeout 3s para preview
        setTimeout(() => {
            if (document.getElementById(scriptId)) {
                s.remove();
                resolve(null);
            }
        }, 3000);

        document.head.appendChild(s);
    });
}

export function getRootDomain() {
    const parts = window.location.hostname.split('.');
    if (parts.length > 2) {
        // Lista de categorías comunes de TLDs de 3er nivel (com.ar, gob.ar, etc)
        const categories = ['com', 'gob', 'gov', 'edu', 'org', 'net'];
        const p2 = parts[parts.length - 2].toLowerCase();

        // Si el penúltimo es una categoría y hay al menos 3 partes, tomamos 3
        if (categories.includes(p2) && parts.length >= 3) {
            return parts.slice(-3).join('.');
        }
        return parts.slice(-2).join('.');
    }
    return window.location.hostname;
}

export function setCookie(name, value, days = 365) {
    const domain = getRootDomain();
    let expires = "";
    let maxAge = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
        maxAge = "; max-age=" + (days * 24 * 60 * 60);
    }

    // Si el dominio no tiene puntos (ej: localhost), no seteamos el atributo domain para evitar errores
    // Removemos el punto inicial (modern browsers treat domain=example.com as covering subdomains too)
    const domainPart = (domain.includes('.') && !domain.startsWith('localhost')) ? "; domain=" + domain : "";
    const secure = window.location.protocol === 'https:' ? "; Secure" : "";

    const cookieString = name + "=" + (value || "") + expires + maxAge + "; path=/" + domainPart + "; SameSite=Lax" + secure;
    document.cookie = cookieString;
    console.log(`[WelcomeSync] Cookie set: ${name}=${value}, Domain=${domain}, Expires=${days ? '365 days' : 'Session'}`);
}

export function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

/**
 * Cache Storage Helpers (PWA style)
 */
async function cacheGet(key) {
    try {
        const cache = await caches.open('v-pref-cache');
        const resp = await cache.match('/' + key);
        return resp ? await resp.text() : null;
    } catch (e) { return null; }
}

async function cacheSet(key, value) {
    try {
        const cache = await caches.open('v-pref-cache');
        await cache.put(new Request('/' + key), new Response(value));
        return true;
    } catch (e) { return false; }
}

export async function getLastSeenWelcomeId() {
    // Legacy: devolvemos el valor crudo para compatibilidad, pero no se usa más
    return localStorage.getItem(SEEN_ID_KEY);
}

export function getSeenIds() {
    try {
        const raw = localStorage.getItem(SEEN_ID_KEY);
        // Detectar formato viejo (string simple, no JSON array)
        if (raw && !raw.startsWith('[')) return new Set([raw]);
        return new Set(JSON.parse(raw || '[]'));
    } catch (e) { return new Set(); }
}

export function markIdAsSeen(id) {
    const seen = getSeenIds();
    seen.add(String(id));
    localStorage.setItem(SEEN_ID_KEY, JSON.stringify([...seen]));
}

export function markAllIdsAsSeen(ids) {
    const seen = getSeenIds();
    ids.forEach(id => seen.add(String(id)));
    localStorage.setItem(SEEN_ID_KEY, JSON.stringify([...seen]));
}

export async function setLastSeenWelcomeId(id) {
    markIdAsSeen(id);
}
