from fastapi import APIRouter, HTTPException
from app.db import db
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/ingredientes", tags=["Ingredientes"])

coleccion = db["ingredientes"]


# MODELOS
class IngredienteCreate(BaseModel):
    restauranteId: str
    nombre: str
    cantidadDisponible: float
    proveedor: Optional[str] = None
    unidadMedida: Optional[str] = None
    costoUnitario: Optional[float] = None
    fechaCompra: Optional[datetime] = None


class IngredienteUpdate(BaseModel):
    nombre: Optional[str]
    proveedor: Optional[str]
    unidadMedida: Optional[str]
    costoUnitario: Optional[float]
    cantidadDisponible: Optional[float]


class CompraIngrediente(BaseModel):
    restauranteId: str
    ingredienteId: str
    cantidad: float
    costoUnitario: float


# helpers
def validar_object_id(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido")


def ingrediente_serializer(ingrediente) -> dict:
    return {
        "id": str(ingrediente["_id"]),
        "restauranteId": str(ingrediente["restauranteId"]),
        "nombre": ingrediente["nombre"],
        "proveedor": ingrediente.get("proveedor"),
        "cantidadDisponible": ingrediente["cantidadDisponible"],
        "unidadMedida": ingrediente.get("unidadMedida"),
        "costoUnitario": ingrediente.get("costoUnitario"),
        "fechaCompra": ingrediente.get("fechaCompra"),
    }


# CREATE
@router.post("/")
async def crear_ingrediente(data: IngredienteCreate):
    validar_object_id(data.restauranteId)

    nuevo = {
        "restauranteId": ObjectId(data.restauranteId),
        "nombre": data.nombre,
        "cantidadDisponible": data.cantidadDisponible,
        "proveedor": data.proveedor,
        "unidadMedida": data.unidadMedida,
        "costoUnitario": data.costoUnitario,
        "fechaCompra": data.fechaCompra or datetime.utcnow()
    }

    resultado = await coleccion.insert_one(nuevo)
    creado = await coleccion.find_one({"_id": resultado.inserted_id})

    return ingrediente_serializer(creado)


# READ (all)
@router.get("/")
async def obtener_ingredientes():
    ingredientes = []
    cursor = coleccion.find()

    async for ingrediente in cursor:
        ingredientes.append(ingrediente_serializer(ingrediente))

    return ingredientes


# READ (ID)
@router.get("/{id}")
async def obtener_ingrediente(id: str):
    validar_object_id(id)

    ingrediente = await coleccion.find_one({"_id": ObjectId(id)})

    if not ingrediente:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")

    return ingrediente_serializer(ingrediente)


# UPDATE
@router.put("/{id}")
async def actualizar_ingrediente(id: str, data: IngredienteUpdate):
    validar_object_id(id)

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    resultado = await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")

    actualizado = await coleccion.find_one({"_id": ObjectId(id)})
    return ingrediente_serializer(actualizado)


# DELETE
@router.delete("/{id}")
async def eliminar_ingrediente(id: str):
    validar_object_id(id)

    resultado = await coleccion.delete_one({"_id": ObjectId(id)})

    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")

    return {"mensaje": "Ingrediente eliminado correctamente"}



@router.post("/registrar-compra")
async def registrar_compra(data: CompraIngrediente):

    validar_object_id(data.restauranteId)
    validar_object_id(data.ingredienteId)

    async with await db.client.start_session() as session:
        try:
            async with session.start_transaction():

                ingrediente = await coleccion.find_one(
                    {
                        "_id": ObjectId(data.ingredienteId),
                        "restauranteId": ObjectId(data.restauranteId)
                    },
                    session=session
                )

                if not ingrediente:
                    raise HTTPException(
                        status_code=404,
                        detail="Ingrediente no encontrado"
                    )

                await coleccion.update_one(
                    {"_id": ObjectId(data.ingredienteId)},
                    {
                        "$inc": {"cantidadDisponible": data.cantidad},
                        "$set": {
                            "costoUnitario": data.costoUnitario,
                            "fechaCompra": datetime.utcnow()
                        }
                    },
                    session=session
                )

                actualizado = await coleccion.find_one(
                    {"_id": ObjectId(data.ingredienteId)},
                    session=session
                )

                return ingrediente_serializer(actualizado)

        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
