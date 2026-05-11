import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Wrench, Wallet, Archive, Users, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Sidebar({ usuario }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [abierto, setAbierto] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const isActive = (path) => location.pathname.startsWith(path);

    const getClassForBtn = (path) => {
        return isActive(path)
            ? "w-full flex items-center gap-3 px-4 py-3 bg-wally-blue-light text-wally-yellow rounded-xl font-medium"
            : "w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-xl transition-colors";
    };

    // Función para navegar y cerrar el menú en móviles automáticamente
    const navegar = (ruta) => {
        setAbierto(false);
        navigate(ruta);
    };

    return (
        <>
            {/* BOTÓN FLOTANTE (Solo visible en móviles) */}
            <button
                onClick={() => setAbierto(true)}
                className="md:hidden fixed bottom-6 right-6 z-40 bg-wally-blue text-white p-4 rounded-full shadow-2xl border-2 border-slate-700 active:scale-95 transition-transform"
            >
                <Menu className="w-6 h-6 text-wally-yellow" />
            </button>

            {/* OVERLAY OSCURO (Aparece detrás del menú en móviles) */}
            {abierto && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setAbierto(false)}
                />
            )}

            {/* MENÚ LATERAL (Oculto en móvil, fijo en escritorio) */}
            <aside
                className={`fixed md:static inset-y-0 left-0 w-64 bg-wally-blue flex flex-col shadow-2xl z-50 transform transition-transform duration-300 ease-in-out shrink-0 
        ${abierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
            >
                <div className="p-6 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="bg-wally-yellow p-2 rounded-lg">
                            <Wrench className="w-6 h-6 text-wally-blue" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">{usuario?.usuario?.split(' ')[0] || 'Equipo'}</h1>
                            <p className="text-xs text-wally-yellow">{usuario?.rol || 'Cargando...'}</p>
                        </div>
                    </div>
                    {/* Botón para cerrar en móvil */}
                    <button onClick={() => setAbierto(false)} className="md:hidden text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
                    <button onClick={() => navegar('/dashboard')} className={getClassForBtn('/dashboard')}>
                        <LayoutDashboard className="w-5 h-5" /> Panel General
                    </button>

                    <button onClick={() => navegar('/servicios')} className={getClassForBtn('/servicios')}>
                        <Wrench className="w-5 h-5" /> Servicios
                    </button>

                    <button onClick={() => navegar('/inventario')} className={getClassForBtn('/inventario')}>
                        <Archive className="w-5 h-5" /> Inventario
                    </button>
                    <button onClick={() => navegar('/clientes')} className={getClassForBtn('/clientes')}>
                        <Users className="w-5 h-5" /> Clientes
                    </button>

                    {['Admin', 'Supervisor', 'Contador'].includes(usuario?.rol) && (
                        <button onClick={() => navegar('/finanzas')} className={getClassForBtn('/finanzas')}>
                            <Wallet className="w-5 h-5" /> Finanzas
                        </button>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-700">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors">
                        <LogOut className="w-5 h-5" /> Cerrar Sesión
                    </button>
                </div>
            </aside>
        </>
    );
}