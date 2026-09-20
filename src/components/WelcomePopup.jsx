import React, { useState, useEffect } from 'react';
import { X, PlayCircle, ChevronRight } from 'lucide-react';
import './WelcomePopup.css';
import { getSeenIds, markIdAsSeen, markAllIdsAsSeen, fetchRemoteWelcome } from '../config';

export function WelcomePopup({ localConfig, previewData = null, onPreviewClose = null, fromHistory = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [remoteMessages, setRemoteMessages] = useState([]);
    const [currentMsgIndex, setCurrentMsgIndex] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [currentUpdateId, setCurrentUpdateId] = useState(null);
    const [zoomUrl, setZoomUrl] = useState(null);

    // Efecto para carga normal (Producción/Background)
    useEffect(() => {
        if (previewData) return;

        const checkMessages = async () => {
            const seenIds = getSeenIds();
            const remoteData = await fetchRemoteWelcome(localConfig.clientId);
            const messagesToShow = remoteData?.messages || localConfig.messages || [];

            if (messagesToShow.length > 0) {
                const unseen = messagesToShow.filter(m => !seenIds.has(String(m.id)));
                if (unseen.length > 0) {
                    setRemoteMessages(unseen); // solo los mensajes no vistos para este popup
                    setCurrentMsgIndex(0); // empezamos en el primero
                    setIsOpen(true);
                }
            }
        };
        checkMessages();
    }, [localConfig.clientId, localConfig.updateId, previewData]);

    // Efecto para Vista Previa en Vivo
    useEffect(() => {
        // En modo preview (dentro de la app), ignoramos el localStorage para que siempre sea visible
        if (previewData) {
            setRemoteMessages([previewData]); // Set the preview data as the message
            setCurrentMsgIndex(0); // Start from the first message
            setIsOpen(true);
            return;
        }
    }, [localConfig, previewData]);

    const handleClose = () => {
        if (previewData) {
            setIsOpen(false);
            if (onPreviewClose) onPreviewClose();
            return;
        }

        if (dontShowAgain) {
            // Marcar este mensaje como no volver a mostrar
            markIdAsSeen(remoteMessages[currentMsgIndex]?.id);
        }
        setIsOpen(false);
    };

    const getEmbedUrl = (url) => {
        if (!url) return null;

        // YouTube logic
        if (url.includes('youtube.com/watch?v=')) {
            const id = url.split('v=')[1]?.split('&')[0];
            return `https://www.youtube.com/embed/${id}`;
        }
        if (url.includes('youtu.be/')) {
            const id = url.split('youtu.be/')[1]?.split('?')[0];
            return `https://www.youtube.com/embed/${id}`;
        }

        // Drive logic
        if (url.includes('drive.google.com/file/d/')) {
            const id = url.split('/d/')[1]?.split('/')[0];
            return `https://drive.google.com/file/d/${id}/preview`;
        }

        return null;
    };

    const formatMessage = (text) => {
        if (!text) return "";
        // Convert basic Markdown **bold** to <b>
        return text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    };

    if (!isOpen || remoteMessages.length === 0) return null;

    const msg = remoteMessages[currentMsgIndex];
    const embedUrl = getEmbedUrl(msg.videoUrl);

    return (
        <div className="welcome-popup-overlay">
            <div className="welcome-popup-content premium-glass">
                <button className="welcome-popup-close" onClick={handleClose}>
                    <X size={24} />
                </button>

                <div className="welcome-popup-body">
                    {msg.logoUrl && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                            <img src={msg.logoUrl} alt="Logo" style={{ maxHeight: '45px', borderRadius: '8px' }} />
                        </div>
                    )}

                    <h2 className="welcome-popup-title">{msg.title}</h2>
                    <div className="welcome-popup-message" dangerouslySetInnerHTML={{ __html: formatMessage(msg.message) }} />

                    {embedUrl ? (
                        <div className="welcome-popup-video-container" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px', marginBottom: '1.5rem' }}>
                            <iframe
                                src={embedUrl}
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Video de Bienvenida"
                            />
                        </div>
                    ) : (msg.mainImageUrl && (msg.mainImageUrl.toLowerCase().endsWith('.pdf') || msg.mainImageUrl.includes('drive.google.com/file/d/'))) ? (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ position: 'relative', paddingBottom: '120%', height: 0, overflow: 'hidden', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', marginBottom: '10px' }}>
                                <iframe
                                    src={msg.mainImageUrl.includes('drive.google.com') ? msg.mainImageUrl.replace('/view', '/preview').split('?')[0] : msg.mainImageUrl}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: '12px' }}
                                    title="Documento PDF"
                                />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <a 
                                    href={msg.mainImageUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                                >
                                    Abrir en pantalla completa ⇗
                                </a>
                            </div>
                        </div>
                    ) : msg.mainImageUrl ? (
                        <div 
                            className="welcome-popup-image-container" 
                            style={{ marginBottom: '1rem', cursor: 'zoom-in', position: 'relative' }}
                            onClick={() => setZoomUrl(msg.mainImageUrl)}
                        >
                            <img
                                src={msg.mainImageUrl}
                                alt="Imagen de Bienvenida"
                                style={{ width: '100%', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'block' }}
                            />
                            <div className="welcome-popup-image-hint">🔍 Click para ampliar</div>
                        </div>
                    ) : msg.videoUrl && (
                        <a href={msg.videoUrl} target="_blank" rel="noopener noreferrer" className="welcome-popup-media-btn" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '10px', background: '#f0fdf4',
                            border: '1px solid #10b981', color: '#059669',
                            padding: '14px', borderRadius: '16px', marginBottom: '1rem',
                            textDecoration: 'none', fontWeight: 700
                        }}>
                            <PlayCircle size={20} fill="currentColor" color="#ffffff" />
                            ABRIR VIDEO TUTORIAL
                        </a>
                    )}
                </div>

                <div className="welcome-popup-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        {!fromHistory ? (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', color: '#64748b' }}>
                                <input
                                    type="checkbox"
                                    checked={dontShowAgain}
                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                    style={{ accentColor: '#10b981', width: '18px', height: '18px' }}
                                />
                                No volver a mostrar
                            </label>
                        ) : <span />}

                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            Mensaje {currentMsgIndex + 1} de {remoteMessages.length}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        {currentMsgIndex > 0 && (
                            <button 
                                onClick={() => {
                                    if (dontShowAgain) {
                                        markIdAsSeen(remoteMessages[currentMsgIndex]?.id);
                                        setDontShowAgain(false);
                                    }
                                    setCurrentMsgIndex(prev => prev - 1);
                                }} 
                                className="welcome-popup-btn welcome-popup-btn-secondary"
                            >
                                Anterior
                            </button>
                        )}
                        {currentMsgIndex < remoteMessages.length - 1 ? (
                            <button 
                                onClick={() => {
                                    if (dontShowAgain) {
                                        markIdAsSeen(remoteMessages[currentMsgIndex]?.id);
                                        setDontShowAgain(false);
                                    }
                                    setCurrentMsgIndex(prev => prev + 1);
                                }} 
                                className="welcome-popup-btn" 
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                Siguiente <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button className="welcome-popup-btn" onClick={handleClose}>
                                {fromHistory ? 'Cerrar' : '¡Entendido!'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {zoomUrl && (
                <div className="welcome-popup-zoom-overlay" onClick={() => setZoomUrl(null)}>
                    <div className="welcome-popup-zoom-content" onClick={e => e.stopPropagation()}>
                        <img src={zoomUrl} alt="Zoom" />
                        <button className="welcome-popup-zoom-close" onClick={() => setZoomUrl(null)} title="Cerrar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
