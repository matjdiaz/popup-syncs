import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { AlertTriangle, Lock, LogOut, CheckCircle2, Trash2, Sparkles } from 'lucide-react';

export function EmergencyPortal({ clienteId }) {
    const [pin, setPin] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [clientData, setClientData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    
    const [mensaje, setMensaje] = useState('');
    const [mainImageUrl, setMainImageUrl] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [duracion, setDuracion] = useState(2);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [activeBroadcasts, setActiveBroadcasts] = useState([]);

    useEffect(() => {
        initEmergencySession();
    }, []);

    const initEmergencySession = async () => {
        try {
            // Hacemos login silencioso con el usuario genérico de emergencias
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            
            if (!session) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: 'emergencias@vadigu.com',
                    password: 'VadiguEmergencia123!'
                });
                if (signInError) throw signInError;
            }

            // Una vez logueado, buscamos el cliente
            const { data, error: fetchError } = await supabase
                .from('clientes')
                .select('*')
                .eq('id', clienteId)
                .single();

            if (fetchError || !data) {
                setError('Cliente no encontrado en el sistema.');
            } else {
                setClientData(data);
                // Si el cliente no tiene PIN configurado (columna 'pin' no existe o es null), avisamos
                if (data.pin === undefined) {
                    console.warn("Falta crear la columna 'pin' en la tabla clientes de Supabase");
                }
            }
        } catch (e) {
            console.error(e);
            setError('Error técnico: ' + (e.message || 'Error de conexión'));
        } finally {
            setLoading(false);
        }
    };

    const handlePinSubmit = (e) => {
        e.preventDefault();
        setError('');
        
        const correctPin = clientData?.pin || '1234'; // Default a 1234 si la columna no existe o está vacía
        
        if (pin === correctPin) {
            setIsAuthenticated(true);
            loadActiveBroadcasts();
        } else {
            setError('PIN incorrecto');
            setPin('');
        }
    };

    const loadActiveBroadcasts = async () => {
        const { data } = await supabase
            .from('avisos_globales')
            .select('*')
            .contains('target_clientes', [clienteId])
            .eq('activo', true)
            .order('created_at', { ascending: false });
        
        if (data) setActiveBroadcasts(data);
    };

    const compressImage = (file, maxWidth = 900, quality = 0.75) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                // Si es un GIF animado, preservar original sin pasar por canvas
                if (file.type === 'image/gif') {
                    resolve(e.target.result);
                    return;
                }
                const img = document.createElement('img');
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const handleTextareaPaste = async (e) => {
        const clipboardItems = e.clipboardData?.items;
        if (!clipboardItems) return;

        for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;

                try {
                    const base64 = await compressImage(file, 900, 0.75);
                    const textarea = e.target;
                    const start = textarea.selectionStart ?? mensaje.length;
                    const end = textarea.selectionEnd ?? mensaje.length;
                    const before = mensaje.substring(0, start);
                    const after = mensaje.substring(end);
                    const imgTag = `\n<img src="${base64}" />\n`;
                    setMensaje(before + imgTag + after);
                } catch (err) {
                    console.error("Error al procesar imagen pegada:", err);
                    alert("No se pudo procesar la imagen pegada.");
                }
                break;
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!mensaje.trim()) return;

        setIsSubmitting(true);
        try {
            // El backend del loader espera el json de _isPacked si usamos la app principal
            let finalMensaje = mensaje;
            if (mainImageUrl || videoUrl) {
                finalMensaje = JSON.stringify({
                    _isPacked: true,
                    texto: mensaje,
                    img: mainImageUrl || null,
                    vid: videoUrl || null
                });
            } else {
                finalMensaje = JSON.stringify({
                    _isPacked: true,
                    texto: mensaje,
                    img: null,
                    vid: null
                });
            }

            const { error } = await supabase.from('avisos_globales').insert([{
                mensaje: finalMensaje,
                target_clientes: [clienteId],
                duracion_horas: duracion,
                activo: true
            }]);

            if (error) throw error;

            setMensaje('');
            setMainImageUrl('');
            setVideoUrl('');
            alert('¡Aviso publicado correctamente!');
            loadActiveBroadcasts();
        } catch (err) {
            alert('Error al publicar: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que deseas desactivar este aviso?')) return;
        const { error } = await supabase.from('avisos_globales').update({ activo: false }).eq('id', id);
        if (!error) loadActiveBroadcasts();
    };

    if (loading) return <div style={{ display:'flex', height:'100vh', justifyContent:'center', alignItems:'center' }}>Cargando portal de emergencias...</div>;

    if (error && !clientData) {
        return (
            <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
                    <h2 style={{ color: '#1e293b', margin: '0 0 10px 0' }}>Error</h2>
                    <p style={{ color: '#64748b' }}>{error}</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', width: '100%', maxWidth: '380px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div style={{ background: '#fef2f2', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
                            <Lock size={30} color="#ef4444" />
                        </div>
                        <h2 style={{ margin: 0, color: '#1e293b' }}>Portal de Emergencias</h2>
                        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '5px' }}>{clientData.nombre}</p>
                    </div>
                    
                    <form onSubmit={handlePinSubmit}>
                        {error && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>{error}</div>}
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>Ingresa tu PIN de Seguridad</label>
                            <input 
                                type="password" 
                                maxLength={4}
                                value={pin} 
                                onChange={e => setPin(e.target.value.replace(/\D/g, ''))} 
                                style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '2px solid #cbd5e1', boxSizing: 'border-box', textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }} 
                                required 
                                autoFocus
                            />
                        </div>
                        <button type="submit" style={{ width: '100%', padding: '14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'background 0.2s' }}>
                            Acceder
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <AlertTriangle color="#ef4444" /> Avisos Relámpagos
                        </h1>
                        <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>{clientData.nombre}</p>
                    </div>
                    <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <LogOut size={16} /> Salir
                    </button>
                </div>

                <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px', borderTop: '4px solid #ef4444' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                <label style={{ fontWeight: 600, color: '#1e293b' }}>Mensaje de Urgencia</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const template = "Estimados usuarios,\n\nLes informamos que el día de hoy a las [HORA] hs estaremos realizando una actualización y mantenimiento programado en el sistema.\n\nDurante este proceso, el servicio no se encontrará disponible por un lapso estimado de [TIEMPO, ej: 30 minutos].\n\nAgradecemos su comprensión y paciencia mientras trabajamos en mejorar la plataforma.";
                                            setMensaje(template);
                                        }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: '#eff6ff',
                                            color: '#2563eb',
                                            border: '1px solid #bfdbfe',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Sparkles size={14} /> Plantilla: Notificación Actualización Sistema
                                    </button>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>💡 Podés pegar (Ctrl+V) una captura</span>
                                </div>
                            </div>
                            <textarea
                                value={mensaje}
                                onChange={e => setMensaje(e.target.value)}
                                onPaste={handleTextareaPaste}
                                rows="5"
                                placeholder="Escribe el mensaje de urgencia o selecciona la plantilla de actualización arriba. (Puedes pegar imágenes directamente)"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'vertical', fontSize: '15px', lineHeight: '1.5' }}
                                required
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#1e293b', fontSize: '14px' }}>URL Imagen (Opcional)</label>
                                <input style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} placeholder="https://..." value={mainImageUrl} onChange={e => setMainImageUrl(e.target.value)} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#1e293b', fontSize: '14px' }}>URL YouTube (Opcional)</label>
                                <input style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} placeholder="https://..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#1e293b' }}>¿Cuánto tiempo será visible?</label>
                            <select value={duracion} onChange={e => setDuracion(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', background: 'white' }}>
                                <option value={1}>1 Hora</option>
                                <option value={2}>2 Horas</option>
                                <option value={4}>4 Horas</option>
                                <option value={12}>12 Horas</option>
                                <option value={24}>24 Horas</option>
                            </select>
                        </div>

                        <button disabled={isSubmitting} type="submit" style={{ width: '100%', padding: '16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}>
                            <AlertTriangle size={20} />
                            {isSubmitting ? 'Publicando...' : 'LANZAR AVISO AHORA'}
                        </button>
                    </form>
                </div>

                {activeBroadcasts.length > 0 && (
                    <div>
                        <h3 style={{ color: '#1e293b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={18} color="#10b981" /> Avisos Activos ({activeBroadcasts.length})
                        </h3>
                        {activeBroadcasts.map(ab => (
                            <div key={ab.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '12px', borderLeft: '4px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Expira en {ab.duracion_horas}h</div>
                                    <div style={{ color: '#1e293b', fontWeight: 500 }}>
                                        {(() => {
                                            try {
                                                const p = JSON.parse(ab.mensaje);
                                                return p.texto || p;
                                            } catch {
                                                return ab.mensaje;
                                            }
                                        })()}
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(ab.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' }} title="Desactivar">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
