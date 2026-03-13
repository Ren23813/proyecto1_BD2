from fastapi import APIRouter, HTTPException
from app.db import db
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional

router = APIRouter(prefix="/restaurantes", tags=["Restaurantes"])

coleccion = db["restaurantes"]


# MODELOS
class Ubicacion(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitud, latitud]


class RestauranteCreate(BaseModel):
    nombre: str
    direccion: str
    activo: bool
    categoria: List[str]
    ubicacion: Ubicacion
    descripcion: Optional[str] = ""
    telefono: Optional[str] = ""


class RestauranteUpdate(BaseModel):
    nombre: Optional[str]
    direccion: Optional[str]
    activo: Optional[bool]
    categoria: Optional[List[str]]
    telefono: Optional[str]
    descripcion: Optional[str]


# Serializador
def restaurante_serializer(restaurante) -> dict:
    return {
        "id": str(restaurante["_id"]),
        "nombre": restaurante["nombre"],
        "direccion": restaurante["direccion"],
        "telefono": restaurante.get("telefono"),
        "descripcion": restaurante.get("descripcion"),
        "calificacionPromedio": restaurante.get("calificacionPromedio", 0),
        "totalResenas": restaurante.get("totalResenas", 0),
        "activo": restaurante["activo"],
        "categoria": restaurante["categoria"],
        "ubicacion": restaurante["ubicacion"],
        "fechaRegistro": restaurante.get("fechaRegistro"),
    }


def validar_object_id(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido")
    


# CREATE
@router.post("/")
async def crear_restaurante(data: RestauranteCreate):
    restaurante = {
        **data.model_dump(),
        "calificacionPromedio": 0.0,
        "totalResenas": 0,
        "fechaRegistro": datetime.utcnow(),
    }

    resultado = await coleccion.insert_one(restaurante)

    nuevo = await coleccion.find_one({"_id": resultado.inserted_id})
    return restaurante_serializer(nuevo)


# READ all
@router.get("/")
async def obtener_restaurantes():
    restaurantes = []
    cursor = coleccion.find()

    async for restaurante in cursor:
        restaurantes.append(restaurante_serializer(restaurante))

    return restaurantes


# READ - {ID}
@router.get("/{id}")
async def obtener_restaurante(id: str):
    validar_object_id(id)
    restaurante = await coleccion.find_one({"_id": ObjectId(id)})

    if not restaurante:
        raise HTTPException(status_code=404, detail="Restaurante no encontrado")

    return restaurante_serializer(restaurante)



@router.put("/{id}/ubicacion")
async def actualizar_ubicacion(id: str, coordinates: List[float]):

    validar_object_id(id)

    await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"ubicacion.coordinates": coordinates}}
    )

    restaurante = await coleccion.find_one({"_id": ObjectId(id)})
    return restaurante_serializer(restaurante)

# UPDATE
@router.put("/{id}")
async def actualizar_restaurante(id: str, data: RestauranteUpdate):
    validar_object_id(id)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    resultado = await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Restaurante no encontrado")

    restaurante_actualizado = await coleccion.find_one({"_id": ObjectId(id)})

    return restaurante_serializer(restaurante_actualizado)


# DELETE (soft delete)
@router.delete("/{id}")
async def eliminar_restaurante(id: str):
    validar_object_id(id)

    resultado = await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"activo": False}}
    )

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Restaurante no encontrado")

    return {"mensaje": "Restaurante desactivado correctamente"}



# GEO - Aggregation pipeline: restaurantes cercanos
@router.get("/cercanos/")
async def obtener_restaurantes_cercanos(
    longitud: float,
    latitud: float,
    limite: int = 5
):
    pipeline = [
        {
            "$geoNear": {
                "near": {
                    "type": "Point",
                    "coordinates": [longitud, latitud]
                },
                "distanceField": "distancia",
                "spherical": True
            }
        },
        {"$limit": limite}
    ]

    cursor = coleccion.aggregate(pipeline)
    resultados = await cursor.to_list(length=limite)
    restaurantes = []
    for r in resultados:
        restaurante = restaurante_serializer(r)
        restaurante["distancia"] = r.get("distancia")
        restaurantes.append(restaurante)

    return restaurantes

# AGGREGATION
@router.get("/reportes/top-ingresos")
async def top_restaurantes_ingresos(limite: int = 10):
    pipeline = [
        {
            "$group": {
                "_id": "$restauranteId",
                "totalIngresos": { "$sum": "$total" },
                "totalOrdenes": { "$sum": 1 }
            }
        },
        { "$sort": { "totalIngresos": -1 } },
        { "$limit": limite },
        {
            "$lookup": {
                "from": "restaurantes",
                "localField": "_id",
                "foreignField": "_id",
                "as": "restaurante"
            }
        },
        { "$unwind": "$restaurante" },
        {
            "$project": {
                "_id": 0,
                "restauranteId": {"$toString": "$_id"},
                "restaurante": "$restaurante.nombre",
                "totalIngresos": 1,
                "totalOrdenes": 1
            }
        }
    ]

    cursor = db["ordenes"].aggregate(pipeline)
    return await cursor.to_list(length=limite)


#traer las reseñas del restaruante (por id)
@router.get("/{id}/resenas")
async def obtener_resenas_restaurante(id: str):

    validar_object_id(id)

    restaurante = await coleccion.find_one({"_id": ObjectId(id)})
    if not restaurante:
        raise HTTPException(status_code=404, detail="Restaurante no encontrado")

    resenas = []
    cursor = db["resenas"].find(
        {"restauranteId": ObjectId(id)}
    ).sort("calificacion", -1)

    async for r in cursor:
        resenas.append({
            "id": str(r["_id"]),
            "usuarioId": str(r["usuarioId"]),
            "calificacion": r["calificacion"],
            "comentario": r.get("comentario"),
            "fecha": r["fecha"]
        })

    return resenas


@router.get("/categorias/distintas")
async def categorias_distintas():

    categorias = await coleccion.distinct("categoria")

    return {
        "categorias": categorias,
        "total": len(categorias)
    }