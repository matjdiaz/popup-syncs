import React, { useState, useEffect } from 'react';
import { WelcomePopup } from './components/WelcomePopup';
import { ConfigPortal } from './components/ConfigPortal';
import { EmergencyPortal } from './components/EmergencyPortal';
import { supabase } from './supabase';
import { Lock } from 'lucide-react';
import './App.css';

function App() {
    const path = window.location.pathname;
    if (path.startsWith('/emergencia/')) {
        const clienteId = path.split('/')[2];
        return <EmergencyPortal clienteId={clienteId} />;
    }

    const [previewData, setPreviewData] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setAuthError(error.message);
    };

    if (loading) return <div style={{display:'flex', height:'100vh', justifyContent:'center', alignItems:'center'}}>Cargando seguridad...</div>;

    if (!session) {
        return (
            <div style={{ display: 'flex', height: '100vh', background: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', boxSizing: 'border-box' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div style={{ background: '#eff6ff', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
                            <Lock size={30} color="#2563eb" />
                        </div>
                        <h2 style={{ margin: 0, color: '#1e293b' }}>Acceso Restringido</h2>
                        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '5px' }}>Ingresa tus credenciales de Supabase</p>
                    </div>
                    
                    <form onSubmit={handleLogin}>
                        {authError && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>{authError}</div>}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                        </div>
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '14px' }}>Contraseña</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                        </div>
                        <button type="submit" style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Iniciar Sesión
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="welcome-sync-app" style={{ height: '100vh', margin: 0, padding: 0 }}>
            <ConfigPortal
                onBack={() => { supabase.auth.signOut(); }}
                onPreview={(msg) => setPreviewData(msg)}
            />

            {previewData && (
                <WelcomePopup
                    localConfig={{}}
                    previewData={previewData}
                    onPreviewClose={() => setPreviewData(null)}
                />
            )}
        </div>
    );
}

export default App;
