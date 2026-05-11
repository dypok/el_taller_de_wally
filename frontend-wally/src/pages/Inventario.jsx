import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { Loader2, ShieldCheck, Search, Clock, ShieldAlert, ArrowLeftRight, Banknote, X } from 'lucide-react';
import api, { fetcher } from '../api/axios';
import Sidebar from '../components/Sidebar';

export default function Inventario() {
    const navigate = useNavigate();

    // --- 1. CARGA DE DATOS CON SWR (Caché y Tiempo Real) ---
    const { data: usuario, error: errorUsuario } = useSWR('/mi-perfil', fetcher);
    const { data: garantiasData, mutate: mutateGarantias } = useSWR('/garantias/', fetcher);
    const { data: cuentas } = useSWR('/cuentas/', fetcher);

    // --- 2. ESTADOS LOCALES ---
    const [busqueda, setBusqueda] = useState('');
    const [modalReclamo, setModalReclamo] = useState({ visible: false, garantiaId: null });
    const [datosReclamo, setDatosReclamo] = useState({ accion: 'reparar', motivo: '', cuenta_bancaria_id: '' });
    const [procesando, setProcesando] = useState(false);

    // Manejo de errores de autenticación
    if (errorUsuario?.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return null;
    }

    // Pantalla de carga inicial (Solo si no hay caché)
    if (!usuario || !garantiasData) {
        return (
            <div className="flex h-screen bg-wally-light items-center justify-center w-full">
                <Loader2 className="w-10 h-10 animate-spin text-wally-blue" />
            </div>
        );
    }

    // --- 3. LÓGICA Y FILTRADO ---

    // 1. Filtramos para que SOLO aparezcan las garantías vigentes (no vencidas) desde el caché
    const garantiasVigentes = (garantiasData || []).filter(g =>
        new Date(g.fecha_vencimiento) >= new Date() && g.estado === 'Activa'
    );

    // 2. Aplicamos el filtro de búsqueda por nombre de equipo
    const garantiasFiltradas = garantiasVigentes.filter(g =>
        g.equipo.toLowerCase().includes(busqueda.toLowerCase())
    );

    const calcularDiasRestantes = (fechaVencimiento) => {
        const hoy = new Date();
        const vencimiento = new Date(fechaVencimiento);
        const diferencia = vencimiento.getTime() - hoy.getTime();
        return Math.ceil(diferencia / (1000 * 3600 * 24));
    };

    const handleProcesarReclamo = async (e) => {
        e.preventDefault();
        setProcesando(true);
        try {
            await api.post(`/garantias/${modalReclamo.garantiaId}/reclamo`, datosReclamo);
            setModalReclamo({ visible: false, garantiaId: null });
            setDatosReclamo({ accion: 'reparar', motivo: '', cuenta_bancaria_id: '' });

            // Le decimos a SWR que actualice las garantías en segundo plano
            mutateGarantias();
        } catch (error) {
            alert("Error al procesar: " + (error.response?.data?.detail || "Desconocido"));
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="flex h-screen bg-wally-light overflow-hidden w-full">

            <Sidebar usuario={usuario} />

            <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 md:gap-8 w-full">

                {/* HEADER RESPONSIVO */}
                <header className="shrink-0">
                    <h2 className="text-2xl md:text-3xl font-bold text-wally-blue tracking-tight">Inventario de Garantías</h2>
                    <p className="text-sm md:text-base text-slate-500 mt-1">Control de equipos entregados y pólizas vigentes.</p>
                </header>

                {/* BARRA DE BÚSQUEDA Y ESTADÍSTICAS */}
                <div className="flex flex-col md:flex-row gap-4 shrink-0">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 md:top-3" />
                        <input
                            type="text" placeholder="Buscar equipo..."
                            className="w-full pl-12 pr-4 py-3 md:py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-wally-blue outline-none shadow-sm text-sm md:text-base"
                            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <div className="bg-white px-5 py-3 md:py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 w-full md:w-auto shrink-0">
                        <div className="p-2 bg-emerald-50 rounded-lg"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div>
                        <div>
                            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider">Equipos Protegidos</p>
                            <p className="text-lg md:text-xl font-bold text-emerald-600 leading-none">{garantiasVigentes.length}</p>
                        </div>
                    </div>
                </div>

                {/* LISTADO 100% RESPONSIVO */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col pb-20 md:pb-0">

                    {/* Encabezado Desktop */}
                    <div className="hidden md:grid grid-cols-12 gap-4 bg-slate-50 px-6 py-4 border-b border-slate-100 sticky top-0 z-10">
                        <div className="col-span-5 text-slate-500 text-xs uppercase font-bold tracking-wider">Equipo Protegido</div>
                        <div className="col-span-3 text-slate-500 text-xs uppercase font-bold tracking-wider text-center">Tiempo Restante</div>
                        <div className="col-span-4 text-slate-500 text-xs uppercase font-bold tracking-wider text-right">Acción</div>
                    </div>

                    {/* Filas / Tarjetas */}
                    <div className="flex flex-col divide-y divide-slate-100 overflow-y-auto">
                        {garantiasFiltradas.length > 0 ? (
                            garantiasFiltradas.map((item) => {
                                const dias = calcularDiasRestantes(item.fecha_vencimiento);
                                const estaPorVencer = dias <= 5;

                                return (
                                    <div key={item.id} className="flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-4 p-4 md:p-6 hover:bg-slate-50/60 transition-colors group">

                                        {/* Columna 1: Equipo y Fecha */}
                                        <div className="col-span-5 flex flex-col">
                                            <div className="flex justify-between items-start md:block">
                                                <p className="font-bold text-base md:text-lg text-wally-blue">{item.equipo}</p>
                                                {/* Badge de Días visible solo en móvil arriba a la derecha */}
                                                <div className="md:hidden">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase border shadow-sm ${estaPorVencer ? 'bg-red-50 text-red-700 border-red-200/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200/50'}`}>
                                                        <Clock className="w-3 h-3" /> {dias} {dias === 1 ? 'día' : 'días'}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">Expira: {new Date(item.fecha_vencimiento).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            <p className="text-[10px] text-slate-300 mt-0.5 uppercase tracking-wider">Orden: {item.orden_id.substring(0, 8)}</p>
                                        </div>

                                        {/* Columna 2: Días Restantes (Desktop) */}
                                        <div className="hidden md:flex col-span-3 justify-center">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm border ${estaPorVencer ? 'bg-red-50 text-red-700 border-red-200/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200/50'}`}>
                                                <Clock className="w-3.5 h-3.5" /> {dias} {dias === 1 ? 'día' : 'días'}
                                            </div>
                                        </div>

                                        {/* Columna 3: Botón de Reclamo */}
                                        <div className="col-span-4 flex md:justify-end mt-2 md:mt-0 w-full md:opacity-90 md:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setModalReclamo({ visible: true, garantiaId: item.id })}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-3 md:py-2.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-sm font-bold transition-all shadow-sm border border-amber-200/50"
                                            >
                                                <ShieldAlert className="w-4 h-4 shrink-0" /> Reclamar Garantía
                                            </button>
                                        </div>

                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-16 text-center text-slate-400">
                                <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                                <p className="text-lg md:text-xl font-bold text-slate-500">Todo en orden</p>
                                <p className="text-sm mt-1">No hay equipos en riesgo o en periodo de garantía.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODAL: PROCESAR RECLAMO */}
                {modalReclamo.visible && (
                    <div className="fixed inset-0 bg-wally-blue/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                            <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-amber-100 p-2 rounded-xl border border-amber-200/50">
                                        <ShieldAlert className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <h3 className="text-lg md:text-xl font-bold text-wally-blue tracking-tight">Activar Póliza</h3>
                                </div>
                                <button onClick={() => setModalReclamo({ visible: false, garantiaId: null })} className="text-slate-400 hover:text-red-500 bg-white p-1.5 rounded-lg border border-transparent hover:border-red-100 hover:bg-red-50 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleProcesarReclamo} className="p-5 md:p-6 space-y-5 md:space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Resolución a tomar <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button type="button" onClick={() => setDatosReclamo({ ...datosReclamo, accion: 'reparar' })}
                                            className={`py-4 md:py-3 border rounded-xl font-bold text-xs md:text-sm flex flex-col items-center justify-center gap-2 transition-all ${datosReclamo.accion === 'reparar' ? 'bg-wally-blue text-white border-wally-blue shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                            <ArrowLeftRight className="w-5 h-5" /> Volver a Reparar
                                        </button>
                                        <button type="button" onClick={() => setDatosReclamo({ ...datosReclamo, accion: 'reembolsar' })}
                                            className={`py-4 md:py-3 border rounded-xl font-bold text-xs md:text-sm flex flex-col items-center justify-center gap-2 transition-all ${datosReclamo.accion === 'reembolsar' ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                            <Banknote className="w-5 h-5" /> Devolver Dinero
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Motivo del reclamo <span className="text-red-500">*</span></label>
                                    <textarea required rows="3" placeholder="Describa la falla..."
                                        className="w-full px-4 py-3 md:py-2.5 text-sm md:text-base border border-slate-200 rounded-xl focus:ring-2 focus:ring-wally-blue outline-none resize-none"
                                        value={datosReclamo.motivo} onChange={e => setDatosReclamo({ ...datosReclamo, motivo: e.target.value })} />
                                </div>

                                {datosReclamo.accion === 'reembolsar' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="block text-sm font-bold text-red-600 mb-2">Cuenta de salida (Reembolso) <span className="text-red-500">*</span></label>
                                        <select required className="w-full px-4 py-3 md:py-2.5 text-sm md:text-base border border-red-200 bg-red-50 rounded-xl focus:ring-2 focus:ring-red-500 outline-none appearance-none"
                                            value={datosReclamo.cuenta_bancaria_id} onChange={e => setDatosReclamo({ ...datosReclamo, cuenta_bancaria_id: e.target.value })}>
                                            <option value="" disabled>Selecciona la cuenta afectada...</option>
                                            {(cuentas || []).map(c => <option key={c.id} value={c.id}>{c.nombre_banco}</option>)}
                                        </select>
                                    </div>
                                )}

                                <button type="submit" disabled={procesando}
                                    className={`w-full text-white font-bold py-4 md:py-3.5 text-sm md:text-base rounded-xl shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-50 ${datosReclamo.accion === 'reparar' ? 'bg-wally-blue hover:bg-slate-800' : 'bg-red-500 hover:bg-red-600'}`}>
                                    {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Resolución'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}