import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import {
    Loader2, Wallet, Plus, ShieldCheck,
    TrendingUp, TrendingDown, Landmark, Search, Filter, X,
    ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import api, { fetcher } from '../api/axios';
import Sidebar from '../components/Sidebar';

export default function Finanzas() {
    const navigate = useNavigate();

    // --- 1. CARGA DE DATOS CON SWR (Caché y Tiempo Real) ---
    const { data: usuario, error: errorUsuario } = useSWR('/mi-perfil', fetcher);
    const { data: cuentasData } = useSWR('/cuentas/', fetcher);
    const { data: ingresosData, mutate: mutateIngresos } = useSWR('/ingresos/', fetcher);
    const { data: egresosData, mutate: mutateEgresos } = useSWR('/egresos/', fetcher);
    const { data: garantiasData } = useSWR('/garantias/', fetcher);

    // --- 2. ESTADOS LOCALES ---
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [busqueda, setBusqueda] = useState('');

    const [mostrarModalEgreso, setMostrarModalEgreso] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [formularioEgreso, setFormularioEgreso] = useState({
        descripcion: '',
        valor_total: '',
        cuenta_bancaria_id: '',
        categoria: 'Otros'
    });

    // Manejo de errores de autenticación
    if (errorUsuario?.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return null;
    }

    // Pantalla de carga inicial (Solo se ve si no hay caché de nada)
    if (!usuario || !cuentasData || !ingresosData || !egresosData || !garantiasData) {
        return (
            <div className="flex h-screen bg-wally-light items-center justify-center w-full">
                <Loader2 className="w-10 h-10 animate-spin text-wally-blue" />
            </div>
        );
    }

    // --- 3. PROCESAMIENTO DE DATOS ---
    const cuentas = cuentasData || [];
    const ingresos = ingresosData || [];
    const egresos = egresosData || [];
    const garantias = garantiasData || [];

    const totalIngresos = ingresos.reduce((acc, curr) => acc + curr.valor_total, 0);
    const totalEgresos = egresos.reduce((acc, curr) => acc + curr.valor_total, 0);
    const utilidadNeta = totalIngresos - totalEgresos;

    const historialCompleto = [
        ...ingresos.map(i => ({ ...i, tipoMovimiento: 'ingreso', fechaReal: new Date(i.fecha || i.created_at) })),
        ...egresos.map(e => ({ ...e, tipoMovimiento: 'egreso', fechaReal: new Date(e.fecha || e.created_at) }))
    ].sort((a, b) => b.fechaReal - a.fechaReal);

    const historialFiltrado = historialCompleto.filter(mov => {
        const coincideTipo = filtroTipo === 'todos' || mov.tipoMovimiento === filtroTipo;
        const texto = (mov.descripcion || mov.concepto || '').toLowerCase();
        const coincideBusqueda = texto.includes(busqueda.toLowerCase());
        return coincideTipo && coincideBusqueda;
    });

    const formatearDinero = (valor) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
    };

    const handleGuardarEgreso = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const nuevoEgreso = {
                ...formularioEgreso,
                valor_total: parseFloat(formularioEgreso.valor_total)
            };

            await api.post('/egresos/', nuevoEgreso);

            setMostrarModalEgreso(false);
            setFormularioEgreso({ descripcion: '', valor_total: '', cuenta_bancaria_id: '', categoria: 'Otros' });

            // Revalidar los egresos en segundo plano para actualizar los números
            mutateEgresos();
        } catch (error) {
            alert("Error al registrar gasto: " + (error.response?.data?.detail || "Desconocido"));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="flex h-screen bg-wally-light overflow-hidden w-full">
            <Sidebar usuario={usuario} />

            <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 md:gap-8 w-full">

                {/* HEADER */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-wally-blue tracking-tight">Gestión Financiera</h2>
                        <p className="text-sm md:text-base text-slate-500 mt-1">Control de flujo de caja y transacciones.</p>
                    </div>
                    <button
                        onClick={() => setMostrarModalEgreso(true)}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-3 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all shrink-0"
                    >
                        <Plus className="w-5 h-5" /> Registrar Gasto
                    </button>
                </header>

                {/* TARJETAS DE MÉTRICAS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 shrink-0">
                    <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
                        <div className="flex justify-between items-start">
                            <p className="text-slate-500 text-sm font-medium">Ingresos Totales</p>
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-emerald-600 mt-2">{formatearDinero(totalIngresos)}</p>
                    </div>
                    <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-l-red-500">
                        <div className="flex justify-between items-start">
                            <p className="text-slate-500 text-sm font-medium">Gastos Realizados</p>
                            <TrendingDown className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-red-600 mt-2">{formatearDinero(totalEgresos)}</p>
                    </div>
                    <div className="bg-wally-blue p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-l-wally-yellow sm:col-span-2 lg:col-span-1">
                        <div className="flex justify-between items-start">
                            <p className="text-slate-300 text-sm font-medium">Utilidad Neta</p>
                            <Wallet className="w-5 h-5 text-wally-yellow" />
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-white mt-2">{formatearDinero(utilidadNeta)}</p>
                    </div>
                </div>

                {/* LIBRO DIARIO */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col shrink-0">
                    <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white">
                        <h3 className="text-lg font-bold text-wally-blue flex items-center gap-2">
                            <Filter className="w-5 h-5 text-slate-400" />
                            Libro Diario Contable
                        </h3>

                        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                            <div className="relative w-full sm:w-auto">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Buscar movimiento..."
                                    className="pl-9 pr-4 py-2.5 sm:py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-wally-blue w-full sm:w-64"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                />
                            </div>

                            <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto justify-between sm:justify-start">
                                <button
                                    onClick={() => setFiltroTipo('todos')}
                                    className={`flex-1 sm:flex-none px-3 md:px-4 py-2 sm:py-1.5 text-xs md:text-sm font-bold rounded-md transition-all ${filtroTipo === 'todos' ? 'bg-white text-wally-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setFiltroTipo('ingreso')}
                                    className={`flex-1 sm:flex-none px-3 md:px-4 py-2 sm:py-1.5 text-xs md:text-sm font-bold rounded-md transition-all ${filtroTipo === 'ingreso' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Ingresos
                                </button>
                                <button
                                    onClick={() => setFiltroTipo('egreso')}
                                    className={`flex-1 sm:flex-none px-3 md:px-4 py-2 sm:py-1.5 text-xs md:text-sm font-bold rounded-md transition-all ${filtroTipo === 'egreso' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Gastos
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-left relative min-w-[800px]">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="py-4 px-4 md:px-6 w-10 bg-slate-50"></th>
                                    <th className="py-4 px-4 md:px-6 bg-slate-50">Fecha</th>
                                    <th className="py-4 px-4 md:px-6 bg-slate-50">Detalle / Concepto</th>
                                    <th className="py-4 px-4 md:px-6 bg-slate-50">Caja/Banco</th>
                                    <th className="py-4 px-4 md:px-6 text-right text-emerald-600 bg-emerald-50 border-b border-emerald-200">Entradas</th>
                                    <th className="py-4 px-4 md:px-6 text-right text-red-600 bg-red-50 border-b border-red-200">Salidas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {historialFiltrado.length > 0 ? (
                                    historialFiltrado.map((mov, idx) => {
                                        const esIngreso = mov.tipoMovimiento === 'ingreso';
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-4 md:px-6">
                                                    <div className={`p-2 rounded-full w-max ${esIngreso ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                                        {esIngreso ? <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" /> : <ArrowDownRight className="w-4 h-4 md:w-5 md:h-5" />}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 md:px-6 text-xs md:text-sm text-slate-500 whitespace-nowrap">
                                                    {mov.fechaReal.toLocaleDateString('es-CO')}
                                                </td>
                                                <td className="py-3 px-4 md:px-6">
                                                    <p className="font-bold text-sm md:text-base text-wally-blue">{mov.descripcion || mov.concepto}</p>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border mt-1 inline-block ${esIngreso ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                        {mov.categoria || (esIngreso ? 'Servicio' : 'Gasto')}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 md:px-6">
                                                    <p className="text-xs md:text-sm text-slate-600 font-medium">
                                                        {mov.cuentas_bancarias?.nombre_banco || 'Caja Principal'}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-4 md:px-6 text-right font-bold text-sm md:text-base text-emerald-600">
                                                    {esIngreso ? formatearDinero(mov.valor_total || mov.monto) : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="py-3 px-4 md:px-6 text-right font-bold text-sm md:text-base text-red-600">
                                                    {!esIngreso ? formatearDinero(mov.valor_total || mov.monto) : <span className="text-slate-300">-</span>}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-slate-400">
                                            <p className="text-lg font-medium">No se encontraron movimientos.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* CAJAS Y GARANTÍAS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 shrink-0 pb-20 md:pb-8">
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Landmark className="w-5 h-5 text-wally-blue" />
                            <h3 className="text-lg font-bold text-wally-blue">Cajas y Bancos</h3>
                        </div>
                        <div className="space-y-3">
                            {cuentas.map(c => (
                                <div key={c.id} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="font-bold text-sm md:text-base text-wally-blue">{c.nombre_banco}</p>
                                        <p className="text-xs text-slate-400">{c.numero_cuenta || 'Efectivo'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">Estado</p>
                                        <p className="text-xs md:text-sm text-emerald-600 font-bold">Activa</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            <h3 className="text-lg font-bold text-wally-blue">Garantías Vigentes</h3>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {garantias.filter(g => new Date(g.fecha_vencimiento) >= new Date() && g.estado === 'Activa').length > 0 ? (
                                garantias.filter(g => new Date(g.fecha_vencimiento) >= new Date() && g.estado === 'Activa').map(g => (
                                    <div key={g.id} className="p-3 md:p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-sm md:text-base text-emerald-900">{g.equipo}</p>
                                            <p className="text-[10px] md:text-xs text-emerald-600 font-bold uppercase">Expira: {new Date(g.fecha_vencimiento).toLocaleDateString()}</p>
                                        </div>
                                        <div className="animate-pulse bg-white p-1 rounded-full text-emerald-600">
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-sm md:text-base text-slate-400 py-10 italic">No hay garantías activas.</p>
                            )}
                        </div>
                    </section>
                </div>

                {/* MODAL REGISTRAR GASTO */}
                {mostrarModalEgreso && (
                    <div className="fixed inset-0 bg-wally-blue/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="text-lg md:text-xl font-bold text-wally-blue">Registrar Nuevo Gasto</h3>
                                <button onClick={() => setMostrarModalEgreso(false)} className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleGuardarEgreso} className="p-5 md:p-6 space-y-4 md:space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Descripción del Gasto *</label>
                                    <input required type="text" placeholder="Ej: Pago de arriendo local"
                                        className="w-full px-4 py-3 md:py-2.5 text-base border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                                        value={formularioEgreso.descripcion} onChange={e => setFormularioEgreso({ ...formularioEgreso, descripcion: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Monto (COP) *</label>
                                        <input required type="number" placeholder="50000"
                                            className="w-full px-4 py-3 md:py-2.5 text-base border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                                            value={formularioEgreso.valor_total} onChange={e => setFormularioEgreso({ ...formularioEgreso, valor_total: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
                                        <select className="w-full px-4 py-3 md:py-2.5 text-base border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white"
                                            value={formularioEgreso.categoria} onChange={e => setFormularioEgreso({ ...formularioEgreso, categoria: e.target.value })}>
                                            <option value="Repuestos">Repuestos</option>
                                            <option value="Servicios">Servicios</option>
                                            <option value="Arriendo">Arriendo</option>
                                            <option value="Insumos">Insumos</option>
                                            <option value="Nómina">Nómina</option>
                                            <option value="Devoluciones">Devoluciones</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Caja/Banco de Salida *</label>
                                    <select required className="w-full px-4 py-3 md:py-2.5 text-base border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white"
                                        value={formularioEgreso.cuenta_bancaria_id} onChange={e => setFormularioEgreso({ ...formularioEgreso, cuenta_bancaria_id: e.target.value })}>
                                        <option value="" disabled>Selecciona la cuenta afectada...</option>
                                        {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre_banco}</option>)}
                                    </select>
                                </div>
                                <button type="submit" disabled={guardando}
                                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 md:py-3.5 rounded-xl mt-2 shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2">
                                    {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Salida'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}