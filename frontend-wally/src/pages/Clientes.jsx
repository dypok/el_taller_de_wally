import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import {
    Users, Plus, Search, Edit2, X, Loader2,
    Phone, Mail, CreditCard, MapPin
} from 'lucide-react';
import api, { fetcher } from '../api/axios';
import Sidebar from '../components/Sidebar';

export default function Clientes() {
    const navigate = useNavigate();

    // --- 1. CARGA DE DATOS CON SWR (Caché y Tiempo Real) ---
    const { data: usuario, error: errorUsuario } = useSWR('/mi-perfil', fetcher);
    const { data: clientesData, mutate: mutateClientes } = useSWR('/clientes/', fetcher);

    // --- 2. ESTADOS LOCALES ---
    const [busqueda, setBusqueda] = useState('');
    const [mostrarModal, setMostrarModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [clienteId, setClienteId] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const [codigoPais, setCodigoPais] = useState('+57');
    const [formData, setFormData] = useState({
        nombre: '',
        cedula_nit: '',
        telefono: '',
        email: '',
        direccion: ''
    });

    // Manejo de errores de autenticación
    if (errorUsuario?.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return null;
    }

    // Pantalla de carga inicial (Solo se ve si no hay caché)
    if (!usuario || !clientesData) {
        return (
            <div className="flex h-screen bg-wally-light items-center justify-center w-full">
                <Loader2 className="w-10 h-10 animate-spin text-wally-blue" />
            </div>
        );
    }

    // --- 3. FUNCIONES OPERATIVAS ---

    const abrirModalCrear = () => {
        setModoEdicion(false);
        setClienteId(null);
        setCodigoPais('+57');
        setFormData({ nombre: '', cedula_nit: '', telefono: '', email: '', direccion: '' });
        setMostrarModal(true);
    };

    const abrirModalEditar = (cliente) => {
        setModoEdicion(true);
        setClienteId(cliente.id);

        let tel = cliente.telefono || '';
        if (tel.startsWith('+')) {
            const match = tel.match(/^(\+\d{1,3})(\d+)$/);
            if (match) {
                setCodigoPais(match[1]);
                tel = match[2];
            }
        }

        setFormData({
            nombre: cliente.nombre,
            cedula_nit: cliente.cedula_nit || '',
            telefono: tel,
            email: cliente.email || '',
            direccion: cliente.direccion || ''
        });
        setMostrarModal(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const numeroLimpio = formData.telefono.replace(/\D/g, '');
            const payload = {
                ...formData,
                telefono: `${codigoPais}${numeroLimpio}`,
                email: formData.email || null,
                direccion: formData.direccion || null
            };

            if (modoEdicion) {
                // Actualización Optimista para la edición
                const datosOptimistas = clientesData.map(c =>
                    c.id === clienteId ? { ...c, ...payload } : c
                );
                mutateClientes(datosOptimistas, false); // Actualiza la UI de inmediato

                await api.patch(`/clientes/${clienteId}`, payload);
            } else {
                // Para creación nueva, esperamos a que el servidor asigne el ID
                await api.post('/clientes/', payload);
            }

            setMostrarModal(false);
            mutateClientes(); // Revalida con el servidor en segundo plano
        } catch (error) {
            alert("Error al procesar: " + (error.response?.data?.detail || "Desconocido"));
            mutateClientes(); // Revierte si hubo error
        } finally {
            setGuardando(false);
        }
    };

    // Filtramos usando la data que viene directamente del caché de SWR
    const clientesFiltrados = (clientesData || []).filter(c =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.cedula_nit && c.cedula_nit.includes(busqueda))
    );

    return (
        <div className="flex h-screen bg-wally-light overflow-hidden w-full">
            <Sidebar usuario={usuario} />

            <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 md:gap-8 w-full">

                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-wally-blue tracking-tight">Directorio de Clientes</h2>
                        <p className="text-sm md:text-base text-slate-500 mt-1">Administra la base de datos de tus clientes.</p>
                    </div>
                    <button
                        onClick={abrirModalCrear}
                        className="bg-wally-blue hover:bg-slate-800 text-wally-yellow font-bold px-5 py-3 sm:py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                    >
                        <Plus className="w-5 h-5" /> Nuevo Cliente
                    </button>
                </header>

                {/* BUSCADOR */}
                <div className="relative shrink-0">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 md:top-3" />
                    <input
                        type="text" placeholder="Buscar por nombre o documento..."
                        className="w-full pl-12 pr-4 py-3 md:py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-wally-blue outline-none shadow-sm text-sm md:text-base"
                        value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                {/* LISTADO RESPONSIVO */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col shrink-0 pb-20 md:pb-0 overflow-hidden">
                    <div className="hidden md:grid grid-cols-12 gap-4 bg-slate-50 px-6 py-4 border-b border-slate-100 sticky top-0 z-10 font-bold text-slate-500 text-xs uppercase tracking-wider">
                        <div className="col-span-4">Cliente / Documento</div>
                        <div className="col-span-3">Contacto</div>
                        <div className="col-span-4">Ubicación</div>
                        <div className="col-span-1 text-right">Editar</div>
                    </div>

                    <div className="flex flex-col divide-y divide-slate-100">
                        {clientesFiltrados.length > 0 ? (
                            clientesFiltrados.map((cliente) => (
                                <div key={cliente.id} className="flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-4 p-4 md:p-6 hover:bg-slate-50/60 transition-colors group">

                                    {/* Info Principal */}
                                    <div className="col-span-4">
                                        <p className="font-bold text-base text-wally-blue">{cliente.nombre}</p>
                                        <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                                            <CreditCard className="w-3.5 h-3.5" />
                                            <span className="text-xs font-medium">{cliente.cedula_nit || 'Sin documento'}</span>
                                        </div>
                                    </div>

                                    {/* Contacto */}
                                    <div className="col-span-3 space-y-1">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="font-medium">{cliente.telefono}</span>
                                        </div>
                                        {cliente.email && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{cliente.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Dirección */}
                                    <div className="col-span-4">
                                        <div className="flex items-start gap-2 text-sm text-slate-600">
                                            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                            <span className="line-clamp-2">{cliente.direccion || 'No registrada'}</span>
                                        </div>
                                    </div>

                                    {/* Acción */}
                                    <div className="col-span-1 flex md:justify-end mt-2 md:mt-0">
                                        <button
                                            onClick={() => abrirModalEditar(cliente)}
                                            className="flex-1 md:flex-none flex justify-center items-center p-2.5 bg-slate-100 hover:bg-wally-yellow text-slate-600 hover:text-wally-blue rounded-lg transition-all border border-slate-200 hover:border-transparent"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            <span className="md:hidden ml-2 text-sm font-bold">Editar Datos</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center text-slate-400">
                                <Users className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                                <p className="text-lg font-bold text-slate-500">No se encontraron clientes</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODAL CREAR/EDITAR */}
                {mostrarModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                            <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <h3 className="text-lg md:text-xl font-bold text-wally-blue tracking-tight">
                                    {modoEdicion ? 'Editar Información' : 'Nuevo Cliente'}
                                </h3>
                                <button onClick={() => setMostrarModal(false)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg transition-colors bg-white hover:bg-red-50">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleGuardar} className="p-5 md:p-6 overflow-y-auto custom-scrollbar">
                                <div className="space-y-4 md:space-y-5 mb-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Nombre Completo *</label>
                                        <input required type="text" className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-wally-blue outline-none"
                                            value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Cédula o NIT *</label>
                                            <input required type="text" className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-wally-blue outline-none"
                                                value={formData.cedula_nit} onChange={e => setFormData({ ...formData, cedula_nit: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono *</label>
                                            <div className="flex gap-2">
                                                <select className="w-24 px-2 py-3 md:py-2.5 border border-slate-200 rounded-xl outline-none bg-white font-medium text-sm"
                                                    value={codigoPais} onChange={e => setCodigoPais(e.target.value)}>
                                                    <option value="+57">🇨🇴 +57</option>
                                                    <option value="+1">🇺🇸 +1</option>
                                                    <option value="+58">🇻🇪 +58</option>
                                                    <option value="+507">🇵🇦 +507</option>
                                                </select>
                                                <input required type="tel" className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-wally-blue outline-none"
                                                    value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                                        <input type="email" placeholder="Opcional" className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-wally-blue outline-none"
                                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Dirección</label>
                                        <input type="text" placeholder="Opcional" className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-wally-blue outline-none"
                                            value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} />
                                    </div>
                                </div>

                                <button type="submit" disabled={guardando}
                                    className="w-full bg-wally-blue hover:bg-slate-800 text-white font-bold py-4 md:py-3.5 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                                    {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Cambios'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}