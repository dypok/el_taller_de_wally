import os
import bcrypt # Usaremos bcrypt directamente
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from database import supabase

# Llave maestra para firmar los tokens
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "super-secreto-wally-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def obtener_password_hash(password: str) -> str:
    """Encripta la contraseña usando bcrypt directo, evadiendo el bug de passlib."""
    # Cortamos el texto a 50 caracteres (muy por debajo del límite de 72)
    pwd_corta = password[:50]
    # Encriptamos
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(pwd_corta.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8')

def verificar_password(plain_password: str, hashed_password: str) -> bool:
    """Compara la contraseña en texto plano con el hash guardado."""
    pwd_corta = plain_password[:50]
    return bcrypt.checkpw(pwd_corta.encode('utf-8'), hashed_password.encode('utf-8'))

def crear_token_acceso(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def obtener_usuario_actual(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales o el token expiró",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    res = supabase.table("usuarios").select("*").eq("email", email).execute()
    if not res.data:
        raise credentials_exception
        
    return res.data[0]

def requerir_rol(roles_permitidos: list):
    def verificador(usuario: dict = Depends(obtener_usuario_actual)):
        if usuario["rol"] not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere uno de estos roles: {roles_permitidos}. Tu rol es: {usuario['rol']}"
            )
        return usuario
    return verificador