import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Loader2, ShieldCheck } from 'lucide-react';
import api from '../api/axios';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // --- REDIRECCIÓN AUTOMÁTICA ---
    // Si el usuario ya tiene sesión iniciada, no lo dejamos ver el login
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/dashboard', { replace: true });
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        try {
            const response = await api.post('/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            localStorage.setItem('token', response.data.access_token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        /* Fondo Azul Profundo */
        <div className="min-h-screen bg-wally-blue flex items-center justify-center p-4 selection:bg-wally-yellow selection:text-wally-blue">

            {/* Tarjeta con efecto glass/sombra */}
            <div className="max-w-md w-full bg-wally-blue-light rounded-3xl shadow-2xl border border-slate-700 p-8 md:p-10 animate-in fade-in zoom-in-95 duration-500">

                {/* Encabezado Fancy */}
                <div className="flex flex-col items-center mb-10">
                    <div className="bg-wally-yellow p-4 rounded-2xl shadow-lg shadow-wally-yellow/20 mb-6 transform transition hover:scale-105">
                        <Wrench className="w-8 h-8 text-wally-blue" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight text-center">El Taller de Wally</h2>
                    <p className="text-slate-400 text-sm mt-2 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-wally-yellow" />
                        Acceso Autorizado
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3.5 rounded-xl text-sm mb-6 text-center animate-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                {/* Formulario Limpio */}
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Correo Electrónico</label>
                        <input
                            type="email"
                            required
                            className="w-full px-5 py-3 md:py-3.5 bg-slate-900/50 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-wally-yellow focus:border-transparent outline-none transition-all placeholder-slate-500"
                            placeholder="admin@eltaller.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full px-5 py-3 md:py-3.5 bg-slate-900/50 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-wally-yellow focus:border-transparent outline-none transition-all placeholder-slate-500"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-wally-yellow hover:bg-wally-yellow-hover text-wally-blue font-bold py-3.5 md:py-4 rounded-xl transition-all flex justify-center items-center shadow-lg shadow-wally-yellow/10 disabled:opacity-70 disabled:hover:scale-100 active:scale-95"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Ingresar al sistema'}
                    </button>
                </form>

            </div>
        </div>
    );
}