(function() {
    if (window.__welcomePopupInitialized) return;
    window.__welcomePopupInitialized = true;

    const scriptTag = document.currentScript || document.querySelector('script[src*="welcome-loader.js"]') || document.querySelector('script[data-client-id]');
    if (!scriptTag) {
        console.error("Welcome Popup: No se pudo identificar el script tag.");
        return;
    }

    function getClientDomain() {
        return window.location.hostname.replace(/^www\./, '');
    }

    const clientId = scriptTag.getAttribute('data-client-id') || getClientDomain();
    const STORAGE_KEY = "_app_v_pref"; // Stealth key

    const SUPABASE_URL = "https://zuupzzjfxwadutblkncu.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dXB6empmeHdhZHV0YmxrbmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzQzMjIsImV4cCI6MjEwMzg1MDMyMn0.3Jv6DJAyIo4KceG7mVUdOxTcfFpQSkIlIPXscUkfxRc";
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
    };

    function injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
        .w-sync-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); z-index: 999999 !important; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.4s ease; padding: 20px; box-sizing: border-box; }
        .w-sync-overlay-show { opacity: 1; }
        .w-sync-popup { background: #ffffff; width: 100%; max-width: 520px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); transform: translateY(20px) scale(0.95); transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .w-sync-popup-show { transform: translateY(0) scale(1); }
        .w-sync-close { position: absolute !important; top: 20px !important; right: 20px !important; background: transparent !important; border: none !important; width: 36px !important; height: 36px !important; border-radius: 50% !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; color: #94a3b8 !important; transition: all 0.2s !important; z-index: 10 !important; outline: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
        .w-sync-close:hover { background: #f1f5f9 !important; color: #0f172a !important; transform: rotate(90deg) !important; }
        .w-sync-content-scroll { overflow-y: auto; padding: 40px 32px 32px 32px; }
        .w-sync-content-scroll::-webkit-scrollbar { width: 6px; }
        .w-sync-content-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .w-sync-title { color: #059669 !important; font-size: 28px !important; font-weight: 800 !important; line-height: 1.2 !important; margin-bottom: 16px !important; margin-top: 0 !important; font-family: system-ui, -apple-system, sans-serif !important; text-align: center !important; }
        .w-sync-desc { color: #475569 !important; line-height: 1.6 !important; margin-bottom: 24px !important; font-size: 18px !important; font-family: system-ui, -apple-system, sans-serif !important; text-align: center !important; }
        .w-sync-desc img { max-width: 100% !important; height: auto !important; border-radius: 12px !important; margin: 12px 0 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; display: inline-block !important; }
        .w-sync-video-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 16px; margin-bottom: 2rem; background: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .w-sync-pdf-container { position: relative; padding-bottom: 120%; height: 0; overflow: hidden; margin-bottom: 24px; }
        .w-sync-footer { border-top: 1px solid #f1f5f9 !important; padding: 16px 32px 24px 32px !important; display: flex !important; flex-direction: column !important; gap: 16px !important; width: 100% !important; box-sizing: border-box !important; }
        .w-sync-btn-primary { background: #10b981 !important; color: white !important; border: none !important; padding: 14px 32px !important; border-radius: 16px !important; font-size: 16px !important; font-weight: 700 !important; cursor: pointer !important; transition: all 0.3s ease !important; box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.39) !important; margin: 0 !important; font-family: system-ui, -apple-system, sans-serif !important; }
        .w-sync-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.23) !important; background: #059669 !important; }
        .w-sync-history-btn { background: transparent !important; border: none !important; color: #64748b !important; font-size: 14px !important; font-weight: 600 !important; cursor: pointer !important; text-decoration: underline !important; text-underline-offset: 4px !important; padding: 8px !important; transition: color 0.2s !important; outline: none !important; box-shadow: none !important; margin: 0 !important; font-family: system-ui, -apple-system, sans-serif !important; display: inline-block !important; }
        .w-sync-history-btn:hover { color: #0f172a !important; }
        
        @keyframes wSyncPulseRed {
            0% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(225, 29, 72, 0); }
            100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
        }
        .w-sync-pulse-red { animation: wSyncPulseRed 2s infinite; }
        
        /* Drawer History Styles */
        .w-sync-drawer-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.2); backdrop-filter: blur(2px); z-index: 999999 !important; opacity: 0; transition: opacity 0.3s ease; display: flex; justify-content: flex-start; }
        .w-sync-drawer-show { opacity: 1; }
        .w-sync-drawer { width: 400px; max-width: 85vw; height: 100vh; background: #ffffff; box-shadow: 10px 0 30px rgba(0,0,0,0.1); transform: translateX(-100%); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; overflow: hidden; }
        .w-sync-drawer-show .w-sync-drawer { transform: translateX(0); }
        .w-sync-drawer-header { padding: 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
        .w-sync-drawer-title { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; }
        .w-sync-drawer-body { flex: 1; overflow-y: auto; padding: 24px; background: #f8fafc; }
        .w-sync-history-item { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform 0.2s; cursor: pointer; }
        .w-sync-history-item:hover { transform: translateY(-2px); border-color: #cbd5e1; }
        .w-sync-history-date { font-size: 12px; color: #94a3b8; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .w-sync-history-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 8px; line-height: 1.3; }
        `;
        document.head.appendChild(style);
    }

    // --- Persistencia: guardamos un SET de IDs vistos ---
    function getSeenIds() { 
        try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } 
        catch(e) { return new Set(); } 
    }
    function markIdAsSeen(id) { 
        const seen = getSeenIds(); 
        seen.add(String(id)); 
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen])); 
    }

    // --- Utils ---
    function getEmbedUrl(url) {
        if (!url) return null;
        let videoId = '';
        if (url.includes('youtube.com/watch')) { videoId = new URL(url).searchParams.get('v'); } 
        else if (url.includes('youtu.be/')) { videoId = url.split('youtu.be/')[1].split('?')[0]; } 
        else if (url.includes('drive.google.com/file/d/')) { return url.replace('/view', '/preview').split('?')[0]; }
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}` : url;
    }
    
    function getPdfEmbedUrl(url) {
        if (!url) return null;
        if (url.includes('drive.google.com')) return url.replace('/view', '/preview').split('?')[0];
        return url;
    }

    // --- Consultas a Supabase ---
    async function fetchBroadcast() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/avisos_globales?activo=eq.true&select=*`, { headers });
            const data = await res.json();
            if (!data || data.length === 0) return null;

            const now = new Date().getTime();
            for (const ann of data) {
                const start = new Date(ann.fecha_inicio).getTime();
                const end = start + (ann.duracion_horas * 60 * 60 * 1000);
                if (now >= start && now <= end) {
                    const targets = ann.target_clientes || [];
                    if (targets.includes('all') || targets.includes(clientId)) {
                        return ann;
                    }
                }
            }
        } catch (e) { console.error(e); }
        return null;
    }

    async function fetchMain() {
        try {
            // Consultamos mensajes y datos del cliente (logo por defecto) en paralelo
            const [resMsgs, resClient] = await Promise.all([
                fetch(`${SUPABASE_URL}/rest/v1/mensajes?cliente_id=eq.${clientId}&activo=eq.true&order=orden.asc,created_at.desc`, { headers }),
                fetch(`${SUPABASE_URL}/rest/v1/clientes?id=eq.${clientId}&select=logo_url`, { headers }).catch(() => null)
            ]);

            let currentMessages = await resMsgs.json();
            let defaultLogo = null;
            try {
                if (resClient) {
                    const clientData = await resClient.json();
                    if (clientData && clientData.length > 0) defaultLogo = clientData[0].logo_url;
                }
            } catch(e) {}

            // Si los mensajes no tienen logoUrl, aplicamos el logo por defecto del cliente
            if (defaultLogo && Array.isArray(currentMessages)) {
                currentMessages = currentMessages.map(m => ({
                    ...m,
                    logoUrl: m.logoUrl || defaultLogo
                }));
            }
            
            // Inyectar broadcast si hay uno activo
            const broadcast = await fetchBroadcast();
            if (broadcast) {
                let txt = broadcast.mensaje;
                let img = null;
                let vid = null;
                try {
                    if (txt.includes('_isPacked')) {
                        const parsed = JSON.parse(txt);
                        if (parsed._isPacked) {
                            txt = parsed.texto;
                            img = parsed.img;
                            vid = parsed.vid;
                        }
                    }
                } catch(e) {}

                currentMessages = [{
                    id: 'broadcast-' + broadcast.id,
                    title: '🚨 AVISO IMPORTANTE',
                    message: txt,
                    mainImageUrl: img,
                    videoUrl: vid,
                    isUrgent: true,
                    logoUrl: null
                }, ...currentMessages];
            }

            // Usamos el ID del primer mensaje como indicador de novedad
            const updateId = currentMessages.length > 0 ? currentMessages[0].id : null;
            return { currentMessages, updateId };
        } catch (e) {
            console.error("Error cargando mensajes desde Supabase", e);
            return { currentMessages: [], updateId: null };
        }
    }

    // --- Renderizado UI ---
    let currentOverlay = null;
    let currentDrawer = null;

    function closePopup() {
        if (currentOverlay) {
            const el = currentOverlay;
            currentOverlay = null;
            el.classList.remove('w-sync-overlay-show');
            const popup = el.querySelector('.w-sync-popup');
            if (popup) popup.classList.remove('w-sync-popup-show');
            setTimeout(() => { el.remove(); }, 400);
        }
    }

    function closeDrawer() {
        if (currentDrawer) {
            const el = currentDrawer;
            currentDrawer = null;
            el.classList.remove('w-sync-drawer-show');
            setTimeout(() => { el.remove(); }, 400);
        }
    }

    // --- Lightbox global ---
    window.wSyncOpenLightbox = function(e, url) {
        if(e) e.preventDefault();
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', opacity: 0, transition: 'opacity 0.2s'
        });
        
        const img = document.createElement('img');
        img.src = url;
        Object.assign(img.style, {
            maxWidth: '90%', maxHeight: '90%', borderRadius: '12px',
            boxShadow: '0 4px 25px rgba(0,0,0,0.5)', transform: 'scale(0.95)', transition: 'transform 0.2s'
        });
        
        overlay.appendChild(img);
        document.body.appendChild(overlay);
        
        requestAnimationFrame(() => {
            overlay.style.opacity = 1;
            img.style.transform = 'scale(1)';
        });

        overlay.onclick = () => {
            overlay.style.opacity = 0;
            img.style.transform = 'scale(0.95)';
            setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
        };
    };

    function renderMessage(msg, isHistoryView = false) {
        const embedUrl = msg.videoUrl ? getEmbedUrl(msg.videoUrl) : null;
        const html = `
            <div style="font-family: system-ui, -apple-system, sans-serif;">
                ${msg.logoUrl ? `<img src="${msg.logoUrl}" style="max-height:45px; margin-bottom:12px; border-radius:6px;" />` : ''}
                ${msg.isUrgent ? `<div style="color:#e11d48; font-weight:800; font-size:12px; letter-spacing:1px; margin-bottom:8px;">URGENTE</div>` : ''}
                <h1 class="w-sync-title">${msg.title}</h1>
                <div class="w-sync-desc">${msg.message.replace(/\\n/g, '<br/>')}</div>
                
                ${embedUrl ? `
                    <div class="w-sync-video-container">
                        <iframe src="${embedUrl}" allowfullscreen></iframe>
                    </div>
                ` : (msg.mainImageUrl && (msg.mainImageUrl.toLowerCase().endsWith('.pdf') || msg.mainImageUrl.includes('drive.google.com/file/d/'))) ? `
                    <div class="w-sync-pdf-container">
                        <iframe src="${getPdfEmbedUrl(msg.mainImageUrl)}"></iframe>
                    </div>
                    <div style="margin-bottom: 24px; text-align: center;">
                        <a href="${msg.mainImageUrl}" target="_blank" style="font-size: 13px; color: #2563eb; text-decoration: none; font-weight: 600;">Abrir documento ⇗</a>
                    </div>
                ` : msg.mainImageUrl ? `
                    <div class="w-sync-image-container" style="margin-bottom:24px; text-align:center; width:100%;">
                        <a href="#" onclick="wSyncOpenLightbox(event, '${msg.mainImageUrl}')" style="display:inline-block; position:relative; cursor:zoom-in; text-decoration:none;">
                            <img src="${msg.mainImageUrl}" style="max-width:100%; border-radius:12px; display:block;" />
                            <div style="position:absolute; bottom:12px; right:12px; background:rgba(15,23,42,0.7); color:white; padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px; backdrop-filter:blur(4px); box-shadow:0 2px 8px rgba(0,0,0,0.2); transition:opacity 0.2s;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                                Ampliar
                            </div>
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
        return html;
    }

    function renderPopup(msg, allMessages, fromHistory = false) {
        if (currentOverlay) closePopup();

        const currentIndex = allMessages.findIndex(m => m.id === msg.id);
        const hasOlder = currentIndex < allMessages.length - 1;
        const hasNewer = currentIndex > 0;

        const overlay = document.createElement('div');
        overlay.className = 'w-sync-overlay';
        overlay.innerHTML = `
            <div class="w-sync-popup">
                <button class="w-sync-close" id="w-sync-close-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div class="w-sync-content-scroll" style="flex: 1; min-height: 0;">
                    ${renderMessage(msg)}
                </div>
                <div class="w-sync-footer" style="padding: 16px 32px 32px 32px; display: flex; flex-direction: column; gap: 20px; width: 100%; box-sizing: border-box;">
                    ${!fromHistory ? `
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem; color: #64748b; font-family: system-ui, -apple-system, sans-serif;">
                            <input type="checkbox" id="w-sync-checkbox-dont-show" style="accent-color: #10b981; width: 18px; height: 18px;" />
                            No volver a mostrar
                        </label>
                        <div style="font-size: 0.85rem; color: #64748b; font-family: system-ui, -apple-system, sans-serif;">
                            Mensaje ${currentIndex + 1} de ${allMessages.length}
                        </div>
                    </div>
                    ` : `
                    <div style="display: flex; justify-content: flex-end; align-items: center; width: 100%;">
                        <div style="font-size: 0.85rem; color: #64748b; font-family: system-ui, -apple-system, sans-serif;">
                            Mensaje ${currentIndex + 1} de ${allMessages.length}
                        </div>
                    </div>
                    `}
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        ${currentIndex > 0 ? `<button class="w-sync-btn-primary" id="w-sync-prev-btn" style="background: #f1f5f9 !important; color: #475569 !important; box-shadow: none !important; margin: 0 !important;">Anterior</button>` : ''}
                        ${currentIndex < allMessages.length - 1 ? `<button class="w-sync-btn-primary" id="w-sync-next-btn" style="margin: 0 !important;">Siguiente</button>` : (fromHistory ? `<button class="w-sync-btn-primary" id="w-sync-btn-understand" style="margin: 0 !important;">Cerrar</button>` : `<button class="w-sync-btn-primary" id="w-sync-btn-understand" style="margin: 0 !important;">¡Entendido!</button>`)}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        currentOverlay = overlay;

        // Animar entrada
        requestAnimationFrame(() => {
            overlay.classList.add('w-sync-overlay-show');
            overlay.querySelector('.w-sync-popup').classList.add('w-sync-popup-show');
        });

        const closeBtns = overlay.querySelectorAll('.w-sync-close');
        closeBtns.forEach(btn => btn.onclick = () => {
            const cb = overlay.querySelector('#w-sync-checkbox-dont-show');
            if (cb && cb.checked) {
                markIdAsSeen(msg.id);
            }
            closePopup();
        });

        const understandBtn = overlay.querySelector('#w-sync-btn-understand');
        if (understandBtn) {
            understandBtn.onclick = () => {
                const cb = overlay.querySelector('#w-sync-checkbox-dont-show');
                if (cb && cb.checked) {
                    markIdAsSeen(msg.id);
                }
                closePopup();
            };
        }
        
        const prevBtn = overlay.querySelector('#w-sync-prev-btn');
        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.preventDefault();
                const cb = overlay.querySelector('#w-sync-checkbox-dont-show');
                if (cb && cb.checked) {
                    markIdAsSeen(msg.id);
                }
                renderPopup(allMessages[currentIndex - 1], allMessages, fromHistory);
            };
        }

        const nextBtn = overlay.querySelector('#w-sync-next-btn');
        if (nextBtn) {
            nextBtn.onclick = (e) => {
                e.preventDefault();
                const cb = overlay.querySelector('#w-sync-checkbox-dont-show');
                if (cb && cb.checked) {
                    markIdAsSeen(msg.id);
                }
                renderPopup(allMessages[currentIndex + 1], allMessages, fromHistory);
            };
        }
    }

    function renderHistoryDrawer(messages) {
        if (currentDrawer) return;

        const drawerHtml = `
            <div class="w-sync-drawer-overlay" id="w-sync-drawer-overlay">
                <div class="w-sync-drawer">
                    <div class="w-sync-drawer-header">
                        <h2 class="w-sync-drawer-title">Historial de Novedades</h2>
                        <button class="w-sync-close" style="position:static;" id="w-sync-drawer-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div class="w-sync-drawer-body">
                        ${messages.map((m, idx) => {
                            let mediaHtml = '';
                            if (m.mainImageUrl) {
                                if (m.mainImageUrl.toLowerCase().endsWith('.pdf') || m.mainImageUrl.includes('drive.google.com/file/d/')) {
                                    mediaHtml = `
                                    <div style="width: 64px; height: 64px; flex-shrink: 0; border-radius: 12px; background: #eff6ff; display: flex; align-items: center; justify-content: center; border: 1px solid #bfdbfe;">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    </div>`;
                                } else {
                                    mediaHtml = `
                                    <div style="width: 64px; height: 64px; flex-shrink: 0; border-radius: 12px; overflow: hidden; background: #f1f5f9; border: 1px solid #e2e8f0;">
                                        <img src="${m.mainImageUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
                                    </div>`;
                                }
                            } else if (m.videoUrl) {
                                let videoId = '';
                                if (m.videoUrl.includes('youtube.com/watch')) { videoId = new URL(m.videoUrl).searchParams.get('v'); } 
                                else if (m.videoUrl.includes('youtu.be/')) { videoId = m.videoUrl.split('youtu.be/')[1].split('?')[0]; } 
                                
                                if (videoId) {
                                    mediaHtml = `
                                    <div style="width: 64px; height: 64px; flex-shrink: 0; border-radius: 12px; overflow: hidden; background: #000; position: relative; border: 1px solid #e2e8f0;">
                                        <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.7;" />
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                    </div>`;
                                } else {
                                    mediaHtml = `
                                    <div style="width: 64px; height: 64px; flex-shrink: 0; border-radius: 12px; overflow: hidden; background: #1e293b; display: flex; align-items: center; justify-content: center;">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                    </div>`;
                                }
                            }

                            const snippet = m.message ? m.message.replace(/<[^>]*>?/gm, '').replace(/\\n/g, ' ').trim() : '';

                            return `
                                <div class="w-sync-history-item" data-idx="${idx}" style="display: flex; gap: 14px; align-items: flex-start;">
                                    ${mediaHtml}
                                    <div style="flex: 1; min-width: 0;">
                                        ${m.created_at ? `<div class="w-sync-history-date" style="font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${new Date(m.created_at).toLocaleDateString()}</div>` : ''}
                                        <div class="w-sync-history-title" style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 6px; line-height: 1.25;">${m.title}</div>
                                        <div style="font-size: 13px; color: #475569; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; line-height: 1.5;">${snippet}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        const div = document.createElement('div');
        div.innerHTML = drawerHtml;
        const overlay = div.firstElementChild;
        document.body.appendChild(overlay);
        currentDrawer = overlay;

        requestAnimationFrame(() => {
            overlay.classList.add('w-sync-drawer-show');
        });

        document.getElementById('w-sync-drawer-close').onclick = closeDrawer;
        overlay.onclick = (e) => { if(e.target === overlay) closeDrawer(); };

        const items = overlay.querySelectorAll('.w-sync-history-item');
        items.forEach(item => {
            item.onclick = () => {
                closeDrawer();
                renderPopup(messages[item.getAttribute('data-idx')], messages, true); // fromHistory=true
            };
        });
    }

    function renderFloatingWidget(messages) {
        if (document.getElementById('w-sync-floating-btn')) return;

        const hasUrgent = messages.some(m => m.isUrgent);
        
        const btn = document.createElement('div');
        btn.id = 'w-sync-floating-btn';
        btn.style.position = 'fixed';
        btn.style.zIndex = '99';

        const a = document.createElement('a');
        a.href = '#';
        a.style.display = 'flex';
        a.style.alignItems = 'center';
        a.style.justifyContent = 'center';
        a.style.width = '100%';
        a.style.height = '100%';
        a.style.textDecoration = 'none';
        a.title = 'Novedades y Avisos';
        
        if (hasUrgent) {
            a.className = 'w-sync-pulse-red';
            a.style.borderRadius = '50%';
            a.style.backgroundColor = 'rgba(225, 29, 72, 0.2)';
        } else {
            a.onmouseover = () => a.style.transform = 'scale(1.1)';
            a.onmouseout = () => a.style.transform = 'scale(1)';
            a.style.transition = 'transform 0.2s';
        }

        // Color blanco para que no se pierda en el fondo azul marino oscuro
        a.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${hasUrgent ? '#ff4444' : '#ffffff'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
        `;

        btn.appendChild(a);

        a.onclick = (e) => {
            e.preventDefault();
            renderHistoryDrawer(messages);
        };

        const star = document.getElementById('bookmarksOpt');
        if (star) {
            const rect = star.getBoundingClientRect();
            // Copiamos medidas exactas de la estrella para un centrado perfecto
            btn.style.left = rect.left + 'px';
            btn.style.width = rect.width + 'px';
            btn.style.height = rect.height + 'px';
            // Calculamos la posición justo arriba (+10px de margen)
            btn.style.bottom = (window.innerHeight - rect.top + 10) + 'px'; 
        } else {
            // Fallback
            btn.style.left = '10px';
            btn.style.bottom = '150px';
            btn.style.width = '42px';
            btn.style.height = '42px';
        }
        
        document.body.appendChild(btn);
    }

    // --- Init ---
    async function init() {
        injectStyles();
        const { currentMessages, updateId } = await fetchMain();
        
        if (currentMessages && currentMessages.length > 0) {
            renderFloatingWidget(currentMessages);

            const seenIds = getSeenIds();
            // Mostramos solo si hay algún mensaje que el usuario NO ha visto todavía
            const unseenMessages = currentMessages.filter(m => !seenIds.has(String(m.id)));
            if (unseenMessages.length > 0) {
                // Mostramos el popup conteniendo y navegando únicamente por los mensajes no vistos
                renderPopup(unseenMessages[0], unseenMessages);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
