import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { LogOut, LayoutDashboard, Wrench, Users, Wallet, Archive, Loader2, Plus, FileDown, Search, X, UserPlus, ArrowLeft, Edit2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import api, { fetcher } from '../api/axios';
import Sidebar from '../components/Sidebar';

export default function Servicios() {
    const navigate = useNavigate();

    // --- 1. CARGA DE DATOS CON SWR (Caché y Tiempo Real) ---
    const { data: usuario, error: errorUsuario } = useSWR('/mi-perfil', fetcher);
    const { data: ordenesData, mutate: mutateOrdenes } = useSWR('/ordenes/', fetcher);
    const { data: clientesData, mutate: mutateClientes } = useSWR('/clientes/', fetcher);

    // --- 2. ESTADOS LOCALES ---
    const [busqueda, setBusqueda] = useState('');

    // Estados Modal Principal
    const [mostrarModal, setMostrarModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [ordenIdEditar, setOrdenIdEditar] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [mostrarDropdown, setMostrarDropdown] = useState(false);

    const [formData, setFormData] = useState({
        cliente_id: '',
        tipo_atencion: 'Taller',
        equipo_tipo: '',
        equipo_marca: '',
        equipo_modelo: '',
        problema_reportado: ''
    });

    // Estados Modo "Nuevo Cliente"
    const [modoNuevoCliente, setModoNuevoCliente] = useState(false);
    const [guardandoCliente, setGuardandoCliente] = useState(false);
    const [codigoPais, setCodigoPais] = useState('+57');
    const [clienteData, setClienteData] = useState({
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

    // Pantalla de carga inicial (Solo si la memoria caché está vacía)
    if (!usuario || !ordenesData || !clientesData) {
        return (
            <div className="flex h-screen bg-wally-light items-center justify-center w-full">
                <Loader2 className="w-10 h-10 animate-spin text-wally-blue" />
            </div>
        );
    }

    // --- 3. PROCESAMIENTO DE DATOS ---
    const ordenes = [...(ordenesData || [])].sort((a, b) => b.numero_orden - a.numero_orden);
    const clientes = clientesData || [];

    const ordenesFiltradas = ordenes.filter(o =>
        o.clientes?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        o.equipo_tipo.toLowerCase().includes(busqueda.toLowerCase()) ||
        o.estado.toLowerCase().includes(busqueda.toLowerCase())
    );

    const clientesFiltrados = clientes.filter(c =>
        c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
        (c.cedula_nit && c.cedula_nit.includes(busquedaCliente))
    );

    // --- 4. ACCIONES OPERATIVAS ---
    const abrirModalCrear = () => {
        setModoEdicion(false);
        setOrdenIdEditar(null);
        setBusquedaCliente('');
        setFormData({
            cliente_id: '', tipo_atencion: 'Taller', equipo_tipo: '',
            equipo_marca: '', equipo_modelo: '', problema_reportado: ''
        });
        setMostrarModal(true);
    };

    const abrirModalEditar = (orden) => {
        setModoEdicion(true);
        setOrdenIdEditar(orden.id);
        setBusquedaCliente(`${orden.clientes?.nombre} (No modificable)`);
        setFormData({
            cliente_id: orden.cliente_id,
            tipo_atencion: orden.tipo_atencion || 'Taller',
            equipo_tipo: orden.equipo_tipo,
            equipo_marca: orden.equipo_marca,
            equipo_modelo: orden.equipo_modelo || '',
            problema_reportado: orden.problema_reportado
        });
        setMostrarModal(true);
    };

    const handleGuardarOrden = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            if (modoEdicion) {
                const payloadUpdate = {
                    tipo_atencion: formData.tipo_atencion,
                    equipo_tipo: formData.equipo_tipo,
                    equipo_marca: formData.equipo_marca,
                    equipo_modelo: formData.equipo_modelo,
                    problema_reportado: formData.problema_reportado
                };
                await api.patch(`/ordenes/${ordenIdEditar}`, payloadUpdate);
            } else {
                await api.post('/ordenes/', formData);
            }

            setMostrarModal(false);
            mutateOrdenes(); // Revalida las órdenes en segundo plano
        } catch (error) {
            alert(`Error al ${modoEdicion ? 'actualizar' : 'crear'} la orden: ` + (error.response?.data?.detail || "Desconocido"));
        } finally {
            setGuardando(false);
        }
    };

    const handleCrearCliente = async (e) => {
        e.preventDefault();
        setGuardandoCliente(true);
        try {
            const payload = { ...clienteData };
            if (!payload.email) payload.email = null;
            if (!payload.direccion) payload.direccion = null;

            const numeroLimpio = payload.telefono.replace(/\D/g, '');
            payload.telefono = `${codigoPais}${numeroLimpio}`;

            await api.post('/clientes/', payload);

            // Obligamos a SWR a traer los clientes nuevos y esperamos el resultado
            const nuevosClientes = await mutateClientes();

            const clienteCreado = (nuevosClientes || []).find(c =>
                c.cedula_nit === clienteData.cedula_nit || c.nombre === clienteData.nombre
            );

            if (clienteCreado) {
                setFormData({ ...formData, cliente_id: clienteCreado.id });
                setBusquedaCliente(`${clienteCreado.nombre} (${clienteCreado.cedula_nit || 'Sin documento'})`);
            }

            setModoNuevoCliente(false);
            setClienteData({ nombre: '', cedula_nit: '', telefono: '', email: '', direccion: '' });
            setCodigoPais('+57');
        } catch (error) {
            let mensajeError = error.response?.data?.detail;
            if (Array.isArray(mensajeError)) {
                const campo = mensajeError[0].loc[mensajeError[0].loc.length - 1];
                mensajeError = `El campo '${campo}' ${mensajeError[0].msg}`;
            } else if (typeof mensajeError === 'object') {
                mensajeError = JSON.stringify(mensajeError);
            }
            alert(`Error al crear cliente:\n${mensajeError || 'Error desconocido'}`);
        } finally {
            setGuardandoCliente(false);
        }
    };

    const descargarPDF = async (id, numero_orden) => {
        try {
            const response = await api.get(`/ordenes/${id}/pdf`, { responseType: 'blob' });
            const nombreArchivo = `Wally_Orden_${numero_orden}.pdf`;

            if (Capacitor.getPlatform() === 'web') {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', nombreArchivo);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
            } else {
                const reader = new FileReader();
                reader.readAsDataURL(response.data);
                reader.onloadend = async () => {
                    const base64data = reader.result.split(',')[1];
                    try {
                        const savedFile = await Filesystem.writeFile({
                            path: nombreArchivo,
                            data: base64data,
                            directory: Directory.Cache,
                        });
                        await Share.share({
                            title: nombreArchivo,
                            text: 'Aquí tienes tu Orden de Servicio',
                            url: savedFile.uri,
                            dialogTitle: 'Abrir PDF de Wally'
                        });
                    } catch (fsError) {
                        alert("Error al guardar en el dispositivo: " + JSON.stringify(fsError));
                    }
                };
            }
        } catch (error) {
            alert("Error al obtener el PDF del servidor.");
        }
    };

    return (
        <div className="flex h-screen bg-wally-light overflow-hidden w-full">

            <Sidebar usuario={usuario} />

            <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 md:gap-8 w-full">

                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-wally-blue tracking-tight">Órdenes de Servicio</h2>
                        <p className="text-sm md:text-base text-slate-500 mt-1">Gestiona las reparaciones de El Taller de Wally</p>
                    </div>
                    <button
                        onClick={() => { abrirModalCrear(); setModoNuevoCliente(false); }}
                        className="bg-wally-yellow hover:bg-wally-yellow-hover text-wally-blue font-bold px-5 py-3 sm:py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                    >
                        <Plus className="w-5 h-5" /> Nueva Orden
                    </button>
                </header>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col shrink-0 pb-20 md:pb-0">
                    <div className="p-4 md:p-5 border-b border-slate-100 flex gap-4 bg-slate-50/50">
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3 md:top-2.5" />
                            <input
                                type="text" placeholder="Buscar por cliente, equipo o estado..."
                                className="w-full pl-10 pr-4 py-3 md:py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-wally-yellow outline-none text-sm md:text-base"
                                value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col">

                        <div className="hidden md:grid grid-cols-12 gap-4 bg-slate-50 px-6 py-4 border-b border-slate-100 sticky top-0 z-10">
                            <div className="col-span-2 text-slate-500 text-xs uppercase font-bold tracking-wider">Orden #</div>
                            <div className="col-span-4 text-slate-500 text-xs uppercase font-bold tracking-wider">Cliente</div>
                            <div className="col-span-3 text-slate-500 text-xs uppercase font-bold tracking-wider">Equipo</div>
                            <div className="col-span-2 text-slate-500 text-xs uppercase font-bold tracking-wider">Estado</div>
                            <div className="col-span-1 text-slate-500 text-xs uppercase font-bold tracking-wider text-right">Acciones</div>
                        </div>

                        <div className="flex flex-col divide-y divide-slate-100">
                            {ordenesFiltradas.length > 0 ? (
                                ordenesFiltradas.map((orden) => (
                                    <div key={orden.id} className="flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-4 p-4 md:p-6 hover:bg-slate-50/60 transition-colors group">

                                        <div className="flex justify-between items-start md:hidden mb-1">
                                            <span className="font-bold text-wally-blue text-sm">SRV-{String(orden.numero_orden).padStart(4, '0')}</span>
                                            <span className="px-2.5 py-1 rounded-md text-[10px] uppercase font-bold bg-slate-100 text-slate-600 border border-slate-200/50 shadow-sm">
                                                {orden.estado}
                                            </span>
                                        </div>

                                        <div className="hidden md:block col-span-2 font-bold text-wally-blue">
                                            SRV-{String(orden.numero_orden).padStart(4, '0')}
                                        </div>

                                        <div className="col-span-4">
                                            <p className="font-semibold text-sm md:text-base text-slate-700">{orden.clientes?.nombre}</p>
                                        </div>

                                        <div className="col-span-3">
                                            <p className="text-sm md:text-base text-slate-600">{orden.equipo_tipo} {orden.equipo_marca}</p>
                                        </div>

                                        <div className="hidden md:block col-span-2">
                                            <span className="px-3 py-1.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/50 shadow-sm">
                                                {orden.estado}
                                            </span>
                                        </div>

                                        <div className="col-span-1 flex md:justify-end mt-3 md:mt-0 w-full md:w-auto opacity-90 group-hover:opacity-100 transition-opacity gap-2">
                                            {/* BOTÓN EDITAR */}
                                            <button
                                                onClick={() => abrirModalEditar(orden)}
                                                className="flex-none flex justify-center items-center p-3 md:p-2 bg-slate-100 hover:bg-wally-blue/10 text-slate-500 hover:text-wally-blue rounded-lg transition-colors border border-transparent hover:border-wally-blue/20"
                                                title="Editar Orden"
                                            >
                                                <Edit2 className="w-5 h-5 md:w-4 md:h-4" />
                                            </button>

                                            {/* BOTÓN PDF */}
                                            <button
                                                onClick={() => descargarPDF(orden.id, orden.numero_orden)}
                                                className="flex flex-1 md:flex-none justify-center items-center gap-2 p-3 md:p-2 bg-slate-100 hover:bg-wally-yellow text-slate-600 hover:text-wally-blue rounded-lg transition-colors font-medium border border-slate-200 hover:border-transparent"
                                                title="Descargar Orden"
                                            >
                                                <FileDown className="w-5 h-5 md:w-4 md:h-4" />
                                                <span className="md:hidden text-sm">Descargar PDF</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-16 text-center text-slate-500">
                                    <Archive className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                    <p className="font-medium">No se encontraron órdenes.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {mostrarModal && (
                    <div className="fixed inset-0 bg-wally-blue/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={() => setMostrarDropdown(false)}>

                            <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <div className="flex items-center gap-3">
                                    {modoNuevoCliente && (
                                        <button onClick={() => setModoNuevoCliente(false)} className="text-slate-400 hover:text-wally-blue transition-colors bg-white p-1.5 rounded-lg border border-slate-200">
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                    )}
                                    <h3 className="text-lg md:text-xl font-bold text-wally-blue tracking-tight">
                                        {modoNuevoCliente ? 'Registrar Nuevo Cliente' : (modoEdicion ? 'Editar Orden' : 'Generar Nueva Orden')}
                                    </h3>
                                </div>
                                <button onClick={() => setMostrarModal(false)} className="text-slate-400 hover:text-red-500 transition-colors bg-white p-1.5 rounded-lg border border-transparent hover:border-red-100 hover:bg-red-50">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {!modoNuevoCliente ? (
                                <form onSubmit={handleGuardarOrden} className="p-5 md:p-6 overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">

                                        <div className="col-span-1 md:col-span-2 relative">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Cliente <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 md:top-3" />
                                                <input
                                                    type="text"
                                                    disabled={modoEdicion}
                                                    className="w-full pl-10 pr-4 py-3 md:py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-wally-yellow outline-none text-sm md:text-base disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                                    placeholder="Escribe para buscar..."
                                                    value={busquedaCliente}
                                                    onChange={(e) => {
                                                        setBusquedaCliente(e.target.value);
                                                        setMostrarDropdown(true);
                                                        setFormData({ ...formData, cliente_id: '' });
                                                    }}
                                                    onFocus={() => !modoEdicion && setMostrarDropdown(true)}
                                                />
                                            </div>
                                            {mostrarDropdown && !modoEdicion && (
                                                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar">
                                                    {clientesFiltrados.map(c => (
                                                        <button
                                                            key={c.id} type="button"
                                                            className="w-full text-left px-5 py-3 text-sm hover:bg-slate-50 border-b border-slate-100 transition-colors"
                                                            onClick={() => {
                                                                setFormData({ ...formData, cliente_id: c.id });
                                                                setBusquedaCliente(`${c.nombre} (${c.cedula_nit || 'Sin documento'})`);
                                                                setMostrarDropdown(false);
                                                            }}
                                                        >
                                                            <p className="font-bold text-wally-blue">{c.nombre}</p>
                                                            <p className="text-xs text-slate-500 font-medium">Doc: {c.cedula_nit || 'N/A'}</p>
                                                        </button>
                                                    ))}
                                                    <div className="p-3 bg-slate-50 sticky bottom-0 border-t border-slate-100">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setClienteData({ ...clienteData, nombre: busquedaCliente });
                                                                setModoNuevoCliente(true);
                                                                setMostrarDropdown(false);
                                                            }}
                                                            className="w-full flex items-center justify-center gap-2 py-3 md:py-2.5 bg-wally-blue text-wally-yellow rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
                                                        >
                                                            <UserPlus className="w-4 h-4" /> Agregar Nuevo Cliente
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Atención <span className="text-red-500">*</span></label>
                                            <select className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-wally-yellow outline-none bg-white text-sm md:text-base appearance-none"
                                                value={formData.tipo_atencion} onChange={(e) => setFormData({ ...formData, tipo_atencion: e.target.value })}>
                                                <option value="Taller">En Taller</option>
                                                <option value="Domicilio">A Domicilio</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Equipo <span className="text-red-500">*</span></label>
                                            <input type="text" required placeholder="Ej: Nevera" className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-wally-yellow text-sm md:text-base"
                                                value={formData.equipo_tipo} onChange={(e) => setFormData({ ...formData, equipo_tipo: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Marca <span className="text-red-500">*</span></label>
                                            <input type="text" required placeholder="Ej: LG" className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-wally-yellow text-sm md:text-base"
                                                value={formData.equipo_marca} onChange={(e) => setFormData({ ...formData, equipo_marca: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Modelo</label>
                                            <input type="text" placeholder="Opcional" className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-wally-yellow text-sm md:text-base"
                                                value={formData.equipo_modelo} onChange={(e) => setFormData({ ...formData, equipo_modelo: e.target.value })} />
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Problema Reportado <span className="text-red-500">*</span></label>
                                            <textarea required rows="3" placeholder="Describe la falla al detalle..." className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none resize-none focus:ring-2 focus:ring-wally-yellow text-sm md:text-base"
                                                value={formData.problema_reportado} onChange={(e) => setFormData({ ...formData, problema_reportado: e.target.value })}></textarea>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-5 border-t border-slate-100 shrink-0">
                                        <button type="submit" disabled={guardando || (!modoEdicion && !formData.cliente_id)} className="w-full md:w-auto flex justify-center items-center bg-wally-yellow hover:bg-wally-yellow-hover text-wally-blue font-bold px-8 py-3.5 md:py-3 rounded-xl disabled:opacity-50 transition-all shadow-md">
                                            {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : (modoEdicion ? 'Guardar Cambios' : 'Generar Orden')}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleCrearCliente} className="p-5 md:p-6 overflow-y-auto custom-scrollbar">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Nombre Completo <span className="text-red-500">*</span></label>
                                            <input type="text" required className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-wally-yellow text-sm md:text-base"
                                                value={clienteData.nombre} onChange={(e) => setClienteData({ ...clienteData, nombre: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Cédula o NIT <span className="text-red-500">*</span></label>
                                            <input type="text" required className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-wally-yellow text-sm md:text-base"
                                                value={clienteData.cedula_nit} onChange={(e) => setClienteData({ ...clienteData, cedula_nit: e.target.value })} />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono / Celular <span className="text-red-500">*</span></label>
                                            <div className="flex gap-2">
                                                <select
                                                    className="w-[100px] shrink-0 px-2 py-3 md:py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-wally-yellow bg-white text-sm md:text-base font-medium"
                                                    value={codigoPais}
                                                    onChange={(e) => setCodigoPais(e.target.value)}
                                                >
                                                    <option value="+57">🇨🇴 +57</option>
                                                    <option value="+52">🇲🇽 +52</option>
                                                    <option value="+54">🇦🇷 +54</option>
                                                    <option value="+56">🇨🇱 +56</option>
                                                    <option value="+51">🇵🇪 +51</option>
                                                    <option value="+58">🇻🇪 +58</option>
                                                    <option value="+593">🇪🇨 +593</option>
                                                    <option value="+1">🇺🇸 +1</option>
                                                    <option value="+34">🇪🇸 +34</option>
                                                </select>
                                                <input type="tel" required placeholder="300 123 4567"
                                                    className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-wally-yellow text-sm md:text-base"
                                                    value={clienteData.telefono} onChange={(e) => setClienteData({ ...clienteData, telefono: e.target.value })} />
                                            </div>
                                        </div>

                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label>
                                            <input type="email" placeholder="Opcional" className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-wally-yellow text-sm md:text-base"
                                                value={clienteData.email} onChange={(e) => setClienteData({ ...clienteData, email: e.target.value })} />
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Dirección Física</label>
                                            <input type="text" placeholder="Opcional" className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-wally-yellow text-sm md:text-base"
                                                value={clienteData.direccion} onChange={(e) => setClienteData({ ...clienteData, direccion: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-5 border-t border-slate-100 shrink-0">
                                        <button type="submit" disabled={guardandoCliente} className="w-full md:w-auto flex justify-center items-center bg-wally-blue hover:bg-slate-800 text-wally-yellow font-bold px-8 py-3.5 md:py-3 rounded-xl gap-2 transition-colors shadow-md disabled:opacity-50">
                                            {guardandoCliente ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-5 h-5" /> Guardar Cliente</>}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}