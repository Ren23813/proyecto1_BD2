from pymongo import MongoClient, InsertOne
from bson import ObjectId
from datetime import datetime
import json

MONGO_URI = "usuario"
DB_NAME = "Proyecto1"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]



# CARGAR JSON
def cargar_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)



# SUBIR ARTICULOS MENU
def subir_articulos_menu(path_json, batch_size=1000):

    articulos = cargar_json(path_json)

    operaciones = []
    total_insertados = 0

    for articulo in articulos:

        # convertir restauranteId a ObjectId
        if isinstance(articulo["restauranteId"], str):
            articulo["restauranteId"] = ObjectId(articulo["restauranteId"])

        # convertir fecha
        if isinstance(articulo.get("fechaCreacion"), str):
            articulo["fechaCreacion"] = datetime.fromisoformat(
                articulo["fechaCreacion"]
            )

        operaciones.append(InsertOne(articulo))

        # insertar por bloques
        if len(operaciones) == batch_size:
            resultado = db.articulosMenu.bulk_write(operaciones, ordered=False)
            total_insertados += resultado.inserted_count
            operaciones = []
            print("Insertados hasta ahora:", total_insertados)

    # insertar lo que quede
    if operaciones:
        resultado = db.articulosMenu.bulk_write(operaciones, ordered=False)
        total_insertados += resultado.inserted_count

    print("Total artículos insertados:", total_insertados)


# EJECUCIÓN
subir_articulos_menu("articulos_menu.json")