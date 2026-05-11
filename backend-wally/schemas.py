from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from pydantic import BaseModel

# ==========================================
# CUENTAS BANCARIAS (¡Este era el que faltaba!)
# ==========================================
class CuentaBancariaCreate(BaseModel):
    nombre_banco: str
    numero_cuenta: Optional[str] = None

# ==========================================
# CLIENTES Y ÓRDENES
# ==========================================
class ClienteCreate(BaseModel):
    nombre: str
    telefono: Optional[str] = Field(None, pattern=r"^\+[1-9]\d{1,14}$")
    cedula_nit: Optional[str] = Field(None, pattern=r"^[0-9]+(-[0-9])?$")
    correo: Optional[str] = None
    direccion: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "nombre": "Empresa Electro SAS",
                "telefono": "+573009876543",
                "cedula_nit": "901234567-8",
                "correo": "contacto@electro.com",
                "direccion": "Carrera 46 # 50-10"
            }
        }
        
class ClienteUpdate(BaseModel):
    nombre: str | None = None
    cedula_nit: str | None = None
    telefono: str | None = None
    email: str | None = None
    direccion: str | None = None

class OrdenServicioCreate(BaseModel):
    cliente_id: str 
    tipo_atencion: str = Field(..., description="Debe ser 'Taller' o 'Domicilio'")
    estado: str = "Pendiente" 
    equipo_tipo: str
    equipo_marca: str
    equipo_modelo: Optional[str] = None
    equipo_serial: Optional[str] = None
    problema_reportado: str
    diagnostico_tecnico: Optional[str] = None
    tecnico_asignado: Optional[str] = None
    fecha_prometida: Optional[date] = None
    observaciones_internas: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "cliente_id": "uuid-del-cliente-aqui",
                "tipo_atencion": "Taller",
                "equipo_tipo": "Nevera",
                "equipo_marca": "Samsung",
                "equipo_modelo": "RT38",
                "problema_reportado": "No enfría en la parte de abajo",
                "tecnico_asignado": "Sayder",
                "fecha_prometida": "2026-05-15"
            }
        }

class OrdenServicioUpdate(BaseModel):
    tipo_atencion: str | None = None
    equipo_tipo: str | None = None
    equipo_marca: str | None = None
    equipo_modelo: str | None = None
    problema_reportado: str | None = None

class OrdenServicioUpdateEstado(BaseModel):
    estado: str = Field(..., description="Debe ser: 'Pendiente', 'En proceso', 'Esperando repuesto', 'Listo para entregar', 'Entregado', o 'Reembolsado'")
    valor_total: Optional[float] = None
    iva: Optional[float] = 0.0
    cuenta_bancaria_id: Optional[str] = None
    meses_garantia: Optional[int] = Field(None, description="1, 2 o 3 meses")

    class Config:
        json_schema_extra = {
            "example": {
                "estado": "Entregado",
                "valor_total": 150000.0,
                "iva": 28500.0,
                "cuenta_bancaria_id": "uuid-de-la-cuenta-bancaria-aqui",
                "meses_garantia": 1
            }
        }

# --- NUEVO: ESQUEMA PARA RECLAMOS DE GARANTÍA ---
class ReclamoGarantia(BaseModel):
    accion: str = Field(..., description="'reparar' o 'reembolsar'")
    motivo: str = Field(..., description="Razón de la falla o devolución")
    cuenta_bancaria_id: Optional[str] = Field(None, description="Requerido si la acción es reembolsar")

# ==========================================
# MÓDULO 1.4 (COTIZACIONES)
# ==========================================

class CotizacionCreate(BaseModel):
    cliente_id: str
    tipo_atencion: str = Field(..., description="Debe ser 'Taller' o 'Domicilio'")
    equipo_tipo: str
    equipo_marca: str
    equipo_modelo: Optional[str] = None
    problema_reportado: str
    valor_estimado: float
    dias_validez: int = Field(3, description="Días de validez de la cotización")

    class Config:
        json_schema_extra = {
            "example": {
                "cliente_id": "uuid-del-cliente-aqui",
                "tipo_atencion": "Taller",
                "equipo_tipo": "Aire Acondicionado",
                "equipo_marca": "LG",
                "equipo_modelo": "Inverter 12000 BTU",
                "problema_reportado": "Requiere mantenimiento preventivo",
                "valor_estimado": 120000.0,
                "dias_validez": 3
            }
        }

# ==========================================
# INVENTARIO
# ==========================================

class RepuestoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    marca_compatible: Optional[str] = None
    modelo_compatible: Optional[str] = None
    stock_actual: int
    stock_minimo: int = 3
    precio_compra: float
    precio_venta: float

    class Config:
        json_schema_extra = {
            "example": {
                "nombre": "Termostato Bimetálico",
                "marca_compatible": "LG",
                "stock_actual": 15,
                "stock_minimo": 5,
                "precio_compra": 12000.0,
                "precio_venta": 35000.0
            }
        }

class OrdenRepuestoCreate(BaseModel):
    repuesto_id: str
    cantidad: int = 1

    class Config:
        json_schema_extra = {
            "example": {
                "repuesto_id": "uuid-del-repuesto-aqui",
                "cantidad": 1
            }
        }

# ==========================================
# FINANTRACK (PROVEEDORES Y EGRESOS)
# ==========================================

class ProveedorCreate(BaseModel):
    nombre: str
    nit_cedula: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    categoria: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "nombre": "Distribuidora de Repuestos del Caribe",
                "nit_cedula": "900123456-1",
                "telefono": "+573001112233",
                "categoria": "Repuestos"
            }
        }

class EgresoCreate(BaseModel):
    descripcion: str
    valor_total: float
    iva: float = 0.0 
    cuenta_bancaria_id: str
    proveedor_id: Optional[str] = None
    categoria: str = Field(..., description="Ej: Inventario, Nómina, Servicios, Otros")

    class Config:
        json_schema_extra = {
            "example": {
                "descripcion": "Compra de 10 bombas",
                "valor_total": 250000.0,
                "iva": 47500.0,
                "cuenta_bancaria_id": "uuid-cuenta-aqui",
                "proveedor_id": "uuid-proveedor-aqui",
                "categoria": "Inventario"
            }
        }

# ==========================================
# NÓMINA Y EMPLEADOS
# ==========================================

class EmpleadoCreate(BaseModel):
    nombre: str
    cedula: str
    cargo: str
    salario_base: float
    tipo_contrato: str
    fecha_ingreso: date
    eps: Optional[str] = None
    afp: Optional[str] = None
    arl_riesgo: float = Field(0.522, description="Porcentaje de riesgo, ej: 0.522")
    caja_compensacion: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "nombre": "Luis Técnico",
                "cedula": "1045000000",
                "cargo": "Técnico Senior",
                "salario_base": 1500000.0,
                "tipo_contrato": "Indefinido",
                "fecha_ingreso": "2026-01-15",
                "eps": "Sura",
                "afp": "Protección",
                "arl_riesgo": 0.522,
                "caja_compensacion": "Combarranquilla"
            }
        }

class NominaCreate(BaseModel):
    empleado_id: str
    mes_anio: str = Field(..., description="Formato YYYY-MM, ej: 2026-05")

    class Config:
        json_schema_extra = {
            "example": {
                "empleado_id": "uuid-del-empleado-aqui",
                "mes_anio": "2026-05"
            }
        }

# ==========================================
# AUTENTICACIÓN
# ==========================================

class UsuarioCreate(BaseModel):
    email: str
    password: str = Field(..., max_length=72, description="La contraseña no puede exceder los 72 caracteres por seguridad")
    nombre: str
    rol: str = Field(..., description="Supervisor, Técnico, Recepcionista, Contador")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "wally@eltaller.com",
                "password": "supersegura123",
                "nombre": "Dylan Gamero",
                "rol": "Supervisor"
            }
        }

class Token(BaseModel):
    access_token: str
    token_type: str