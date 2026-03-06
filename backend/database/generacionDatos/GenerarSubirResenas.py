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

# 1. CARGAR DATOS NECESARIOS
# Solo reseñas de órdenes completadas
print("Cargando órdenes completadas...")
ordenes_completadas = list(db.ordenes.find(
    {"estado": "Completada"}, 
    {"_id": 1, "usuarioId": 1, "restauranteId": 1, "fechaPedido": 1}
))

# 2. Comentarios aleatorios segun estrellas
COMENTARIOS = {
    5: ["¡Excelente servicio y comida!", "La mejor experiencia, super recomendado.", "Todo delicioso, volveré pronto.", "Increíble sabor y atención."],
    4: ["Muy rico todo, aunque tardó un poco.", "Buena comida, porciones generosas.", "Me gustó mucho el ambiente.", "Sabor consistente y buena calidad."],
    3: ["Estuvo aceptable, nada fuera de lo común.", "Comida bien, pero el servicio puede mejorar.", "Normal, esperaba un poco más."],
    2: ["No fue de mi agrado, la comida llegó fría.", "El servicio fue muy lento.", "Precio muy alto para la calidad."],
    1: ["Pésima experiencia, no lo recomiendo.", "Muy mala atención y comida insípida.", "Nunca volveré a pedir aquí."]
}

# 3. GENERAR RESEÑA
def generar_resena(orden):
    calificacion = random.choices([5, 4, 3, 2, 1], weights=[40, 30, 15, 10, 5])[0]
    
    # La fecha de la reseña debe ser posterior a la de la orden (random 1 a 48 horas después)
    fecha_resena = orden["fechaPedido"] + timedelta(hours=random.randint(1, 48))

    resena = {
        "restauranteId": orden["restauranteId"],
        "usuarioId": orden["usuarioId"],
        "ordenId": orden["_id"],
        "calificacion": calificacion,
        "comentario": random.choice(COMENTARIOS[calificacion]),
        "fecha": fecha_resena
    }
    return resena

# 4. PROCESO PRINCIPAL
def procesar_resenas(cantidad_a_generar=10000):
    if not ordenes_completadas:
        print("No se encontraron órdenes completadas para generar reseñas.")
        return

    # Tomamos una muestra aleatoria de las órdenes existentes
    n = min(len(ordenes_completadas), cantidad_a_generar)
    muestras = random.sample(ordenes_completadas, n)
    
    resenas = []
    operaciones = []

    print(f"Generando {n} reseñas...")
    for orden in muestras:
        resena = generar_resena(orden)
        resenas.append(resena)
        operaciones.append(InsertOne(resena))

    # Subir a Mongo en lotes
    if operaciones:
        print("Subiendo a MongoDB...")
        db.resenas.bulk_write(operaciones)
    
    return resenas

# 5. GUARDAR JSON 
def guardar_json(data, path):
    serializable = []
    for doc in data:
        doc_copy = doc.copy()
        doc_copy["_id"] = str(doc.get("_id", ""))
        doc_copy["restauranteId"] = str(doc_copy["restauranteId"])
        doc_copy["usuarioId"] = str(doc_copy["usuarioId"])
        doc_copy["ordenId"] = str(doc_copy["ordenId"])
        doc_copy["fecha"] = doc_copy["fecha"].isoformat()
        serializable.append(doc_copy)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(serializable, f, indent=2, ensure_ascii=False)

# Ejecución
nuevas_resenas = procesar_resenas(2000) # Ajustable
if nuevas_resenas:
    guardar_json(nuevas_resenas, "./../datosGenerados/resenas.json")
    print("¡Proceso terminado exitosamente!")
