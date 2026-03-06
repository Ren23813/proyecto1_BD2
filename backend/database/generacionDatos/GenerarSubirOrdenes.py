from pymongo import MongoClient, InsertOne
from bson import ObjectId
from datetime import datetime, timedelta
import random
import json

MONGO_URI = "usuario"
DB_NAME = "Proyecto1"


client = MongoClient(MONGO_URI)
db = client[DB_NAME]


#subir y editar ordenes
# CARGAR DATOS EXISTENTES

usuarios = list(db.usuarios.find({}, {"_id": 1}))
restaurantes = list(db.restaurantes.find({}, {"_id": 1}))

# artículos con su restaurante
articulos = list(db.articulosMenu.find(
    {},
    {"_id": 1, "precio": 1, "restauranteId": 1}
))

# agrupar artículos por restaurante
articulos_por_restaurante = {}

for art in articulos:
    rid = art["restauranteId"]
    if rid not in articulos_por_restaurante:
        articulos_por_restaurante[rid] = []
    articulos_por_restaurante[rid].append(art)



# OPCIONES RANDOM
ESTADOS = ["Completada", "Pendiente", "Cancelada"]
METODOS_PAGO = ["Tarjeta", "Efectivo"]
TIPOS_ORDEN = ["Domicilio", "Local"]



# GENERAR ORDEN
def generar_orden():

    usuario = random.choice(usuarios)
    restaurante = random.choice(restaurantes)

    restaurante_id = restaurante["_id"]

    # si el restaurante no tiene artículos lo evitamos
    if restaurante_id not in articulos_por_restaurante:
        return None

    articulos_rest = articulos_por_restaurante[restaurante_id]

    num_items = random.randint(1, 3)

    items = []
    total = 0

    for _ in range(num_items):

        articulo = random.choice(articulos_rest)

        cantidad = random.randint(1, 6)
        precio = float(articulo["precio"])

        subtotal = cantidad * precio
        total += subtotal

        items.append({
            "articuloId": articulo["_id"],
            "cantidad": cantidad,
            "precioUnitario": precio
        })

    fecha = datetime.now() - timedelta(days=random.randint(0, 60))

    orden = {
        "usuarioId": usuario["_id"],
        "restauranteId": restaurante_id,
        "items": items,
        "total": round(total, 2),
        "estado": random.choice(ESTADOS),
        "metodoPago": random.choice(METODOS_PAGO),
        "tipoOrden": random.choice(TIPOS_ORDEN),
        "fechaPedido": fecha
    }

    return orden


# GENERAR MUCHAS ORDENES
def generar_ordenes(n=50100):

    ordenes = []

    while len(ordenes) < n:
        orden = generar_orden()
        if orden:
            ordenes.append(orden)

    return ordenes



# GUARDAR JSON
def guardar_json(data, path):

    serializable = []

    for doc in data:

        doc_copy = doc.copy()

        doc_copy["usuarioId"] = str(doc_copy["usuarioId"])
        doc_copy["restauranteId"] = str(doc_copy["restauranteId"])
        doc_copy["fechaPedido"] = doc_copy["fechaPedido"].isoformat()

        for item in doc_copy["items"]:
            item["articuloId"] = str(item["articuloId"])

        serializable.append(doc_copy)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(serializable, f, indent=2)



# SUBIR A MONGO
def subir_ordenes(ordenes, batch_size=1000):

    operaciones = []
    total_insertadas = 0

    for i, orden in enumerate(ordenes):

        operaciones.append(InsertOne(orden))

        if len(operaciones) == batch_size:
            resultado = db.ordenes.bulk_write(operaciones, ordered=False)
            total_insertadas += resultado.inserted_count
            operaciones = []

            print("Insertadas:", total_insertadas)

    # insertar lo que quede
    if operaciones:
        resultado = db.ordenes.bulk_write(operaciones, ordered=False)
        total_insertadas += resultado.inserted_count

    print("Total insertadas:", total_insertadas)



print("Generando órdenes...")
ordenes = generar_ordenes(50100)

print("Subiendo a MongoDB...") # Subir primero
subir_ordenes(ordenes)

print("Guardando JSON...")    # Convertir y guardar después
guardar_json(ordenes, "ordenes.json")

print("Proceso terminado ")