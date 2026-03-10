import json
import random
from datetime import datetime
from pymongo import MongoClient


MONGO_URI = "usuario"
DB_NAME = "Proyecto1"
COLLECTION_NAME = "articulosMenu"

#generación de dato para el menú
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
coleccion = db[COLLECTION_NAME]


################33 IMAGENES
# Diccionario de URLs 
IMAGENES_REALES = {
    "Bruschetta": "https://images.unsplash.com/photo-1572695157360-1153aaad020b?q=80&w=500",
    "Caprese": "https://images.unsplash.com/photo-1760023570385-ee484f7076b3?q=80&w=500",
    "Spaghetti Carbonara": "https://images.unsplash.com/photo-1612874742237-6526221588e3?q=80&w=500",
    "Lasagna": "https://images.unsplash.com/photo-1709429790175-b02bb1b19207?q=80&w=500",
    "Pizza Margherita": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=500",
    "Pizza Pepperoni": "https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=500",
    "Pollo Parmigiana": "https://images.unsplash.com/photo-1641898378548-ac93da99786a?q=80&w=500",
    "Tiramisu": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=500",
    "Gelato": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=500"
}
# def actualizar_imagenes_en_atlas():
#     print("Iniciando actualización de imágenes...")
#     contador = 0

#     for nombre_plato, url_real in IMAGENES_REALES.items():
#         # Actualizamos todos los documentos que coincidan con el nombre
#         # sin importar a qué restaurante pertenezcan
#         resultado = coleccion.update_many(
#             {"nombre": nombre_plato}, 
#             {"$set": {"imagen": url_real}}
#         )
#         print(f"Actualizado: {nombre_plato} ({resultado.modified_count} documentos)")
#         contador += resultado.modified_count

#     print(f"\n¡Listo! Se actualizaron {contador} platos en total.")

# ################33 IMAGENES


# MENÚ BASE 
menu_base = [
    {
        "nombre": "Bruschetta",
        "categoria": "Antipasto",
        "descripcion": "Pan tostado con tomate fresco, ajo y aceite de oliva.",
        "ingredientes": ["pan", "tomate", "ajo", "aceite de oliva", "albahaca"],
        "precio": 6.5
    },
    {
        "nombre": "Caprese",
        "categoria": "Antipasto",
        "descripcion": "Ensalada fresca de tomate, mozzarella y albahaca.",
        "ingredientes": ["tomate", "mozzarella", "albahaca", "aceite de oliva"],
        "precio": 7.0
    },
    {
        "nombre": "Spaghetti Carbonara",
        "categoria": "Pasta",
        "descripcion": "Pasta con huevo, queso pecorino y panceta.",
        "ingredientes": ["spaghetti", "huevo", "pecorino", "panceta", "pimienta"],
        "precio": 12.5
    },
    {
        "nombre": "Lasagna",
        "categoria": "Pasta",
        "descripcion": "Capas de pasta con carne, tomate y queso.",
        "ingredientes": ["pasta", "carne", "tomate", "ricotta", "mozzarella"],
        "precio": 13.0
    },
    {
        "nombre": "Pizza Margherita",
        "categoria": "Pizza",
        "descripcion": "Pizza clásica con tomate, mozzarella y albahaca.",
        "ingredientes": ["masa", "tomate", "mozzarella", "albahaca"],
        "precio": 11.0
    },
    {
        "nombre": "Pizza Pepperoni",
        "categoria": "Pizza",
        "descripcion": "Pizza con salsa de tomate, mozzarella y pepperoni.",
        "ingredientes": ["masa", "tomate", "mozzarella", "pepperoni"],
        "precio": 12.0
    },
    {
        "nombre": "Pollo Parmigiana",
        "categoria": "Secondi",
        "descripcion": "Pechuga de pollo empanizada con salsa de tomate y queso.",
        "ingredientes": ["pollo", "pan rallado", "tomate", "mozzarella"],
        "precio": 14.5
    },
    {
        "nombre": "Tiramisu",
        "categoria": "Dolci",
        "descripcion": "Postre italiano con café, mascarpone y cacao.",
        "ingredientes": ["café", "mascarpone", "cacao", "bizcocho"],
        "precio": 6.0
    },
    {
        "nombre": "Gelato",
        "categoria": "Dolci",
        "descripcion": "Helado italiano artesanal.",
        "ingredientes": ["leche", "azúcar", "sabor"],
        "precio": 5.5
    }
]



# VARIACIONES POR RESTAURANTE
def variar_plato(plato):
    plato = plato.copy()

    # variación de precio
    plato["precio"] = round(plato["precio"] + random.uniform(-1.5, 2.0), 2)

    # pequeña variación de ingredientes
    if random.random() < 0.3:
        extras = ["champiñones", "aceitunas", "parmesano", "ajo", "espinaca"]
        plato["ingredientes"].append(random.choice(extras))

    return plato



# GENERAR MENÚ POR RESTAURANTE
def generar_menu_restaurante(restaurante_id):
    menu = []

    for plato in menu_base:
        plato_mod = variar_plato(plato)

        item = {
            "restauranteId": restaurante_id,
            "nombre": plato_mod["nombre"],
            "descripcion": plato_mod["descripcion"],
            "precio": float(plato_mod["precio"]),
            "categoria": plato_mod["categoria"],
            "ingredientes": [{"nombre": ing} for ing in plato_mod["ingredientes"]],
            "disponible": True,
            "fechaCreacion": datetime.utcnow().isoformat(),
            "imagen": IMAGENES_REALES.get(plato_mod["nombre"], "default.jpg")
        }

        menu.append(item)

    return menu



# GENERAR TODOS LOS ARTÍCULOS
def generar_articulos_json(output="articulos_menu.json"):

    restaurantes = list(db.restaurantes.find({}, {"_id": 1}))

    todos_articulos = []

    for r in restaurantes:
        menu = generar_menu_restaurante(r["_id"])
        todos_articulos.extend(menu)

    with open(output, "w", encoding="utf-8") as f:
        json.dump(todos_articulos, f, indent=2, default=str)

    print("Artículos generados:", len(todos_articulos))
    print("Archivo:", output)




generar_articulos_json()

# actualizar_imagenes_en_atlas()