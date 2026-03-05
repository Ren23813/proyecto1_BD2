from fastapi import APIRouter, HTTPException
from app.db import db
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/articulosMenu", tags=["Artículos Menú"])

coleccion = db["articulosMenu"]

# MODELOS
class ArticuloUpdate(BaseModel):
    nombre: Optional[str]
    descripcion: Optional[str]
    precio: Optional[float]
    categoria: Optional[str]
    disponible: Optional[bool]
    imagen: Optional[str]

# Serializador
def articulo_serializer(articulo) -> dict:
    return {
        "id": str(articulo["_id"]),
        "restauranteId": str(articulo["restauranteId"]),
        "nombre": articulo["nombre"],
        "descripcion": articulo.get("descripcion"),
        "precio": articulo["precio"],
        "categoria": articulo["categoria"],
        "disponible": articulo.get("disponible", True),
        "fechaCreacion": articulo.get("fechaCreacion"),
        "imagen": articulo.get("imagen"),
    }

def validar_object_id(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido")

# READ all
@router.get("/")
async def obtener_articulos():
    articulos = []
    cursor = coleccion.find()
    async for articulo in cursor:
        articulos.append(articulo_serializer(articulo))
    return articulos

# READ - {ID}
@router.get("/{id}")
async def obtener_articulo(id: str):
    validar_object_id(id)
    articulo = await coleccion.find_one({"_id": ObjectId(id)})
    if not articulo:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    return articulo_serializer(articulo)

# UPDATE
@router.put("/{id}")
async def actualizar_articulo(id: str, data: ArticuloUpdate):
    validar_object_id(id)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    resultado = await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    articulo_actualizado = await coleccion.find_one({"_id": ObjectId(id)})
    return articulo_serializer(articulo_actualizado)

# DELETE (soft delete)
@router.delete("/{id}")
async def eliminar_articulo(id: str):
    validar_object_id(id)
    resultado = await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"disponible": False}}
    )
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    return {"mensaje": "Artículo desactivado correctamente"}

# AGGREGATION
@router.get("/reportes/mas-vendidos")
async def platos_mas_vendidos(limite: int = 10):
    pipeline = [
        { "$unwind": "$items" },
        {
            "$group": {
                "_id": "$items.articuloId",
                "cantidadVendida": { "$sum": "$items.cantidad" }
            }
        },
        { "$sort": { "cantidadVendida": -1 } },
        { "$limit": limite },
        {
            "$lookup": {
                "from": "articulosMenu",
                "localField": "_id",
                "foreignField": "_id",
                "as": "articulo"
            }
        },
        { "$unwind": "$articulo" },
        {
            "$project": {
                "_id": 0,
                "articuloId": {"$toString": "$_id"},
                "nombre": "$articulo.nombre",
                "cantidadVendida": 1
            }
        }
    ]

    cursor = db["ordenes"].aggregate(pipeline)
    return await cursor.to_list(length=limite)