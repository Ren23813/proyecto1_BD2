from fastapi import APIRouter, HTTPException, Query
from app.db import db
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import re

router = APIRouter(prefix="/ingredientes", tags=["Ingredientes"])

coleccion = db["ingredientes"]

STOCK_CRITICO_UMBRAL = 5
PAGE_SIZE_DEFAULT = 50
PAGE_SIZE_MAX = 200


# ── MODELOS ───────────────────────────────────────────────────────────────────

class IngredienteCreate(BaseModel):
    restauranteId: str
    nombre: str
    cantidadDisponible: float
    proveedor: Optional[str] = None
    unidadMedida: Optional[str] = None
    costoUnitario: Optional[float] = None
    fechaCompra: Optional[datetime] = None


class IngredienteUpdate(BaseModel):
    nombre: Optional[str] = None
    proveedor: Optional[str] = None
    unidadMedida: Optional[str] = None
    costoUnitario: Optional[float] = None
    cantidadDisponible: Optional[float] = None


class CompraIngrediente(BaseModel):
    restauranteId: str
    ingredienteId: str
    cantidad: float
    costoUnitario: float


# ── HELPERS ───────────────────────────────────────────────────────────────────

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


def build_sort(orden: str) -> list:
    """Convierte el parámetro de orden del frontend a formato pymongo."""
    mapa = {
        "nombre":        [("nombre", 1)],
        "cantidad-asc":  [("cantidadDisponible", 1)],
        "cantidad-desc": [("cantidadDisponible", -1)],
        "costo-desc":    [("costoUnitario", -1)],
    }
    return mapa.get(orden, [("nombre", 1)])


# ── READ (paginado + filtros) ─────────────────────────────────────────────────

@router.get("/")
async def obtener_ingredientes(
    page: int = Query(1, ge=1),
    page_size: int = Query(PAGE_SIZE_DEFAULT, ge=1, le=PAGE_SIZE_MAX),
    q: Optional[str] = Query(None, description="Búsqueda por nombre o proveedor"),
    restaurante_id: Optional[str] = Query(None),
    orden: str = Query("nombre"),
):
    # Construir filtro
    filtro: dict = {}

    if q:
        # Búsqueda case-insensitive en nombre y proveedor
        regex = {"$regex": re.escape(q.strip()), "$options": "i"}
        filtro["$or"] = [{"nombre": regex}, {"proveedor": regex}]

    if restaurante_id:
        validar_object_id(restaurante_id)
        filtro["restauranteId"] = ObjectId(restaurante_id)

    skip = (page - 1) * page_size

    # Ejecutar conteos y datos en paralelo con gather
    import asyncio

    total_task = coleccion.count_documents(filtro)
    stock_critico_task = coleccion.count_documents(
        {**filtro, "cantidadDisponible": {"$lt": STOCK_CRITICO_UMBRAL}}
    )

    total, stock_critico = await asyncio.gather(total_task, stock_critico_task)

    cursor = coleccion.find(filtro).sort(build_sort(orden)).skip(skip).limit(page_size)

    items = [ingrediente_serializer(doc) async for doc in cursor]

    return {
        "items": items,
        "total": total,
        "stock_critico": stock_critico,
        "page": page,
        "page_size": page_size,
    }


# ── CREATE ────────────────────────────────────────────────────────────────────

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
        "fechaCompra": data.fechaCompra or datetime.utcnow(),
    }

    resultado = await coleccion.insert_one(nuevo)
    creado = await coleccion.find_one({"_id": resultado.inserted_id})
    return ingrediente_serializer(creado)


# ── READ (por ID) ─────────────────────────────────────────────────────────────

@router.get("/{id}")
async def obtener_ingrediente(id: str):
    validar_object_id(id)

    ingrediente = await coleccion.find_one({"_id": ObjectId(id)})
    if not ingrediente:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")

    return ingrediente_serializer(ingrediente)


# ── UPDATE ────────────────────────────────────────────────────────────────────

@router.put("/{id}")
async def actualizar_ingrediente(id: str, data: IngredienteUpdate):
    validar_object_id(id)

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    resultado = await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")

    actualizado = await coleccion.find_one({"_id": ObjectId(id)})
    return ingrediente_serializer(actualizado)


# ── DELETE ────────────────────────────────────────────────────────────────────

@router.delete("/{id}")
async def eliminar_ingrediente(id: str):
    validar_object_id(id)

    resultado = await coleccion.delete_one({"_id": ObjectId(id)})
    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")

    return {"mensaje": "Ingrediente eliminado correctamente"}


# ── REGISTRAR COMPRA ──────────────────────────────────────────────────────────

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
                        "restauranteId": ObjectId(data.restauranteId),
                    },
                    session=session,
                )

                if not ingrediente:
                    raise HTTPException(status_code=404, detail="Ingrediente no encontrado")

                await coleccion.update_one(
                    {"_id": ObjectId(data.ingredienteId)},
                    {
                        "$inc": {"cantidadDisponible": data.cantidad},
                        "$set": {
                            "costoUnitario": data.costoUnitario,
                            "fechaCompra": datetime.utcnow(),
                        },
                    },
                    session=session,
                )

                actualizado = await coleccion.find_one(
                    {"_id": ObjectId(data.ingredienteId)},
                    session=session,
                )
                return ingrediente_serializer(actualizado)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))