import os
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Cargamos las variables de entorno del archivo .env
load_dotenv()

# 2. Obtenemos las credenciales
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("¡Faltan las credenciales de Supabase en el archivo .env!")

# 3. Inicializamos el cliente de Supabase
supabase: Client = create_client(url, key)