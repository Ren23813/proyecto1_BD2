from fastapi import APIRouter, HTTPException
from app.db import db
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List

router = APIRouter(prefix="/resenas", tags=["Reseñas"])

coleccion = db["resenas"]


# MODELOS
class ResenaCreate(BaseModel):
    restauranteId: str
    usuarioId: str
    ordenId: Optional[str] = None
    calificacion: int = Field(..., ge=1, le=5)
    comentario: Optional[str] = ""


class ResenaUpdate(BaseModel):
    calificacion: Optional[int] = Field(None, ge=1, le=5)
    comentario: Optional[str]


# helpers
def validar_object_id(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido")


def resena_serializer(resena) -> dict:
    return {
        "id": str(resena["_id"]),
        "restauranteId": str(resena["restauranteId"]),
        "usuarioId": str(resena["usuarioId"]),
        "ordenId": str(resena["ordenId"]) if resena.get("ordenId") else None,
        "calificacion": resena["calificacion"],
        "comentario": resena.get("comentario"),
        "fecha": resena["fecha"],
    }


# CREATE
@router.post("/")
async def crear_resena(data: ResenaCreate):

    validar_object_id(data.restauranteId)
    validar_object_id(data.usuarioId)

    if data.ordenId:
        validar_object_id(data.ordenId)

    # Validar existencia de restaurante
    restaurante = await db["restaurantes"].find_one(
        {"_id": ObjectId(data.restauranteId)}
    )
    if not restaurante:
        raise HTTPException(status_code=404, detail="Restaurante no encontrado")

    # Validar existencia de usuario
    usuario = await db["usuarios"].find_one(
        {"_id": ObjectId(data.usuarioId)}
    )
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Validar orden si viene
    if data.ordenId:
        orden = await db["ordenes"].find_one(
            {
                "_id": ObjectId(data.ordenId),
                "usuarioId": ObjectId(data.usuarioId),
                "restauranteId": ObjectId(data.restauranteId)
            }
        )

        if not orden:
            raise HTTPException(
                status_code=400,
                detail="La orden no pertenece a este usuario o restaurante"
            )

    nueva_resena = {
        "restauranteId": ObjectId(data.restauranteId),
        "usuarioId": ObjectId(data.usuarioId),
        "ordenId": ObjectId(data.ordenId) if data.ordenId else None,
        "calificacion": data.calificacion,
        "comentario": data.comentario,
        "fecha": datetime.utcnow()
    }

    resultado = await coleccion.insert_one(nueva_resena)
    creada = await coleccion.find_one({"_id": resultado.inserted_id})

    return resena_serializer(creada)


# READ (all)
@router.get("/")
async def obtener_resenas():
    resenas = []
    cursor = coleccion.find()

    async for resena in cursor:
        resenas.append(resena_serializer(resena))

    return resenas



# READ (ID)
@router.get("/{id}")
async def obtener_resena(id: str):
    validar_object_id(id)

    resena = await coleccion.find_one({"_id": ObjectId(id)})

    if not resena:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")

    return resena_serializer(resena)


# UPDATE
@router.put("/{id}")
async def actualizar_resena(id: str, data: ResenaUpdate):
    validar_object_id(id)

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")

    resultado = await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")

    actualizada = await coleccion.find_one({"_id": ObjectId(id)})
    return resena_serializer(actualizada)


# DELETE
@router.delete("/{id}")
async def eliminar_resena(id: str):
    validar_object_id(id)

    resultado = await coleccion.delete_one({"_id": ObjectId(id)})

    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")

    return {"mensaje": "Reseña eliminada correctamente"}


@router.delete("/restaurante/{restaurante_id}")
async def eliminar_resenas_restaurante(restaurante_id: str):

    if not ObjectId.is_valid(restaurante_id):
        raise HTTPException(400, "ID inválido")

    resultado = await coleccion.delete_many(
        {"restauranteId": ObjectId(restaurante_id)}
    )

    return {
        "mensaje": "Reseñas eliminadas",
        "eliminadas": resultado.deleted_count
    }