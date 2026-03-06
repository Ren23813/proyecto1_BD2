from pymongo import MongoClient, InsertOne
from bson import ObjectId
from datetime import datetime, timedelta
import random
import json
import os

# Configuración
MONGO_URI = os.getenv("DATABASE_URL")
DB_NAME = "Proyecto1"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# 1. DEFINICIÓN DE UNIDADES Y COSTOS 
INFO_INGREDIENTES = {
    "tomate": ("kg", 2.5), "ajo": ("unidades", 0.5), "aceite de oliva": ("litros", 12.0),
    "albahaca": ("gramos", 0.05), "pan": ("unidades", 1.0), "mozzarella": ("kg", 8.5),
    "spaghetti": ("kg", 3.0), "huevo": ("unidades", 0.25), "pecorino": ("kg", 15.0),
    "panceta": ("kg", 18.0), "pimienta": ("gramos", 0.1), "pasta": ("kg", 4.0),
    "carne": ("kg", 14.0), "ricotta": ("kg", 9.0), "masa": ("kg", 2.0),
    "pepperoni": ("kg", 20.0), "pollo": ("kg", 7.0), "pan rallado": ("kg", 3.5),
    "café": ("gramos", 0.08), "mascarpone": ("kg", 11.0), "cacao": ("gramos", 0.12),
    "bizcocho": ("unidades", 0.8), "leche": ("litros", 1.2), "azúcar": ("kg", 1.5),
    "sabor": ("litros", 5.0), "champiñones": ("kg", 6.0), "aceitunas": ("kg", 7.5),
    "parmesano": ("kg", 16.0), "espinaca": ("kg", 3.0)
}

PROVEEDORES = ["Distribuidora Italia", "Mercado Central", "Amazon Groceries", "Suministros Gourmet"]

# 2. CARGAR RESTAURANTES
print("Conectando y cargando restaurantes...")
restaurantes = list(db.restaurantes.find({}, {"_id": 1}))

def generar_inventario_completo():
    operaciones = []
    documentos_para_json = []
    
    print(f"Generando ingredientes para {len(restaurantes)} restaurantes...")

    for rest in restaurantes:
        r_id = rest["_id"]
        
        # Para cada ingrediente del catálogo 
        for nombre, (unidad, costo_base) in INFO_INGREDIENTES.items():
            
            # Variar costo y cantidad por restaurante
            costo_aleatorio = round(costo_base * random.uniform(0.8, 1.2), 2)
            cantidad_aleatoria = round(random.uniform(10.0, 200.0), 2)
            
            ingrediente_doc = {
                "restauranteId": r_id,
                "nombre": nombre,
                "proveedor": random.choice(PROVEEDORES),
                "cantidadDisponible": cantidad_aleatoria,
                "unidadMedida": unidad,
                "costoUnitario": costo_aleatorio,
                "fechaCompra": datetime.utcnow() - timedelta(days=random.randint(1, 10))
            }
            
            operaciones.append(InsertOne(ingrediente_doc))
            documentos_para_json.append(ingrediente_doc)

    # 3. EJECUTAR EN MONGODB
    if operaciones:
        print(f"Insertando un total de {len(operaciones)} documentos...")
        db.ingredientes.bulk_write(operaciones)
        
    return documentos_para_json

# 4. GUARDAR JSON 
def guardar_json(data, path="./../datosGenerados/ingredientes.json"):
    serializable = []
    
    # 1. Obtener la ruta del directorio y crearla si no existe
    directorio = os.path.dirname(path)
    if directorio and not os.path.exists(directorio):
        print(f"Creando directorio: {directorio}")
        os.makedirs(directorio, exist_ok=True)

    for doc in data:
        d = doc.copy()
        if "_id" in d:
            d["_id"] = str(d["_id"])
            
        d["restauranteId"] = str(d["restauranteId"])
        
        if isinstance(d["fechaCompra"], datetime):
            d["fechaCompra"] = d["fechaCompra"].isoformat()
        
        serializable.append(d)
        
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(serializable, f, indent=2, ensure_ascii=False)
        print(f"Archivo guardado exitosamente en: {path}")
    except Exception as e:
        print(f"Error al escribir el archivo: {e}")

# Ejecución
try:
    data = generar_inventario_completo()
    guardar_json(data)
    print("¡Proceso terminado! Todos los restaurantes tienen ahora stock de todos los ingredientes posibles.")
except Exception as e:
    print(f"Error: {e}")
