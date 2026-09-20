import React, { useState, useEffect } from 'react';
import { LogOut, Save, Plus, Trash2, Edit3, Eye, AlertTriangle, Monitor, Globe, Code, Image, Youtube, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';
import { parseImportedConfig } from '../config';
import { WelcomePopup } from './WelcomePopup';



export function ConfigPortal({ onBack, onPreview }) {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [editingMsg, setEditingMsg] = useState(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    
    const [isAddingClient, setIsAddingClient] = useState(false);
    const [clientForm, setClientForm] = useState({ id: '', nombre: '', logo_url: '' });
    
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [broadcast, setBroadcast] = useState({ mensaje: '', target_clientes: ['all'], duracion_horas: 2 });
    
    const [status, setStatus] = useState(null);
    const [activeBroadcasts, setActiveBroadcasts] = useState([]);

    useEffect(() => {
        loadClients();
        loadActiveBroadcasts();
    }, []);

    const loadClients = async () => {
        const { data } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
        if (data) setClients(data);
    };

    const loadActiveBroadcasts = async () => {
        const { data } = await supabase.from('avisos_globales').select('*').order('created_at', { ascending: false });
        if (data) setActiveBroadcasts(data);
    };

    const loadMessages = async (clientId) => {
        const { data } = await supabase.from('mensajes').select('*').eq('cliente_id', clientId).order('created_at', { ascending: false });
        if (data) setMessages(data);
    };

    const [editingClient, setEditingClient] = useState(null);

    const selectClient = (client) => {
        setSelectedClient(client);
        setEditingMsg(null);
        setShowBroadcast(false);
        loadMessages(client.id);
    };

    const handleSaveClient = async () => {
        if (!clientForm.id || !clientForm.nombre) return;
        const cleanId = clientForm.id.toLowerCase().trim().replace(/\/$/, '');
        const payload = { 
            id: cleanId, 
            nombre: clientForm.nombre,
            logo_url: clientForm.logo_url?.trim() || null
        };
        const { error } = await supabase.from('clientes').upsert(payload);
        if (!error) {
            loadClients();
            setIsAddingClient(false);
            setClientForm({ id: '', nombre: '', logo_url: '' });
            selectClient(payload);
        } else {
            console.error(error);
            alert("Error al guardar cliente: " + error.message);
        }
    };

    const handleUpdateClient = async () => {
        if (!editingClient || !editingClient.id || !editingClient.nombre) return;
        const oldId = selectedClient.id;
        const newId = editingClient.id.toLowerCase().trim().replace(/\/$/, '');
        const newNombre = editingClient.nombre.trim();
        const newLogoUrl = editingClient.logo_url?.trim() || null;

        if (oldId === newId) {
            // Se actualizan nombre y/o logo_url
            const { error } = await supabase.from('clientes').update({ 
                nombre: newNombre,
                logo_url: newLogoUrl
            }).eq('id', oldId);
            if (error) {
                alert("Error al actualizar cliente: " + error.message);
                return;
            }
            const updated = { ...selectedClient, nombre: newNombre, logo_url: newLogoUrl };
            setSelectedClient(updated);
            setClients(clients.map(c => c.id === oldId ? updated : c));
            setEditingClient(null);
            setStatus({ type: 'success', msg: '¡Cliente actualizado con éxito!' });
            setTimeout(() => setStatus(null), 3000);
        } else {
            // Cambió el ID (dominio): creamos el nuevo cliente, migramos los mensajes y borramos el viejo
            setStatus({ type: 'info', msg: 'Actualizando ID y migrando mensajes...' });
            
            // 1. Crear / Upsert nuevo cliente
            const { error: insertErr } = await supabase.from('clientes').upsert({
                id: newId,
                nombre: newNombre,
                logo_url: newLogoUrl,
                pin: selectedClient.pin || null,
                activo: selectedClient.activo !== false
            });
            if (insertErr) {
                alert("Error al crear cliente con el nuevo ID: " + insertErr.message);
                setStatus(null);
                return;
            }

            // 2. Migrar mensajes asociados al nuevo cliente_id
            const { error: msgErr } = await supabase.from('mensajes').update({ cliente_id: newId }).eq('cliente_id', oldId);
            if (msgErr) {
                console.warn("Advertencia al migrar mensajes:", msgErr);
            }

            // 3. Eliminar cliente con el ID viejo
            await supabase.from('clientes').delete().eq('id', oldId);

            const updated = { ...selectedClient, id: newId, nombre: newNombre, logo_url: newLogoUrl };
            await loadClients();
            setSelectedClient(updated);
            setEditingClient(null);
            loadMessages(newId);
            setStatus({ type: 'success', msg: `¡Cliente e ID actualizados a "${newId}"!` });
            setTimeout(() => setStatus(null), 3000);
        }
    };

    const handleDeleteClient = async (clientToDelete) => {
        const client = clientToDelete || selectedClient;
        if (!client) return;

        const confirmText = `¿Estás seguro de que deseas eliminar permanentemente al cliente "${client.nombre}" (${client.id})?\n\nEsta acción también eliminará todos sus mensajes y no se puede deshacer.`;
        if (!window.confirm(confirmText)) return;

        setStatus({ type: 'info', msg: `Eliminando cliente ${client.id}...` });

        try {
            // 1. Eliminar mensajes asociados a este cliente
            await supabase.from('mensajes').delete().eq('cliente_id', client.id);

            // 2. Eliminar el registro del cliente
            const { error } = await supabase.from('clientes').delete().eq('id', client.id);
            if (error) throw error;

            await loadClients();
            if (selectedClient?.id === client.id) {
                setSelectedClient(null);
                setEditingClient(null);
                setMessages([]);
            }

            setStatus({ type: 'success', msg: `Cliente "${client.nombre}" eliminado correctamente.` });
            setTimeout(() => setStatus(null), 3000);
        } catch (err) {
            console.error("Error al eliminar cliente:", err);
            alert("Error al eliminar cliente: " + err.message);
            setStatus(null);
        }
    };

    const handleSaveMessage = async () => {
        if (!editingMsg.title || !editingMsg.message) return alert("Título y mensaje son obligatorios");
        const payload = { ...editingMsg, cliente_id: selectedClient.id };
        const { error } = await supabase.from('mensajes').upsert(payload);
        if (!error) {
            loadMessages(selectedClient.id);
            setEditingMsg(null);
            setStatus({ type: 'success', msg: '¡Mensaje guardado!' });
            setTimeout(() => setStatus(null), 3000);
        } else {
            alert(error.message);
        }
    };

    const handleDeleteMessage = async (id) => {
        if (!window.confirm("¿Estás seguro de borrar este mensaje?")) return;
        await supabase.from('mensajes').delete().eq('id', id);
        loadMessages(selectedClient.id);
    };

    const handleSaveBroadcast = async () => {
        let finalMensaje = broadcast.mensaje;
        if (broadcast.mainImageUrl || broadcast.videoUrl) {
            finalMensaje = JSON.stringify({
                _isPacked: true,
                texto: broadcast.mensaje,
                img: broadcast.mainImageUrl || null,
                vid: broadcast.videoUrl || null
            });
        }
        const payload = {
            mensaje: finalMensaje,
            target_clientes: broadcast.target_clientes,
            duracion_horas: broadcast.duracion_horas
        };

        const { error } = await supabase.from('avisos_globales').insert([payload]);
        if (!error) {
            setStatus({ type: 'success', msg: '¡Aviso global publicado instantáneamente!' });
            setBroadcast({ mensaje: '', target_clientes: ['all'], duracion_horas: 2, mainImageUrl: '', videoUrl: '' });
            loadActiveBroadcasts();
            setTimeout(() => setStatus(null), 3000);
        } else {
            alert(error.message);
        }
    };

    const handleDeleteBroadcast = async (id) => {
        if (!window.confirm("¿Estás seguro de borrar este aviso global?")) return;
        await supabase.from('avisos_globales').delete().eq('id', id);
        loadActiveBroadcasts();
    };

    const handleImportOldConfig = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target.result;
                const imported = parseImportedConfig(content);
                if (!imported || !imported.clientId) {
                    alert("Error: El archivo no parece tener la estructura correcta de un historial.");
                    return;
                }
                
                setStatus({ type: 'info', msg: `Importando historial de ${imported.clientId}...` });
                const cleanId = imported.clientId.toLowerCase().trim().replace(/\/$/, '');
                
                // 1. Guardar cliente
                const { error: clientError } = await supabase.from('clientes').upsert({ id: cleanId, nombre: cleanId });
                if (clientError) {
                    alert("Error de BD creando cliente: " + clientError.message);
                    return;
                }
            
            // 2. Guardar mensajes
            if (imported.messages && imported.messages.length > 0) {
                const msgsToInsert = imported.messages.map((m, idx) => ({
                    // Generamos un UUID nuevo SIEMPRE, porque los IDs viejos eran timestamps (invalid uuid)
                    id: crypto.randomUUID(),
                    cliente_id: cleanId,
                    title: m.title || 'Sin Título',
                    message: m.message || '',
                    logoUrl: m.logoUrl || '',
                    videoUrl: m.videoUrl || '',
                    mainImageUrl: m.mainImageUrl || '',
                    activo: m.active !== false,
                    orden: idx,
                    created_at: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString()
                }));
                
                const { error: msgError } = await supabase.from('mensajes').upsert(msgsToInsert);
                if (msgError) {
                    alert("Error importando mensajes: " + msgError.message);
                    return;
                }
            }
            
            loadClients();
            setStatus({ type: 'success', msg: `¡Historial de ${cleanId} importado con éxito!` });
            setTimeout(() => setStatus(null), 3000);
            e.target.value = '';
            
            } catch (err) {
                console.error(err);
                alert("Ocurrió un error inesperado al importar: " + err.message);
            }
        };
        reader.readAsText(file);
    };

    const compressImage = (file, maxWidth = 900, quality = 0.75) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                // Si es un GIF animado, no pasarlo por canvas porque se convertiría en un JPEG estático
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

    const handleTextareaPaste = async (e, currentText, onUpdateText) => {
        const clipboardItems = e.clipboardData?.items;
        if (!clipboardItems) return;

        for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;

                setStatus({ type: 'info', msg: 'Procesando imagen pegada...' });
                try {
                    const base64 = await compressImage(file, 900, 0.75);
                    const textarea = e.target;
                    const start = textarea.selectionStart ?? currentText.length;
                    const end = textarea.selectionEnd ?? currentText.length;
                    const before = currentText.substring(0, start);
                    const after = currentText.substring(end);
                    const imgTag = `\n<img src="${base64}" />\n`;
                    const updated = before + imgTag + after;
                    onUpdateText(updated);
                    setStatus({ type: 'success', msg: '¡Imagen pegada e insertada en el mensaje!' });
                    setTimeout(() => setStatus(null), 3000);
                } catch (err) {
                    console.error("Error al procesar imagen pegada:", err);
                    setStatus({ type: 'error', msg: 'Error al procesar imagen' });
                    setTimeout(() => setStatus(null), 3000);
                }
                break;
            }
        }
    };

    const applyFormat = (tag) => {
        const textarea = document.getElementById('msg-textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = editingMsg.message;
        const before = text.substring(0, start);
        const selected = text.substring(start, end);
        const after = text.substring(end);
        let newText = text;
        
        if (tag === 'b') newText = before + `<b>${selected || 'negrita'}</b>` + after;
        if (tag === 'i') newText = before + `<i>${selected || 'cursiva'}</i>` + after;
        
        setEditingMsg({ ...editingMsg, message: newText });
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#f1f5f9', zIndex: 99999, display: 'flex' }}>
            
            {/* SIDEBAR */}
            <div style={{ width: '280px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Clientes</h2>
                    <button onClick={onBack} title="Cerrar Sesión" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><LogOut size={20} /></button>
                </div>
                
                <div style={{ padding: '15px' }}>
                    <button 
                        onClick={() => { setIsAddingClient(true); setSelectedClient(null); setShowBroadcast(false); }}
                        style={{ width: '100%', padding: '10px', background: '#eff6ff', color: '#2563eb', border: '1px dashed #bfdbfe', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <Plus size={16} /> Nuevo Cliente
                    </button>
                </div>

                <div style={{ padding: '0 15px', marginBottom: '15px' }}>
                    <button 
                        onClick={() => { setShowBroadcast(true); setSelectedClient(null); setIsAddingClient(false); }}
                        style={{ width: '100%', padding: '10px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <AlertTriangle size={16} /> Aviso Relámpago
                    </button>
                </div>

                <div style={{ padding: '0 15px', marginBottom: '15px' }}>
                    <label style={{ width: '100%', padding: '10px', background: '#f8fafc', color: '#475569', border: '1px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box' }}>
                        <Save size={16} /> Importar anterior (.js)
                        <input type="file" accept=".js,.json" onChange={handleImportOldConfig} style={{ display: 'none' }} />
                    </label>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {clients.map(c => (
                        <div 
                            key={c.id} 
                            onClick={() => selectClient(c)}
                            style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', background: selectedClient?.id === c.id ? '#f8fafc' : 'white', borderLeft: selectedClient?.id === c.id ? '4px solid #3b82f6' : '4px solid transparent' }}
                        >
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.nombre}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{c.id}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                {status && (
                    <div style={{ padding: '15px', background: status.type === 'success' ? '#dcfce7' : '#fee2e2', color: status.type === 'success' ? '#16a34a' : '#ef4444', borderRadius: '12px', marginBottom: '20px', fontWeight: 600, textAlign: 'center' }}>
                        {status.msg}
                    </div>
                )}

                {isAddingClient && (
                    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', maxWidth: '500px' }}>
                        <h2 style={{ marginTop: 0 }}>Crear Nuevo Cliente</h2>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>Dominio (ID)</label>
                            <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="sanjuan.gob.ar" value={clientForm.id} onChange={e => setClientForm({...clientForm, id: e.target.value})} />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>Nombre Legible</label>
                            <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="Gobierno de San Juan" value={clientForm.nombre} onChange={e => setClientForm({...clientForm, nombre: e.target.value})} />
                        </div>
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>URL de Logotipo por defecto (pequeño)</label>
                            <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="https://..." value={clientForm.logo_url} onChange={e => setClientForm({...clientForm, logo_url: e.target.value})} />
                            {clientForm.logo_url && (
                                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Vista previa:</span>
                                    <img src={clientForm.logo_url} alt="Logo" style={{ maxHeight: '35px', borderRadius: '4px', border: '1px solid #e2e8f0', padding: '2px', background: '#f8fafc' }} onError={e => e.target.style.display = 'none'} />
                                </div>
                            )}
                        </div>
                        <button onClick={handleSaveClient} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, width: '100%' }}>Guardar Cliente</button>
                    </div>
                )}

                {showBroadcast && (
                    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
                        <h2 style={{ marginTop: 0, color: '#e11d48', display: 'flex', alignItems: 'center', gap: '10px' }}><AlertTriangle /> Emitir Aviso Global</h2>
                        <p style={{ color: '#64748b', fontSize: '14px' }}>Este aviso aparecerá instantáneamente en todos los sitios seleccionados y desaparecerá solo cuando pase el tiempo establecido.</p>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', flexWrap: 'wrap', gap: '8px' }}>
                                <label style={{ fontWeight: 600, fontSize: '14px' }}>Mensaje</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const template = "Estimados usuarios,\n\nLes informamos que el día de hoy a las [HORA] hs estaremos realizando una actualización y mantenimiento programado en el sistema.\n\nDurante este proceso, el servicio no se encontrará disponible por un lapso estimado de [TIEMPO, ej: 30 minutos].\n\nAgradecemos su comprensión y paciencia mientras trabajamos en mejorar la plataforma.";
                                            setBroadcast({ ...broadcast, mensaje: template });
                                        }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            background: '#eff6ff',
                                            color: '#2563eb',
                                            border: '1px solid #bfdbfe',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Sparkles size={13} /> Plantilla Actualización
                                    </button>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>💡 Podés pegar (Ctrl+V) una captura</span>
                                </div>
                            </div>
                            <textarea 
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px', lineHeight: '1.5' }} 
                                placeholder="Escribe el aviso o selecciona la plantilla de actualización arriba. (Puedes pegar imágenes directamente)" 
                                value={broadcast.mensaje} 
                                onChange={e => setBroadcast({...broadcast, mensaje: e.target.value})} 
                                onPaste={e => handleTextareaPaste(e, broadcast.mensaje, (newText) => setBroadcast({...broadcast, mensaje: newText}))}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}><Image size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>URL Imagen (Opcional)</label>
                                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="https://..." value={broadcast.mainImageUrl || ''} onChange={e => setBroadcast({...broadcast, mainImageUrl: e.target.value})} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}><Youtube size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>URL YouTube (Opcional)</label>
                                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="https://..." value={broadcast.videoUrl || ''} onChange={e => setBroadcast({...broadcast, videoUrl: e.target.value})} />
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>¿Para quién?</label>
                                <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={broadcast.target_clientes[0]} onChange={e => setBroadcast({...broadcast, target_clientes: [e.target.value]})}>
                                    <option value="all">Todos los clientes</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>Solo {c.nombre}</option>)}
                                </select>
                            </div>
                            <div style={{ width: '120px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>Duración (hs)</label>
                                <input type="number" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={broadcast.duracion_horas} onChange={e => setBroadcast({...broadcast, duracion_horas: parseInt(e.target.value)})} />
                            </div>
                        </div>

                        <button onClick={handleSaveBroadcast} style={{ background: '#e11d48', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, width: '100%' }}>Lanzar Aviso Relámpago</button>
                        
                        {activeBroadcasts.length > 0 && (
                            <div style={{ marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                <h3 style={{ marginTop: 0, fontSize: '16px', color: '#1e293b' }}>Avisos Activos ({activeBroadcasts.length})</h3>
                                {activeBroadcasts.map(ab => {
                                    let txt = ab.mensaje;
                                    try { if(txt.includes('_isPacked')) txt = JSON.parse(txt).texto; } catch(e) {}
                                    return (
                                        <div key={ab.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '10px' }}>
                                            <div style={{ flex: 1, marginRight: '15px' }}>
                                                <div style={{ fontWeight: 600, fontSize: '14px', color: '#334155' }}>{txt}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>Targets: {ab.target_clientes.join(', ')} | Expira en: {ab.duracion_horas} hs</div>
                                            </div>
                                            <button onClick={() => handleDeleteBroadcast(ab.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {editingClient && (
                    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>Editar Cliente</h2>
                            <button onClick={() => setEditingClient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>Cancelar</button>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>Dominio / ID del Cliente</label>
                            <input 
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }} 
                                placeholder="formosa.gob.ar" 
                                value={editingClient.id} 
                                onChange={e => setEditingClient({ ...editingClient, id: e.target.value })} 
                            />
                            <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                ⚠️ Si modificas este ID, los mensajes existentes se asociarán automáticamente al nuevo ID.
                            </span>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>Nombre Legible</label>
                            <input 
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                                placeholder="Provincia de Formosa - Sigho 4.0" 
                                value={editingClient.nombre} 
                                onChange={e => setEditingClient({ ...editingClient, nombre: e.target.value })} 
                            />
                        </div>
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>URL de Logotipo por defecto (pequeño)</label>
                            <input 
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                                placeholder="https://..." 
                                value={editingClient.logo_url || ''} 
                                onChange={e => setEditingClient({ ...editingClient, logo_url: e.target.value })} 
                            />
                            {editingClient.logo_url && (
                                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Vista previa:</span>
                                    <img src={editingClient.logo_url} alt="Logo" style={{ maxHeight: '35px', borderRadius: '4px', border: '1px solid #e2e8f0', padding: '2px', background: '#f8fafc' }} onError={e => e.target.style.display = 'none'} />
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={handleUpdateClient} 
                                style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, flex: 1 }}
                            >
                                Guardar Cambios
                            </button>
                            <button 
                                onClick={() => handleDeleteClient(selectedClient)} 
                                style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                title="Eliminar este cliente y sus mensajes"
                            >
                                <Trash2 size={16} /> Eliminar Cliente
                            </button>
                            <button 
                                onClick={() => setEditingClient(null)} 
                                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {selectedClient && !editingMsg && !showBroadcast && !isAddingClient && !editingClient && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '5px' }}>
                                    <h1 style={{ margin: 0 }}>{selectedClient.nombre}</h1>
                                    <button 
                                        onClick={() => setEditingClient({ id: selectedClient.id, nombre: selectedClient.nombre, logo_url: selectedClient.logo_url || '' })} 
                                        title="Editar ID, Nombre y Logo del cliente"
                                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', fontWeight: 600 }}
                                    >
                                        <Edit3 size={14} /> Editar
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteClient(selectedClient)} 
                                        title="Eliminar este cliente"
                                        style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#e11d48', fontWeight: 600 }}
                                    >
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                </div>
                                <div style={{ color: '#64748b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                        <Globe size={14} /> ID: <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#0f172a', fontWeight: 600 }}>{selectedClient.id}</code>
                                    </span>
                                    {selectedClient.logo_url && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#f8fafc', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                            <span>Logo por defecto:</span>
                                            <img src={selectedClient.logo_url} alt="Logo" style={{ maxHeight: '20px', verticalAlign: 'middle' }} onError={e => e.target.style.display = 'none'} />
                                        </span>
                                    )}
                                </div>
                                <div style={{ background: '#f8fafc', padding: '10px 15px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '15px', border: '1px solid #e2e8f0' }}>
                                    <div>
                                        <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Portal de Emergencias</span>
                                        <a href={`/emergencia/${selectedClient.id}`} target="_blank" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                                            newspopup.vadigu.com/emergencia/{selectedClient.id}
                                        </a>
                                    </div>
                                    <button onClick={() => { navigator.clipboard.writeText(`https://newspopup.vadigu.com/emergencia/${selectedClient.id}`); setStatus({ type: 'success', msg: 'URL copiada al portapapeles' }); setTimeout(() => setStatus(null), 3000); }} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                                        Copiar Link
                                    </button>
                                    <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }}></div>
                                    <div>
                                        <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px' }}>PIN de Acceso</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', letterSpacing: '2px' }}>{selectedClient.pin || '1234'}</span>
                                            <button onClick={async () => {
                                                const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                                                const { error } = await supabase.from('clientes').update({ pin: newPin }).eq('id', selectedClient.id);
                                                if (!error) {
                                                    setSelectedClient({ ...selectedClient, pin: newPin });
                                                    setClients(clients.map(c => c.id === selectedClient.id ? { ...c, pin: newPin } : c));
                                                    setStatus({ type: 'success', msg: `PIN actualizado a ${newPin}` });
                                                    setTimeout(() => setStatus(null), 3000);
                                                } else {
                                                    alert("Error. Asegurate de haber creado la columna 'pin' en la tabla clientes de Supabase.");
                                                }
                                            }} style={{ background: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer', padding: '0', textDecoration: 'underline', fontSize: '11px' }}>
                                                Generar nuevo
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setIsPreviewing(true)} style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Eye size={18} /> Vista Previa
                                </button>
                                <button onClick={() => setEditingMsg({ title: '', message: '', activo: true, mainImageUrl: '', videoUrl: '', logoUrl: selectedClient.logo_url || '' })} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Plus size={18} /> Nuevo Mensaje
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '15px' }}>
                            {messages.map(msg => (
                                <div key={msg.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: msg.activo ? 1 : 0.6 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b', marginBottom: '4px' }}>
                                            {!msg.activo && <span style={{ background: '#cbd5e1', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginRight: '8px' }}>INACTIVO</span>}
                                            {msg.title}
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span>Creado: {new Date(msg.created_at).toLocaleDateString()}</span>
                                            {msg.mainImageUrl && <span>📸 Imagen</span>}
                                            {msg.videoUrl && <span>🎥 Video</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setEditingMsg(msg)} style={{ padding: '8px', border: 'none', background: '#f1f5f9', borderRadius: '8px', color: '#3b82f6', cursor: 'pointer' }}><Edit3 size={18} /></button>
                                        <button onClick={() => handleDeleteMessage(msg.id)} style={{ padding: '8px', border: 'none', background: '#fff1f2', borderRadius: '8px', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', background: 'white', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                                    No hay mensajes para este cliente. ¡Crea el primero!
                                </div>
                            )}
                        </div>

                        {/* Código de instalación */}
                        <div style={{ marginTop: '40px', background: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Code size={20} /> Código de Instalación</h3>
                            <pre style={{ background: '#1e293b', color: '#38bdf8', padding: '15px', borderRadius: '8px', fontSize: '13px', overflowX: 'auto' }}>
{`<script>
(function(){
  var s = document.createElement('script');
  s.src = "https://newspopup.vadigu.com/welcome-loader.js?v=" + Date.now();
  document.head.appendChild(s);
})();
</script>`}
                            </pre>
                            <button onClick={() => {
                                navigator.clipboard.writeText(`<script>\n(function(){\n  var s = document.createElement('script');\n  s.src = "https://newspopup.vadigu.com/welcome-loader.js?v=" + Date.now();\n  document.head.appendChild(s);\n})();\n</script>`);
                                alert("Copiado al portapapeles");
                            }} style={{ marginTop: '10px', background: '#f1f5f9', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>Copiar Código</button>
                        </div>
                    </div>
                )}

                {editingMsg && (
                    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', maxWidth: '700px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>{editingMsg.id ? 'Editar Mensaje' : 'Nuevo Mensaje'}</h2>
                            <button onClick={() => setEditingMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>Cancelar</button>
                        </div>

                        <div style={{ display: 'grid', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>Título</label>
                                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={editingMsg.title} onChange={e => setEditingMsg({...editingMsg, title: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>
                                    <span>Mensaje Principal <span style={{ fontWeight: 400, fontSize: '12px', color: '#64748b' }}>(podés pegar imágenes con Ctrl+V)</span></span>
                                    <span style={{ display: 'flex', gap: '5px' }}>
                                        <button onClick={() => applyFormat('b')} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 'bold' }}>B</button>
                                        <button onClick={() => applyFormat('i')} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontStyle: 'italic' }}>I</button>
                                    </span>
                                </label>
                                <textarea 
                                    id="msg-textarea" 
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '120px' }} 
                                    value={editingMsg.message} 
                                    onChange={e => setEditingMsg({...editingMsg, message: e.target.value})} 
                                    onPaste={e => handleTextareaPaste(e, editingMsg.message, (newText) => setEditingMsg({...editingMsg, message: newText}))}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>URL de Imagen / PDF</label>
                                    <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="https://..." value={editingMsg.mainImageUrl || ''} onChange={e => setEditingMsg({...editingMsg, mainImageUrl: e.target.value})} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>URL de Video (YouTube)</label>
                                    <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="https://..." value={editingMsg.videoUrl || ''} onChange={e => setEditingMsg({...editingMsg, videoUrl: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>URL de Logotipo pequeño</label>
                                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="https://..." value={editingMsg.logoUrl || ''} onChange={e => setEditingMsg({...editingMsg, logoUrl: e.target.value})} />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
                                <input type="checkbox" checked={editingMsg.activo !== false} onChange={e => setEditingMsg({...editingMsg, activo: e.target.checked})} />
                                <span style={{ fontWeight: 600 }}>Mensaje Activo (Visible)</span>
                            </label>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button onClick={() => setIsPreviewing(true)} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Eye size={18} /> Previsualizar Todo</button>
                                <button onClick={handleSaveMessage} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Save size={18} /> Guardar Mensaje</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isPreviewing && (
                <WelcomePopup 
                    localConfig={{}} 
                    previewData={editingMsg ? editingMsg : messages[0]} 
                    onPreviewClose={() => setIsPreviewing(false)} 
                />
            )}
        </div>
    );
}
