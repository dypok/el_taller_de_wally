from fpdf import FPDF

def generar_pdf_orden(orden_data: dict) -> bytes:
    """Genera un PDF profesional para El Taller de Wally (Orden de Servicio)."""
    pdf = FPDF()
    pdf.add_page()
    COLOR_PRIMARIO = (44, 62, 80)
    COLOR_ACENTO = (52, 152, 219)
    COLOR_TEXTO = (60, 60, 60)
    
    pdf.set_font("helvetica", "B", 22)
    pdf.set_text_color(*COLOR_PRIMARIO)
    pdf.cell(0, 12, "EL TALLER DE WALLY", ln=True, align="L")
    pdf.set_font("helvetica", "I", 10)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 5, "Excelencia técnica en electrodomésticos", ln=True, align="L")
    
    pdf.set_y(15)
    pdf.set_font("helvetica", "", 9)
    pdf.cell(0, 5, "Barranquilla, Atlántico", ln=True, align="R")
    pdf.cell(0, 5, "WhatsApp: +57 300 000 0000", ln=True, align="R")
    pdf.ln(15)
    
    pdf.set_fill_color(*COLOR_PRIMARIO)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("helvetica", "B", 12)
    num_orden_str = f"ORDEN DE SERVICIO: SRV-{str(orden_data['numero_orden']).zfill(4)}"
    pdf.cell(0, 10, f"  {num_orden_str}", ln=True, fill=True)
    pdf.ln(8)
    
    pdf.set_text_color(*COLOR_TEXTO)
    x_inicio = pdf.get_x()
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(90, 7, "INFORMACIÓN DEL CLIENTE", ln=False)
    pdf.set_x(x_inicio + 100)
    pdf.cell(90, 7, "DETALLES DEL EQUIPO", ln=True)
    
    pdf.set_draw_color(*COLOR_ACENTO)
    pdf.line(x_inicio, pdf.get_y(), x_inicio + 85, pdf.get_y())
    pdf.line(x_inicio + 100, pdf.get_y(), x_inicio + 185, pdf.get_y())
    pdf.ln(3)
    
    cliente = orden_data.get("clientes") or {}
    pdf.set_font("helvetica", "", 10)
    pdf.cell(90, 6, f"Nombre: {cliente.get('nombre', 'N/A')}", ln=False)
    pdf.set_x(x_inicio + 100)
    pdf.cell(90, 6, f"Equipo: {orden_data['equipo_tipo']}", ln=True)
    pdf.cell(90, 6, f"ID/NIT: {cliente.get('cedula_nit', 'N/A')}", ln=False)
    pdf.set_x(x_inicio + 100)
    pdf.cell(90, 6, f"Marca: {orden_data['equipo_marca']}", ln=True)
    pdf.ln(10)
    
    repuestos_usados = orden_data.get("orden_repuestos", [])
    if repuestos_usados:
        pdf.set_font("helvetica", "B", 11)
        pdf.set_fill_color(245, 245, 245)
        pdf.cell(0, 8, "  REPUESTOS Y MATERIALES", ln=True, fill=True)
        pdf.ln(2)
        pdf.set_font("helvetica", "B", 9)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(20, 7, "Cant.", border="B", align="C")
        pdf.cell(100, 7, "Descripción", border="B", align="L")
        pdf.cell(35, 7, "Precio Unid.", border="B", align="R")
        pdf.cell(35, 7, "Subtotal", border="B", align="R", ln=True)
        
        pdf.set_font("helvetica", "", 10)
        pdf.set_text_color(*COLOR_TEXTO)
        total_repuestos = 0
        for item in repuestos_usados:
            nombre_rep = item.get("repuestos", {}).get("nombre", "Repuesto")
            cant = item["cantidad"]
            precio = float(item["precio_unitario"])
            subtotal = cant * precio
            total_repuestos += subtotal
            pdf.cell(20, 7, str(cant), align="C")
            pdf.cell(100, 7, nombre_rep, align="L")
            pdf.cell(35, 7, f"${precio:,.0f}", align="R")
            pdf.cell(35, 7, f"${subtotal:,.0f}", align="R", ln=True)
        pdf.ln(5)
    
    pdf.set_font("helvetica", "B", 11)
    pdf.set_fill_color(245, 245, 245)
    pdf.cell(0, 8, "  PROBLEMA REPORTADO Y DIAGNÓSTICO", ln=True, fill=True)
    pdf.set_font("helvetica", "", 10)
    pdf.ln(2)
    pdf.multi_cell(0, 6, f"Reporte: {orden_data['problema_reportado']}")
    if orden_data.get('diagnostico_tecnico'):
        pdf.ln(1)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(0, 6, "Diagnóstico:", ln=True)
        pdf.set_font("helvetica", "", 10)
        pdf.multi_cell(0, 6, orden_data['diagnostico_tecnico'])
        
    pdf.set_y(-50)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(5)
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(100, 6, f"TÉCNICO: {orden_data.get('tecnico_asignado', 'Pendiente')}", ln=False)
    pdf.set_font("helvetica", "B", 15)
    pdf.set_text_color(*COLOR_PRIMARIO)
    valor = float(orden_data.get('valor_total', 0))
    pdf.cell(0, 8, f"TOTAL A PAGAR: ${valor:,.0f} COP", ln=True, align="R")
    pdf.set_font("helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, "Gracias por confiar en El Taller de Wally.", ln=True, align="C")

    return bytes(pdf.output())

def generar_pdf_nomina(nomina_data: dict) -> bytes:
    """Genera el comprobante de pago de nómina mensual en PDF."""
    pdf = FPDF()
    pdf.add_page()
    COLOR_PRIMARIO = (44, 62, 80)
    COLOR_TEXTO = (60, 60, 60)
    
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(*COLOR_PRIMARIO)
    pdf.cell(0, 10, "EL TALLER DE WALLY - COMPROBANTE DE NÓMINA", ln=True, align="C")
    pdf.set_font("helvetica", "", 10)
    pdf.cell(0, 5, "NIT: 900.000.000-1 | Barranquilla, Atlántico", ln=True, align="C")
    pdf.ln(10)
    
    empleado = nomina_data.get("empleados", {})
    pdf.set_fill_color(240, 240, 240)
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(0, 8, f"  PERÍODO DE PAGO: {nomina_data['mes_anio']}", ln=True, fill=True)
    pdf.ln(2)
    
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(*COLOR_TEXTO)
    pdf.cell(40, 6, "Empleado:", ln=False)
    pdf.set_font("helvetica", "", 10)
    pdf.cell(80, 6, empleado.get("nombre", ""), ln=False)
    
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(30, 6, "Cédula:", ln=False)
    pdf.set_font("helvetica", "", 10)
    pdf.cell(40, 6, empleado.get("cedula", ""), ln=True)
    
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(40, 6, "Cargo:", ln=False)
    pdf.set_font("helvetica", "", 10)
    pdf.cell(80, 6, empleado.get("cargo", ""), ln=True)
    pdf.ln(10)
    
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(95, 8, "DEVENGOS", border=1, align="C")
    pdf.cell(95, 8, "DEDUCCIONES (EMPLEADO)", border=1, ln=True, align="C")
    
    pdf.set_font("helvetica", "", 10)
    salario = float(nomina_data["salario_base"])
    salud = float(nomina_data["deduccion_salud"])
    pension = float(nomina_data["deduccion_pension"])
    
    pdf.cell(65, 8, "Salario Base", border="L")
    pdf.cell(30, 8, f"${salario:,.0f}", align="R", border="R")
    pdf.cell(65, 8, "Salud (4%)", border="L")
    pdf.cell(30, 8, f"${salud:,.0f}", align="R", border="R", ln=True)
    
    pdf.cell(65, 8, "", border="L")
    pdf.cell(30, 8, "", align="R", border="R")
    pdf.cell(65, 8, "Pensión (4%)", border="L")
    pdf.cell(30, 8, f"${pension:,.0f}", align="R", border="R", ln=True)
    
    pdf.cell(95, 2, "", border="T", ln=False)
    pdf.cell(95, 2, "", border="T", ln=True)
    pdf.ln(5)
    
    pdf.set_font("helvetica", "B", 12)
    neto = float(nomina_data["neto_pagado"])
    pdf.cell(120, 10, "NETO A PAGAR:", align="R")
    pdf.set_text_color(*COLOR_PRIMARIO)
    pdf.cell(70, 10, f"${neto:,.0f} COP", ln=True, align="R")
    
    pdf.ln(15)
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(*COLOR_TEXTO)
    pdf.line(20, pdf.get_y(), 80, pdf.get_y())
    pdf.cell(100, 5, "Firma del Empleado", ln=True)

    return bytes(pdf.output())

def generar_pdf_cotizacion(cotizacion_data: dict) -> bytes:
    """Genera el documento en PDF para una cotización de servicio."""
    pdf = FPDF()
    pdf.add_page()
    COLOR_PRIMARIO = (44, 62, 80)
    COLOR_ACENTO = (52, 152, 219)
    COLOR_TEXTO = (60, 60, 60)
    
    pdf.set_font("helvetica", "B", 22)
    pdf.set_text_color(*COLOR_PRIMARIO)
    pdf.cell(0, 12, "EL TALLER DE WALLY", ln=True, align="L")
    pdf.set_font("helvetica", "I", 10)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 5, "Excelencia técnica en electrodomésticos", ln=True, align="L")
    
    pdf.set_y(15)
    pdf.set_font("helvetica", "", 9)
    pdf.cell(0, 5, "Barranquilla, Atlántico", ln=True, align="R")
    pdf.cell(0, 5, "WhatsApp: +57 300 000 0000", ln=True, align="R")
    pdf.ln(15)
    
    pdf.set_fill_color(*COLOR_PRIMARIO)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("helvetica", "B", 12)
    num_cot = f"COTIZACIÓN: COT-{str(cotizacion_data['numero_cotizacion']).zfill(4)}"
    pdf.cell(0, 10, f"  {num_cot}", ln=True, fill=True)
    pdf.ln(8)
    
    pdf.set_text_color(*COLOR_TEXTO)
    x_inicio = pdf.get_x()
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(90, 7, "INFORMACIÓN DEL CLIENTE", ln=False)
    pdf.set_x(x_inicio + 100)
    pdf.cell(90, 7, "DETALLES DEL EQUIPO", ln=True)
    
    pdf.set_draw_color(*COLOR_ACENTO)
    pdf.line(x_inicio, pdf.get_y(), x_inicio + 85, pdf.get_y())
    pdf.line(x_inicio + 100, pdf.get_y(), x_inicio + 185, pdf.get_y())
    pdf.ln(3)
    
    cliente = cotizacion_data.get("clientes") or {}
    pdf.set_font("helvetica", "", 10)
    pdf.cell(90, 6, f"Nombre: {cliente.get('nombre', 'N/A')}", ln=False)
    pdf.set_x(x_inicio + 100)
    pdf.cell(90, 6, f"Equipo: {cotizacion_data['equipo_tipo']}", ln=True)
    pdf.cell(90, 6, f"ID/NIT: {cliente.get('cedula_nit', 'N/A')}", ln=False)
    pdf.set_x(x_inicio + 100)
    pdf.cell(90, 6, f"Marca: {cotizacion_data['equipo_marca']}", ln=True)
    pdf.ln(10)
    
    pdf.set_font("helvetica", "B", 11)
    pdf.set_fill_color(245, 245, 245)
    pdf.cell(0, 8, "  PROBLEMA A SOLUCIONAR", ln=True, fill=True)
    pdf.set_font("helvetica", "", 10)
    pdf.ln(2)
    pdf.multi_cell(0, 6, cotizacion_data['problema_reportado'])
    pdf.ln(5)
    
    pdf.set_y(-60)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(5)
    
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(200, 50, 50)
    pdf.cell(100, 6, f"VÁLIDA HASTA: {cotizacion_data['fecha_validez']}", ln=False)
    
    pdf.set_font("helvetica", "B", 15)
    pdf.set_text_color(*COLOR_PRIMARIO)
    valor = float(cotizacion_data.get('valor_estimado', 0))
    pdf.cell(0, 8, f"VALOR ESTIMADO: ${valor:,.0f} COP", ln=True, align="R")
    
    pdf.set_font("helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, "Los valores pueden estar sujetos a cambios tras revisión profunda.", ln=True, align="C")

    return bytes(pdf.output())