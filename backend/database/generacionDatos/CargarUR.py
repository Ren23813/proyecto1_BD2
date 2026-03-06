from pymongo import MongoClient, InsertOne
from datetime import datetime
import json

MONGO_URI = "usuario"
DB_NAME = "Proyecto1"

#Subir los json de usuarios y restaurantes
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def cargar_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# USUARIOS → insert_many
def subir_usuarios(path_json):
    usuarios = cargar_json(path_json)

    for user in usuarios:
        # Convertir fechaRegistro si viene como string
        if isinstance(user.get("fechaRegistro"), str):
            user["fechaRegistro"] = datetime.fromisoformat(user["fechaRegistro"])

    if usuarios:
        resultado = db.usuarios.insert_many(usuarios, ordered=False)
        print("Usuarios insertados:", len(resultado.inserted_ids))



# RESTAURANTES → bulk_write
def subir_restaurantes(path_json):
    restaurantes = cargar_json(path_json)

    operaciones = []

    for rest in restaurantes:
        if isinstance(rest.get("fechaRegistro"), str):
            rest["fechaRegistro"] = datetime.fromisoformat(rest["fechaRegistro"])

        operaciones.append(InsertOne(rest))

    if operaciones:
        resultado = db.restaurantes.bulk_write(operaciones, ordered=False)
        print("Restaurantes insertados:", resultado.inserted_count)



# EJECUCIÓN
subir_usuarios("usuarios.json")
subir_restaurantes("restaurants.json")