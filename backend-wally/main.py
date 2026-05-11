import datetime 
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.responses import Response 
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.security import OAuth2PasswordRequestForm
from database import supabase
from schemas import (
    ClienteCreate, ClienteUpdate, OrdenServicioCreate, OrdenServicioUpdateEstado, 
    OrdenServicioUpdate, # <--- ¡AÑADE ESTO AQUÍ!
    RepuestoCreate, OrdenRepuestoCreate, CotizacionCreate,
    ProveedorCreate, EgresoCreate, EmpleadoCreate, NominaCreate,
    UsuarioCreate, Token, CuentaBancariaCreate, ReclamoGarantia
)
from utils import generar_pdf_orden, generar_pdf_nomina, generar_pdf_cotizacion

from auth import (
    obtener_password_hash, verificar_password, crear_token_acceso, 
    obtener_usuario_actual, requerir_rol
)

app = FastAPI(title="El Taller de Wally API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# ==========================================
# MÓDULO DE SEGURIDAD (LOGIN Y REGISTRO)
# ==========================================

@app.post("/registro", response_model=dict)
def registrar_usuario(usuario: UsuarioCreate):
    try:
        res_email = supabase.table("usuarios").select("id").eq("email", usuario.email).execute()
        if res_email.data:
            raise HTTPException(status_code=400, detail="Este correo ya está registrado")
            
        hashed_password = obtener_password_hash(usuario.password)
        
        datos_usuario = {
            "email": usuario.email,
            "password_hash": hashed_password,
            "nombre": usuario.nombre,
            "rol": usuario.rol
        }
        
        respuesta = supabase.table("usuarios").insert(datos_usuario).execute()
        return {"mensaje": f"Usuario {usuario.nombre} creado exitosamente con rol de {usuario.rol}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login", response_model=Token)
def iniciar_sesion(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        res = supabase.table("usuarios").select("*").eq("email", form_data.username).execute()
        if not res.data:
            raise HTTPException(status_code=401, detail="Correo incorrecto")
            
        usuario = res.data[0]
        
        clave_guardada = usuario.get("password_hash")
        if not clave_guardada:
            raise HTTPException(status_code=500, detail="Este usuario no tiene contraseña registrada")
            
        if not verificar_password(form_data.password, clave_guardada):
            raise HTTPException(status_code=401, detail="Contraseña incorrecta")
            
        token_data = {"sub": usuario["email"], "rol": usuario["rol"]}
        access_token = crear_token_acceso(data=token_data)
        
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/mi-perfil")
def leer_usuario_actual(usuario_actual: dict = Depends(obtener_usuario_actual)):
    return {"usuario": usuario_actual["nombre"], "rol": usuario_actual["rol"], "email": usuario_actual["email"]}

# ==========================================
# RUTAS PROTEGIDAS CON ROLES (DASHBOARD)
# ==========================================

@app.get("/dashboard/")
def obtener_dashboard(usuario_autorizado: dict = Depends(requerir_rol(["Admin", "Supervisor", "Contador"]))):
    try:
        res_ordenes = supabase.table("ordenes_servicio").select("id").neq("estado", "Entregado").neq("estado", "Reembolsado").execute()
        servicios_activos = len(res_ordenes.data)

        res_repuestos = supabase.table("repuestos").select("id, nombre, stock_actual, stock_minimo").execute()
        alertas_inventario = {
            item["id"]: {"nombre": item["nombre"], "stock_actual": item["stock_actual"], "stock_minimo": item["stock_minimo"]}
            for item in res_repuestos.data if item["stock_actual"] <= item["stock_minimo"]
        }

        hoy = datetime.date.today()
        primer_dia_mes = hoy.replace(day=1).isoformat()
        
        res_ingresos = supabase.table("ingresos").select("valor_total").gte("fecha", primer_dia_mes).execute()
        ingresos_mes = sum(item["valor_total"] for item in res_ingresos.data)

        res_egresos = supabase.table("egresos").select("valor_total").gte("fecha", primer_dia_mes).execute()
        egresos_mes = sum(item["valor_total"] for item in res_egresos.data)

        utilidad_neta = ingresos_mes - egresos_mes

        return {
            "mes_actual": hoy.strftime("%Y-%m"),
            "operacion": {"servicios_activos": servicios_activos},
            "inventario_critico": alertas_inventario,
            "finanzas": {"ingresos_totales": ingresos_mes, "egresos_totales": egresos_mes, "utilidad_neta": utilidad_neta}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# MÓDULO 1.1: SERVITRACK (CLIENTES Y ÓRDENES)
# ==========================================

@app.get("/clientes/buscar")
def buscar_cliente(q: str):
    try:
        respuesta = supabase.table("clientes").select("id, nombre, cedula_nit, telefono").ilike("nombre", f"%{q}%").execute()
        return {"resultados": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/clientes/")
def obtener_clientes():
    try:
        respuesta = supabase.table("clientes").select("*").execute()
        return {"total_clientes": len(respuesta.data), "datos": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/clientes/")
def crear_cliente(cliente: ClienteCreate):
    try:
        respuesta = supabase.table("clientes").insert(cliente.model_dump()).execute()
        return {"mensaje": "Cliente registrado", "datos": respuesta.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.patch("/clientes/{cliente_id}")
def actualizar_cliente(cliente_id: str, cliente_data: ClienteUpdate):
    try:
        # Filtramos solo los campos que se enviaron y no son None
        datos_actualizar = {k: v for k, v in cliente_data.model_dump(exclude_unset=True).items() if v is not None}
        
        if not datos_actualizar:
            raise HTTPException(status_code=400, detail="No se enviaron datos para actualizar")
            
        respuesta = supabase.table("clientes").update(datos_actualizar).eq("id", cliente_id).execute()
        
        if not respuesta.data:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
            
        return {"mensaje": "Cliente actualizado correctamente", "datos": respuesta.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/ordenes/")
def obtener_ordenes():
    try:
        respuesta = supabase.table("ordenes_servicio").select("*, clientes(nombre, telefono)").execute()
        return {"total_ordenes": len(respuesta.data), "datos": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/ordenes/")
def crear_orden_servicio(orden: OrdenServicioCreate):
    try:
        respuesta = supabase.table("ordenes_servicio").insert(orden.model_dump(mode='json')).execute()
        return {"mensaje": "Orden creada", "datos": respuesta.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@app.patch("/ordenes/{orden_id}")
def actualizar_datos_orden(orden_id: str, orden_data: OrdenServicioUpdate):
    try:
        # Filtramos solo los campos enviados
        datos_actualizar = {k: v for k, v in orden_data.model_dump(exclude_unset=True).items() if v is not None}
        
        if not datos_actualizar:
            raise HTTPException(status_code=400, detail="No se enviaron datos para actualizar")
            
        respuesta = supabase.table("ordenes_servicio").update(datos_actualizar).eq("id", orden_id).execute()
        
        if not respuesta.data:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
            
        return {"mensaje": "Orden actualizada correctamente", "datos": respuesta.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.patch("/ordenes/{orden_id}/estado")
def actualizar_estado_orden(orden_id: str, orden_update: OrdenServicioUpdateEstado):
    try:
        # 1. CASO: ENTREGA NORMAL O ENTREGA DE GARANTÍA
        if orden_update.estado == "Entregado":
            # Extraemos la orden actual para saber si es garantía
            res_ord = supabase.table("ordenes_servicio").select("*").eq("id", orden_id).execute()
            if not res_ord.data:
                raise HTTPException(status_code=404, detail="Orden no encontrada")
                
            orden_actual = res_ord.data[0]
            es_garantia = "RECLAMO GARANTÍA" in (orden_actual.get("observaciones_internas") or "")

            if not es_garantia:
                # Si es un cobro normal, exigimos el dinero
                if not orden_update.valor_total or not orden_update.cuenta_bancaria_id or not orden_update.meses_garantia:
                    supabase.table("ordenes_servicio").update({"estado": "Listo para entregar"}).eq("id", orden_id).execute()
                    raise HTTPException(status_code=400, detail="Falta pago, cuenta bancaria o tiempo de garantía")
            else:
                # Si es garantía, solo exigimos renovar el tiempo
                if not orden_update.meses_garantia:
                    raise HTTPException(status_code=400, detail="Debe seleccionar el tiempo de renovación de garantía")

            # Lógica de cálculo de vencimiento de garantía
            fecha_inicio = datetime.datetime.now()
            fecha_vencimiento = fecha_inicio + datetime.timedelta(days=30 * orden_update.meses_garantia)

            # Actualizamos la orden
            datos_entrega = {
                "estado": "Entregado",
                "garantia_hasta": fecha_vencimiento.isoformat()
            }
            if not es_garantia:
                datos_entrega["valor_total"] = orden_update.valor_total

            res_orden = supabase.table("ordenes_servicio").update(datos_entrega).eq("id", orden_id).execute()

            if res_orden.data:
                orden_actualizada = res_orden.data[0]
                
                # Revisamos si ya tenía una póliza en la tabla de garantías
                res_gar = supabase.table("garantias").select("id").eq("orden_id", orden_id).execute()
                if res_gar.data:
                    # Renovamos la existente
                    supabase.table("garantias").update({
                        "fecha_vencimiento": fecha_vencimiento.isoformat(),
                        "estado": "Activa"
                    }).eq("orden_id", orden_id).execute()
                else:
                    # Creamos una nueva
                    supabase.table("garantias").insert({
                        "orden_id": orden_id,
                        "cliente_id": orden_actualizada["cliente_id"],
                        "equipo": f"{orden_actualizada['equipo_tipo']} {orden_actualizada['equipo_marca']}",
                        "fecha_vencimiento": fecha_vencimiento.isoformat(),
                        "estado": "Activa"
                    }).execute()

                # Registramos el ingreso SOLO si no es garantía
                if not es_garantia:
                    nuevo_ingreso = {
                        "descripcion": f"Servicio técnico - Orden {orden_actualizada['numero_orden']}",
                        "valor_total": orden_update.valor_total,
                        "iva": orden_update.iva,
                        "cuenta_bancaria_id": orden_update.cuenta_bancaria_id,
                        "categoria": "Servicio Técnico",
                        "referencia_origen": orden_id
                    }
                    supabase.table("ingresos").insert(nuevo_ingreso).execute()

            if es_garantia:
                return {"mensaje": "Equipo entregado y póliza renovada gratuitamente", "datos": res_orden.data[0]}
            else:
                return {"mensaje": "Equipo entregado, cobrado y garantía activada", "datos": res_orden.data[0]}

        # 2. CASO: REEMBOLSO DIRECTO DESDE DASHBOARD
        elif orden_update.estado == "Reembolsado":
            if not orden_update.cuenta_bancaria_id:
                raise HTTPException(status_code=400, detail="Se requiere cuenta bancaria para devolver el dinero")
            
            res_ord = supabase.table("ordenes_servicio").select("valor_total, numero_orden").eq("id", orden_id).execute()
            if not res_ord.data: 
                raise HTTPException(status_code=404, detail="Orden no encontrada")
                
            val_total = res_ord.data[0].get("valor_total") or 0

            if val_total > 0:
                supabase.table("egresos").insert({
                    "descripcion": f"Devolución de dinero - Orden SRV-{str(res_ord.data[0]['numero_orden']).zfill(4)}",
                    "valor_total": val_total, 
                    "cuenta_bancaria_id": orden_update.cuenta_bancaria_id, 
                    "categoria": "Devoluciones"
                }).execute()

            supabase.table("ordenes_servicio").update({"estado": "Reembolsado"}).eq("id", orden_id).execute()
            supabase.table("garantias").update({"estado": "Reembolsada"}).eq("orden_id", orden_id).execute()
            
            return {"mensaje": "Dinero reembolsado y registrado en Egresos"}

        # 3. CASO: CAMBIO DE ESTADO NORMAL
        else:
            datos_actualizar = {"estado": orden_update.estado}
            if orden_update.valor_total is not None:
                datos_actualizar["valor_total"] = orden_update.valor_total
            
            respuesta_orden = supabase.table("ordenes_servicio").update(datos_actualizar).eq("id", orden_id).execute()
            if not respuesta_orden.data:
                raise HTTPException(status_code=404, detail="Orden no encontrada")
                
            return {"mensaje": f"Estado actualizado a {orden_update.estado}", "datos": respuesta_orden.data[0]}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/ordenes/{orden_id}/pdf")
def descargar_pdf_orden(orden_id: str):
    try:
        respuesta = supabase.table("ordenes_servicio") \
            .select("*, clientes(*), orden_repuestos(*, repuestos(nombre))") \
            .eq("id", orden_id).execute()
        if not respuesta.data:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        orden_data = respuesta.data[0]
        pdf_bytes = generar_pdf_orden(orden_data)
        nombre_archivo = f"Wally_Orden_{str(orden_data['numero_orden']).zfill(4)}.pdf"
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ==========================================
# MÓDULO 1.4: COTIZACIONES
# ==========================================

@app.post("/cotizaciones/")
def crear_cotizacion(cotizacion: CotizacionCreate):
    try:
        hoy = datetime.date.today()
        fecha_validez = hoy + datetime.timedelta(days=cotizacion.dias_validez)
        
        datos_insertar = {
            "cliente_id": cotizacion.cliente_id,
            "tipo_atencion": cotizacion.tipo_atencion,
            "equipo_tipo": cotizacion.equipo_tipo,
            "equipo_marca": cotizacion.equipo_marca,
            "equipo_modelo": cotizacion.equipo_modelo,
            "problema_reportado": cotizacion.problema_reportado,
            "valor_estimado": cotizacion.valor_estimado,
            "fecha_validez": fecha_validez.isoformat()
        }
        
        respuesta = supabase.table("cotizaciones").insert(datos_insertar).execute()
        return {"mensaje": "Cotización creada", "datos": respuesta.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/cotizaciones/{cotizacion_id}/pdf")
def descargar_pdf_cotizacion(cotizacion_id: str):
    try:
        respuesta = supabase.table("cotizaciones").select("*, clientes(*)").eq("id", cotizacion_id).execute()
        if not respuesta.data:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
            
        cotizacion_data = respuesta.data[0]
        pdf_bytes = generar_pdf_cotizacion(cotizacion_data)
        nombre_archivo = f"Cotizacion_COT-{str(cotizacion_data['numero_cotizacion']).zfill(4)}.pdf"
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/cotizaciones/{cotizacion_id}/aprobar")
def aprobar_cotizacion(cotizacion_id: str):
    try:
        res_cotizacion = supabase.table("cotizaciones").select("*").eq("id", cotizacion_id).execute()
        if not res_cotizacion.data:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
            
        cotizacion = res_cotizacion.data[0]
        if cotizacion["estado"] != "Pendiente":
            raise HTTPException(status_code=400, detail="Solo se pueden aprobar cotizaciones Pendientes")
            
        datos_orden = {
            "cliente_id": cotizacion["cliente_id"],
            "tipo_atencion": cotizacion["tipo_atencion"],
            "estado": "Pendiente",
            "equipo_tipo": cotizacion["equipo_tipo"],
            "equipo_marca": cotizacion["equipo_marca"],
            "equipo_modelo": cotizacion["equipo_modelo"],
            "problema_reportado": cotizacion["problema_reportado"],
            "observaciones_internas": f"Generado desde COT-{str(cotizacion['numero_cotizacion']).zfill(4)}"
        }
        
        res_orden = supabase.table("ordenes_servicio").insert(datos_orden).execute()
        supabase.table("cotizaciones").update({"estado": "Aprobada"}).eq("id", cotizacion_id).execute()
        return {"mensaje": "Aprobada y convertida en Orden", "orden_generada": res_orden.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# MÓDULO 1.3: INVENTARIO COMPARTIDO
# ==========================================

@app.get("/repuestos/")
def obtener_repuestos():
    try:
        respuesta = supabase.table("repuestos").select("*").order("nombre").execute()
        return {"total_repuestos": len(respuesta.data), "datos": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/repuestos/")
def crear_repuesto(repuesto: RepuestoCreate):
    try:
        respuesta = supabase.table("repuestos").insert(repuesto.model_dump()).execute()
        return {"mensaje": "Repuesto creado exitosamente", "datos": respuesta.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/ordenes/{orden_id}/repuestos")
def agregar_repuesto_a_orden(orden_id: str, req: OrdenRepuestoCreate):
    try:
        res_repuesto = supabase.table("repuestos").select("*").eq("id", req.repuesto_id).execute()
        if not res_repuesto.data:
            raise HTTPException(status_code=404, detail="Repuesto no encontrado")
        repuesto = res_repuesto.data[0]
        if repuesto["stock_actual"] < req.cantidad:
            raise HTTPException(status_code=400, detail=f"Solo quedan {repuesto['stock_actual']} unidades.")
            
        nuevo_registro = {
            "orden_id": orden_id,
            "repuesto_id": req.repuesto_id,
            "cantidad": req.cantidad,
            "precio_unitario": repuesto["precio_venta"]
        }
        res_orden_rep = supabase.table("orden_repuestos").insert(nuevo_registro).execute()
        nuevo_stock = repuesto["stock_actual"] - req.cantidad
        supabase.table("repuestos").update({"stock_actual": nuevo_stock}).eq("id", req.repuesto_id).execute()
        return {"mensaje": f"{req.cantidad}x {repuesto['nombre']} agregado", "datos": res_orden_rep.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# MÓDULOS 2.0 y 2.4: FINANTRACK E INVENTARIO DE GARANTÍAS
# ==========================================

@app.get("/cuentas/")
def obtener_cuentas():
    try:
        respuesta = supabase.table("cuentas_bancarias").select("*").execute()
        return {"datos": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/cuentas/")
def crear_cuenta(cuenta: CuentaBancariaCreate):
    try:
        respuesta = supabase.table("cuentas_bancarias").insert(cuenta.model_dump()).execute()
        return {"mensaje": "Cuenta creada exitosamente", "datos": respuesta.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/garantias/")
def obtener_garantias():
    try:
        respuesta = supabase.table("garantias").select("*").execute()
        return {"datos": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- NUEVA RUTA PARA PROCESAR RECLAMOS DE GARANTÍA ---
@app.post("/garantias/{garantia_id}/reclamo")
def procesar_reclamo_garantia(garantia_id: str, reclamo: ReclamoGarantia):
    try:
        res_gar = supabase.table("garantias").select("*").eq("id", garantia_id).execute()
        if not res_gar.data: 
            raise HTTPException(status_code=404, detail="Garantía no encontrada")
        garantia = res_gar.data[0]
        orden_id = garantia["orden_id"]
        
        res_ord = supabase.table("ordenes_servicio").select("*").eq("id", orden_id).execute()
        if not res_ord.data: 
            raise HTTPException(status_code=404, detail="Orden original no encontrada")
        orden = res_ord.data[0]
        
        # 1. VOLVER A REPARAR
        if reclamo.accion == "reparar":
            nueva_nota = f"{(orden.get('observaciones_internas') or '')} | RECLAMO GARANTÍA: {reclamo.motivo}"
            supabase.table("ordenes_servicio").update({"estado": "Pendiente", "observaciones_internas": nueva_nota}).eq("id", orden_id).execute()
            supabase.table("garantias").update({"estado": "En Revisión"}).eq("id", garantia_id).execute()
            return {"mensaje": "Equipo retornado al Dashboard para reparación"}
            
        # 2. DEVOLVER EL DINERO Y REGISTRAR LA PÉRDIDA
        elif reclamo.accion == "reembolsar":
            if not reclamo.cuenta_bancaria_id:
                raise HTTPException(status_code=400, detail="Falta cuenta bancaria para el reembolso")
                
            val_total = orden.get("valor_total") or 0
            if val_total > 0:
                supabase.table("egresos").insert({
                    "descripcion": f"Reembolso por Garantía - SRV-{str(orden['numero_orden']).zfill(4)}",
                    "valor_total": val_total, 
                    "cuenta_bancaria_id": reclamo.cuenta_bancaria_id, 
                    "categoria": "Devoluciones"
                }).execute()
                
            supabase.table("ordenes_servicio").update({"estado": "Reembolsado"}).eq("id", orden_id).execute()
            supabase.table("garantias").update({"estado": "Reembolsada"}).eq("id", garantia_id).execute()
            return {"mensaje": "Dinero reembolsado y registrado en contabilidad"}
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/ingresos/")
def obtener_ingresos():
    try:
        respuesta = supabase.table("ingresos").select("*, cuentas_bancarias(nombre_banco, numero_cuenta)").execute()
        return {"datos": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/proveedores/")
def obtener_proveedores():
    try:
        respuesta = supabase.table("proveedores").select("*").execute()
        return {"total_proveedores": len(respuesta.data), "datos": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/proveedores/")
def crear_proveedor(proveedor: ProveedorCreate):
    try:
        respuesta = supabase.table("proveedores").insert(proveedor.model_dump()).execute()
        return {"mensaje": "Proveedor creado", "datos": respuesta.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/egresos/")
def obtener_egresos():
    try:
        respuesta = supabase.table("egresos").select("*, cuentas_bancarias(nombre_banco, numero_cuenta), proveedores(nombre)").execute()
        return {"total_egresos": len(respuesta.data), "datos": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/egresos/")
def registrar_egreso(egreso: EgresoCreate):
    try:
        respuesta = supabase.table("egresos").insert(egreso.model_dump()).execute()
        return {"mensaje": "Egreso registrado", "datos": respuesta.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# MÓDULO 2.6: PROVISIONES DE IMPUESTOS (PROTEGIDO)
# ==========================================

@app.get("/impuestos/resumen")
def resumen_tributario(usuario_autorizado: dict = Depends(requerir_rol(["Supervisor", "Contador"]))):
    try:
        hoy = datetime.date.today()
        primer_dia_mes = hoy.replace(day=1).isoformat()
        
        res_ingresos = supabase.table("ingresos").select("valor_total, iva").gte("fecha", primer_dia_mes).execute()
        ingresos_mes = sum(item["valor_total"] for item in res_ingresos.data)
        iva_generado = sum(item["iva"] for item in res_ingresos.data if item.get("iva"))
        
        res_egresos = supabase.table("egresos").select("valor_total, iva").gte("fecha", primer_dia_mes).execute()
        egresos_mes = sum(item["valor_total"] for item in res_egresos.data)
        iva_descontable = sum(item["iva"] for item in res_egresos.data if item.get("iva"))
        
        saldo_iva = iva_generado - iva_descontable

        res_nominas = supabase.table("nominas").select("costo_total_empleador").eq("mes_anio", hoy.strftime("%Y-%m")).execute()
        costo_nomina = sum(item["costo_total_empleador"] for item in res_nominas.data)
        
        utilidad_real = ingresos_mes - egresos_mes - costo_nomina
        
        provision_renta = utilidad_real * 0.35 if utilidad_real > 0 else 0
        provision_ica_baq = ingresos_mes * 0.00966

        return {
            "periodo": hoy.strftime("%Y-%m"),
            "iva": {
                "iva_generado_ventas": iva_generado,
                "iva_descontable_compras": iva_descontable,
                "saldo_a_pagar_dian": saldo_iva if saldo_iva > 0 else 0,
                "saldo_a_favor": abs(saldo_iva) if saldo_iva < 0 else 0
            },
            "provisiones_estimadas": {
                "utilidad_base_gravable": utilidad_real,
                "provision_renta_35": round(provision_renta, 2),
                "provision_ica_barranquilla": round(provision_ica_baq, 2)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# MÓDULO 2.5: NÓMINA Y EMPLEADOS
# ==========================================

@app.get("/empleados/")
def obtener_empleados():
    try:
        respuesta = supabase.table("empleados").select("*").execute()
        return {"total_empleados": len(respuesta.data), "datos": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/empleados/")
def registrar_empleado(empleado: EmpleadoCreate):
    try:
        datos = empleado.model_dump(mode='json')
        respuesta = supabase.table("empleados").insert(datos).execute()
        return {"mensaje": "Empleado registrado", "datos": respuesta.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/nominas/calcular")
def calcular_y_guardar_nomina(nomina_req: NominaCreate):
    try:
        res_emp = supabase.table("empleados").select("*").eq("id", nomina_req.empleado_id).execute()
        if not res_emp.data:
            raise HTTPException(status_code=404, detail="Empleado no encontrado")
        
        empleado = res_emp.data[0]
        salario = float(empleado["salario_base"])
        
        deduccion_salud = salario * 0.04
        deduccion_pension = salario * 0.04
        neto_pagado = salario - deduccion_salud - deduccion_pension
        
        prov_salud = salario * 0.085
        prov_pension = salario * 0.12
        prov_arl = salario * (float(empleado["arl_riesgo"]) / 100)
        prov_ccf = salario * 0.04
        
        prov_cesantias = salario * 0.0833
        prov_intereses = prov_cesantias * 0.12
        prov_prima = salario * 0.0833
        prov_vacaciones = salario * 0.0417
        
        costo_total_empleador = salario + prov_salud + prov_pension + prov_arl + prov_ccf + prov_cesantias + prov_intereses + prov_prima + prov_vacaciones

        datos_nomina = {
            "empleado_id": empleado["id"],
            "mes_anio": nomina_req.mes_anio,
            "salario_base": round(salario, 2),
            "deduccion_salud": round(deduccion_salud, 2),
            "deduccion_pension": round(deduccion_pension, 2),
            "neto_pagado": round(neto_pagado, 2),
            "prov_salud": round(prov_salud, 2),
            "prov_pension": round(prov_pension, 2),
            "prov_arl": round(prov_arl, 2),
            "prov_ccf": round(prov_ccf, 2),
            "prov_cesantias": round(prov_cesantias, 2),
            "prov_intereses": round(prov_intereses, 2),
            "prov_prima": round(prov_prima, 2),
            "prov_vacaciones": round(prov_vacaciones, 2),
            "costo_total_empleador": round(costo_total_empleador, 2)
        }
        
        respuesta = supabase.table("nominas").insert(datos_nomina).execute()
        
        return {
            "mensaje": "Nómina calculada y registrada", 
            "resumen": {
                "neto_al_empleado": round(neto_pagado, 2),
                "costo_real_empresa": round(costo_total_empleador, 2)
            },
            "datos": respuesta.data[0]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/nominas/{nomina_id}/pdf")
def descargar_pdf_nomina(nomina_id: str):
    try:
        respuesta = supabase.table("nominas").select("*, empleados(*)").eq("id", nomina_id).execute()
        if not respuesta.data:
            raise HTTPException(status_code=404, detail="Registro de nómina no encontrado")
            
        nomina_data = respuesta.data[0]
        pdf_bytes = generar_pdf_nomina(nomina_data)
        
        nombre_archivo = f"Nomina_{nomina_data['mes_anio']}_{nomina_data['empleados']['cedula']}.pdf"
        return Response(
            content=pdf_bytes, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")