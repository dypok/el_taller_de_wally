import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import {
    LogOut, LayoutDashboard, Wrench, Users, Wallet, Archive, Loader2,
    CheckCircle2, Clock, PlayCircle, BadgeDollarSign, X, Building,
    AlertTriangle, ShieldAlert, ShieldCheck
} from 'lucide-react';
import api, { fetcher } from '../api/axios';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
    const navigate = useNavigate();

    // --- 1. CARGA DE DATOS CON SWR (Caché y Tiempo Real) ---
    const { data: usuario, error: errorUsuario } = useSWR('/mi-perfil', fetcher);

    const {
        data: ordenesData,
        mutate: mutateOrdenes,
        isLoading: cargandoOrdenes
    } = useSWR('/ordenes/', fetcher);

    const { data: cuentas } = useSWR('/cuentas/', fetcher);

    // Solo pedimos métricas si el usuario tiene rol administrativo
    const esAdmin = usuario && ['Admin', 'Supervisor', 'Contador'].includes(usuario.rol);
    const { data: metricas, mutate: mutateMetricas } = useSWR(esAdmin ? '/dashboard/' : null, fetcher);

    // --- 2. ESTADOS LOCALES (Modales y Formularios) ---
    const [modalConfirmacion, setModalConfirmacion] = useState({
        visible: false, ordenId: null, nuevoEstado: '', titulo: '', mensaje: '', color: ''
    });
    const [guardandoEstado, setGuardandoEstado] = useState(false);

    const [mostrarModalCobro, setMostrarModalCobro] = useState(false);
    const [ordenACobrar, setOrdenACobrar] = useState(null);
    const [guardandoCobro, setGuardandoCobro] = useState(false);
    const [datosCobro, setDatosCobro] = useState({ valor_total: '', cuenta_bancaria_id: '', meses_garantia: 1 });

    const [modalCancelar, setModalCancelar] = useState({ visible: false, ordenId: null });
    const [procesandoCancelacion, setProcesandoCancelacion] = useState(false);

    const [modalReembolso, setModalReembolso] = useState({ visible: false, ordenId: null });
    const [cuentaReembolso, setCuentaReembolso] = useState('');
    const [procesandoReembolso, setProcesandoReembolso] = useState(false);

    // Lógica de Garantía
    const esReingresoGarantia = ordenACobrar?.observaciones_internas?.includes("RECLAMO GARANTÍA");

    // Manejo de errores de autenticación
    if (errorUsuario?.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return null;
    }

    // --- 3. ACCIONES OPERATIVAS ---

    const abrirConfirmacion = (ordenId, nuevoEstado) => {
        let config = { visible: true, ordenId, nuevoEstado };
        if (nuevoEstado === 'En proceso') {
            config.titulo = '¿Iniciar reparación?';
            config.mensaje = 'El estado cambiará a "En proceso" y el cliente sabrá que ya estás trabajando en su equipo.';
            config.color = 'blue';
        } else if (nuevoEstado === 'Listo para entregar') {
            config.titulo = '¿Terminar reparación?';
            config.mensaje = 'El equipo se marcará como reparado y quedará listo para que lo vengan a buscar.';
            config.color = 'emerald';
        }
        setModalConfirmacion(config);
    };

    const confirmarYGuardarEstado = async () => {
        const { ordenId, nuevoEstado } = modalConfirmacion;
        setModalConfirmacion({ ...modalConfirmacion, visible: false });
        setGuardandoEstado(true);

        try {
            await api.patch(`/ordenes/${ordenId}/estado`, { estado: nuevoEstado });
            // Actualizamos solo el caché de las órdenes para reflejar el cambio rápido
            mutateOrdenes();
            if (esAdmin) mutateMetricas();
        } catch (error) {
            alert("Error al actualizar el estado");
        } finally {
            setGuardandoEstado(false);
        }
    };

    const handleLiquidarOrden = async (e) => {
        e.preventDefault();
        setGuardandoCobro(true);
        try {
            const payload = { estado: 'Entregado', meses_garantia: datosCobro.meses_garantia };
            if (!esReingresoGarantia) {
                payload.valor_total = Number(datosCobro.valor_total.replace(/\D/g, ''));
                payload.cuenta_bancaria_id = datosCobro.cuenta_bancaria_id;
            }

            await api.patch(`/ordenes/${ordenACobrar.id}/estado`, payload);
            setMostrarModalCobro(false);
            setOrdenACobrar(null);
            setDatosCobro({ valor_total: '', cuenta_bancaria_id: '', meses_garantia: 1 });

            mutateOrdenes(); // Refrescar lista
            if (esAdmin) mutateMetricas(); // Refrescar finanzas
        } catch (error) {
            alert("Error al procesar la entrega");
        } finally {
            setGuardandoCobro(false);
        }
    };

    const handleCancelarDashboard = async (e) => {
        e.preventDefault();
        setProcesandoCancelacion(true);
        try {
            await api.patch(`/ordenes/${modalCancelar.ordenId}/estado`, { estado: 'Cancelado' });
            setModalCancelar({ visible: false, ordenId: null });
            mutateOrdenes();
        } catch (error) {
            alert("Error al cancelar");
        } finally {
            setProcesandoCancelacion(false);
        }
    };

    const handleReembolsoDashboard = async (e) => {
        e.preventDefault();
        setProcesandoReembolso(true);
        try {
            await api.patch(`/ordenes/${modalReembolso.ordenId}/estado`, {
                estado: 'Reembolsado',
                cuenta_bancaria_id: cuentaReembolso
            });
            setModalReembolso({ visible: false, ordenId: null });
            setCuentaReembolso('');
            mutateOrdenes();
            if (esAdmin) mutateMetricas();
        } catch (error) {
            alert("Error al reembolsar");
        } finally {
            setProcesandoReembolso(false);
        }
    };

    const formatearDinero = (valor) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
    };

    // Pantalla de carga inicial profunda
    if (!usuario || !ordenesData) {
        return (
            <div className="flex h-screen bg-wally-light items-center justify-center w-full">
                <Loader2 className="w-10 h-10 animate-spin text-wally-blue" />
            </div>
        );
    }

    // Filtrado de órdenes desde la data de SWR
    const activasOrdenadas = ordenesData
        .filter(o => !['Entregado', 'Reembolsado', 'Cancelado'].includes(o.estado))
        .sort((a, b) => b.numero_orden - a.numero_orden);

    return (
        <div className="flex h-screen bg-wally-light overflow-hidden w-full">
            <Sidebar usuario={usuario} />

            <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 md:gap-8 w-full">
                <header className="shrink-0">
                    <h2 className="text-2xl md:text-3xl font-bold text-wally-blue tracking-tight">
                        ¡Hola, {usuario?.usuario?.split(' ')[0] || 'Equipo'}!
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 mt-1">Aquí tienes el control operativo de hoy.</p>
                </header>

                {metricas && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 shrink-0">
                        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-l-wally-yellow transition-transform hover:-translate-y-1 duration-300">
                            <p className="text-slate-500 text-sm font-medium">Servicios en Taller</p>
                            <p className="text-2xl md:text-3xl font-bold text-wally-blue mt-2">{metricas.operacion?.servicios_activos || 0}</p>
                        </div>
                        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-l-emerald-500 transition-transform hover:-translate-y-1 duration-300">
                            <p className="text-slate-500 text-sm font-medium">Utilidad Estimada</p>
                            <p className="text-2xl md:text-3xl font-bold text-emerald-600 mt-2">{formatearDinero(metricas.finanzas?.utilidad_neta || 0)}</p>
                        </div>
                        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-l-red-500 sm:col-span-2 lg:col-span-1 transition-transform hover:-translate-y-1 duration-300">
                            <p className="text-slate-500 text-sm font-medium">Alertas de Stock</p>
                            <p className="text-2xl md:text-3xl font-bold text-wally-blue mt-2">{Object.keys(metricas.inventario_critico || {}).length}</p>
                        </div>
                    </div>
                )}

                <section className="flex flex-col flex-1 shrink-0 pb-20 md:pb-0">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <Clock className="w-5 h-5 text-wally-yellow" />
                        <h3 className="text-lg md:text-xl font-bold text-wally-blue tracking-tight">Seguimiento de Reparaciones</h3>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                        <div className="hidden md:grid grid-cols-12 gap-4 bg-slate-50 px-6 py-4 border-b border-slate-100 sticky top-0 z-10">
                            <div className="col-span-5 text-slate-500 text-xs uppercase font-bold tracking-wider">Equipo / Cliente</div>
                            <div className="col-span-3 text-slate-500 text-xs uppercase font-bold tracking-wider">Estado Actual</div>
                            <div className="col-span-4 text-slate-500 text-xs uppercase font-bold tracking-wider text-right">Acciones</div>
                        </div>

                        <div className="flex flex-col divide-y divide-slate-100">
                            {activasOrdenadas.length > 0 ? (
                                activasOrdenadas.map((orden) => {
                                    const esGarantiaRow = orden.observaciones_internas?.includes("RECLAMO GARANTÍA");
                                    return (
                                        <div key={orden.id} className="flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-4 p-4 md:p-6 hover:bg-slate-50/60 transition-colors group">
                                            <div className="col-span-5 flex flex-col">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold text-base text-wally-blue leading-tight">{orden.equipo_tipo} {orden.equipo_marca}</p>
                                                    <div className="md:hidden shrink-0 ml-2">
                                                        <BadgeEstado estado={orden.estado} />
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-500 mt-1 font-medium">{orden.clientes?.nombre}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">SRV-{String(orden.numero_orden).padStart(4, '0')}</p>
                                                {esGarantiaRow && (
                                                    <span className="w-max text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md font-bold uppercase mt-2 border border-amber-200/60 shadow-sm">
                                                        Reingreso Garantía
                                                    </span>
                                                )}
                                            </div>

                                            <div className="hidden md:flex col-span-3">
                                                <BadgeEstado estado={orden.estado} conIcono />
                                            </div>

                                            <div className="col-span-4 flex md:justify-end mt-2 md:mt-0 w-full md:opacity-90 md:group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center gap-2 w-full md:w-auto">
                                                    {orden.estado === 'Pendiente' && (
                                                        <button onClick={() => abrirConfirmacion(orden.id, 'En proceso')} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 md:py-2 bg-wally-blue text-white text-sm rounded-lg hover:bg-slate-800 transition-all font-medium shadow-sm">
                                                            <PlayCircle className="w-4 h-4 shrink-0" /> Iniciar
                                                        </button>
                                                    )}
                                                    {orden.estado === 'En proceso' && (
                                                        <button onClick={() => abrirConfirmacion(orden.id, 'Listo para entregar')} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 md:py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-sm">
                                                            <CheckCircle2 className="w-4 h-4 shrink-0" /> Terminar
                                                        </button>
                                                    )}
                                                    {orden.estado === 'Listo para entregar' && (
                                                        <button onClick={() => { setOrdenACobrar(orden); setMostrarModalCobro(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 md:py-2 bg-wally-yellow text-wally-blue font-bold text-sm rounded-lg hover:bg-wally-yellow-hover shadow-md transition-all animate-pulse">
                                                            {esGarantiaRow ? <><ShieldCheck className="w-4 h-4 shrink-0" /> Entregar</> : <><BadgeDollarSign className="w-4 h-4 shrink-0" /> Cobrar</>}
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => {
                                                            if (esGarantiaRow) { setModalReembolso({ visible: true, ordenId: orden.id }); }
                                                            else { setModalCancelar({ visible: true, ordenId: orden.id }); }
                                                        }}
                                                        className="flex-none flex items-center justify-center p-2.5 md:p-2 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                    >
                                                        {esGarantiaRow ? <ShieldAlert className="w-5 h-5 md:w-4 md:h-4" /> : <X className="w-5 h-5 md:w-4 md:h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="py-16 text-center">
                                    <Wrench className="w-12 h-12 mb-3 text-slate-200 mx-auto" />
                                    <p className="text-base font-medium text-slate-500">Taller despejado</p>
                                    <p className="text-sm mt-1">No hay órdenes activas en este momento.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* MODALES REUTILIZADOS DE TU CÓDIGO ORIGINAL */}

                {/* 1. Modal Confirmación Estado */}
                {modalConfirmacion.visible && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 animate-in zoom-in-95">
                            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${modalConfirmacion.color === 'blue' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                {modalConfirmacion.color === 'blue' ? <PlayCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                            </div>
                            <h3 className="text-xl font-bold text-wally-blue mb-2">{modalConfirmacion.titulo}</h3>
                            <p className="text-slate-500 text-sm mb-8">{modalConfirmacion.mensaje}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setModalConfirmacion({ ...modalConfirmacion, visible: false })} className="flex-1 py-3 text-sm bg-slate-50 text-slate-600 font-bold rounded-xl border border-slate-200">Cancelar</button>
                                <button onClick={confirmarYGuardarEstado} disabled={guardandoEstado} className={`flex-1 py-3 text-sm text-white font-bold rounded-xl shadow-md flex items-center justify-center ${modalConfirmacion.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                    {guardandoEstado ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Modal Cobro */}
                {mostrarModalCobro && ordenACobrar && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-100 p-2 rounded-xl">
                                        {esReingresoGarantia ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <BadgeDollarSign className="w-5 h-5 text-emerald-600" />}
                                    </div>
                                    <h3 className="text-xl font-bold text-wally-blue tracking-tight">{esReingresoGarantia ? 'Renovar Garantía' : 'Liquidar Orden'}</h3>
                                </div>
                                <button onClick={() => setMostrarModalCobro(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                                <p className="text-xs text-slate-500 font-medium">Cliente: <span className="text-wally-blue font-bold">{ordenACobrar.clientes?.nombre}</span></p>
                                <p className="text-xs text-slate-500 font-medium mt-1">Equipo: <span className="font-semibold text-slate-700">{ordenACobrar.equipo_tipo} {ordenACobrar.equipo_marca}</span></p>
                            </div>
                            <div className="overflow-y-auto p-6">
                                <form onSubmit={handleLiquidarOrden} className="space-y-6">
                                    {!esReingresoGarantia && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Valor a Cobrar (COP)</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-3 text-slate-400 font-bold">$</span>
                                                    <input type="text" required className="w-full pl-8 pr-4 py-2.5 text-lg font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" value={datosCobro.valor_total} onChange={(e) => setDatosCobro({ ...datosCobro, valor_total: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Cuenta de Destino</label>
                                                <select required className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white appearance-none" value={datosCobro.cuenta_bancaria_id} onChange={(e) => setDatosCobro({ ...datosCobro, cuenta_bancaria_id: e.target.value })}>
                                                    <option value="" disabled>Selecciona una cuenta...</option>
                                                    {cuentas?.map(c => <option key={c.id} value={c.id}>{c.nombre_banco} - {c.numero_cuenta || 'Efectivo'}</option>)}
                                                </select>
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Tiempo de Garantía</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[1, 2, 3].map((mes) => (
                                                <button key={mes} type="button" className={`py-2.5 border rounded-xl font-bold text-sm transition-all ${datosCobro.meses_garantia === mes ? 'bg-wally-blue text-white' : 'bg-white text-slate-600 border-slate-200'}`} onClick={() => setDatosCobro({ ...datosCobro, meses_garantia: mes })}>{mes} {mes === 1 ? 'Mes' : 'Meses'}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <button type="submit" disabled={guardandoCobro} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all">
                                        {guardandoCobro ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar y Entregar'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Modales Cancelar y Reembolso */}
                {modalCancelar.visible && <ModalPeligro titulo="¿Cancelar esta Orden?" icono={<X />} mensaje="No se registrará ningún cobro." alConfirmar={handleCancelarDashboard} alCerrar={() => setModalCancelar({ visible: false })} cargando={procesandoCancelacion} />}
                {modalReembolso.visible && (
                    <ModalPeligro titulo="¡Peligro: Reembolso!" icono={<ShieldAlert />} mensaje="Esto generará un egreso en caja que no se puede deshacer." alConfirmar={handleReembolsoDashboard} alCerrar={() => setModalReembolso({ visible: false })} cargando={procesandoReembolso}>
                        <div className="mb-6 text-left">
                            <label className="block text-sm font-bold text-slate-700 mb-2">¿De qué cuenta sale el dinero?</label>
                            <select required className="w-full px-4 py-2.5 border border-red-200 bg-red-50 text-red-900 rounded-xl" value={cuentaReembolso} onChange={e => setCuentaReembolso(e.target.value)}>
                                <option value="" disabled>Selecciona el banco...</option>
                                {cuentas?.map(c => <option key={c.id} value={c.id}>{c.nombre_banco}</option>)}
                            </select>
                        </div>
                    </ModalPeligro>
                )}
            </main>
        </div>
    );
}

// --- SUBCOMPONENTES ---

function BadgeEstado({ estado, conIcono }) {
    const styles = {
        'Pendiente': 'bg-amber-50 text-amber-700 border-amber-200/50',
        'En proceso': 'bg-blue-50 text-blue-700 border-blue-200/50',
        'Listo para entregar': 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border shadow-sm ${styles[estado] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {conIcono && estado === 'Pendiente' && <Clock className="w-3.5 h-3.5" />}
            {conIcono && estado === 'En proceso' && <PlayCircle className="w-3.5 h-3.5" />}
            {conIcono && estado === 'Listo para entregar' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {estado}
        </span>
    );
}

function ModalPeligro({ titulo, icono, mensaje, alConfirmar, alCerrar, cargando, children }) {
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-in zoom-in-95">
                <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-5">{icono}</div>
                <h3 className="text-xl font-bold text-red-600 mb-2">{titulo}</h3>
                <p className="text-slate-500 text-sm mb-6">{mensaje}</p>
                {children}
                <div className="flex gap-3">
                    <button onClick={alCerrar} className="flex-1 py-3 text-sm bg-slate-100 text-slate-600 font-bold rounded-xl">Volver</button>
                    <button onClick={alConfirmar} disabled={cargando} className="flex-1 py-3 text-sm bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                        {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
}