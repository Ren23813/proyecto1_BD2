from fastapi import APIRouter, HTTPException, Query
from app.db import db
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import re

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

coleccion = db["usuarios"]

PAGE_SIZE_DEFAULT = 50
PAGE_SIZE_MAX = 200


# ── MODELOS ───────────────────────────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    roles: List[str]
    activo: bool
    nit: Optional[int] = None


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    roles: Optional[List[str]] = None
    activo: Optional[bool] = None
    nit: Optional[int] = None


# ── HELPERS ───────────────────────────────────────────────────────────────────

def usuario_serializer(usuario) -> dict:
    return {
        "id": str(usuario["_id"]),
        "nombre": usuario["nombre"],
        "email": usuario["email"],
        "roles": usuario["roles"],
        "fechaRegistro": usuario.get("fechaRegistro"),
        "activo": usuario["activo"],
        "nit": usuario.get("nit"),
    }


def validar_object_id(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido")


# ── READ (paginado + filtros) ─────────────────────────────────────────────────

@router.get("/")
async def obtener_usuarios(
    page: int = Query(1, ge=1),
    page_size: int = Query(PAGE_SIZE_DEFAULT, ge=1, le=PAGE_SIZE_MAX),
    q: Optional[str] = Query(None, description="Búsqueda por nombre o email"),
    rol: Optional[str] = Query(None, description="Filtrar por rol exacto"),
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo/inactivo"),
):
    filtro: dict = {}

    if q:
        regex = {"$regex": re.escape(q.strip()), "$options": "i"}
        filtro["$or"] = [{"nombre": regex}, {"email": regex}]

    if rol:
        filtro["roles"] = rol  # MongoDB busca dentro del array automáticamente

    if activo is not None:
        filtro["activo"] = activo

    skip = (page - 1) * page_size

    total, total_activos = await asyncio.gather(
        coleccion.count_documents(filtro),
        coleccion.count_documents({**filtro, "activo": True}),
    )

    cursor = coleccion.find(filtro).sort("nombre", 1).skip(skip).limit(page_size)
    items = [usuario_serializer(doc) async for doc in cursor]

    return {
        "items": items,
        "total": total,
        "activos": total_activos,
        "page": page,
        "page_size": page_size,
    }


# ── CREATE ────────────────────────────────────────────────────────────────────

@router.post("/")
async def crear_usuario(data: UsuarioCreate):
    # Verificar email duplicado
    existente = await coleccion.find_one({"email": data.email})
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email")

    usuario = {
        **data.model_dump(),
        "fechaRegistro": datetime.utcnow(),
    }
    resultado = await coleccion.insert_one(usuario)
    nuevo = await coleccion.find_one({"_id": resultado.inserted_id})
    return usuario_serializer(nuevo)


# ── READ por ID ───────────────────────────────────────────────────────────────

@router.get("/count/activos")
async def contar_usuarios_activos():
    total = await coleccion.count_documents({"activo": True})
    return {"usuariosActivos": total}


@router.get("/reportes/top-gastadores")
async def usuarios_top_gastadores(limite: int = Query(10, ge=1, le=100)):
    pipeline = [
        {
            "$group": {
                "_id": "$usuarioId",
                "totalGastado": {"$sum": "$total"},
                "totalOrdenes": {"$sum": 1},
            }
        },
        {"$sort": {"totalGastado": -1}},
        {"$limit": limite},
        {
            "$lookup": {
                "from": "usuarios",
                "localField": "_id",
                "foreignField": "_id",
                "as": "usuario",
            }
        },
        {"$unwind": "$usuario"},
        {
            "$project": {
                "_id": 0,
                "usuarioId": {"$toString": "$_id"},
                "nombre": "$usuario.nombre",
                "totalGastado": 1,
                "totalOrdenes": 1,
            }
        },
    ]

    cursor = db["ordenes"].aggregate(pipeline)
    return await cursor.to_list(length=limite)


@router.get("/{id}")
async def obtener_usuario(id: str):
    validar_object_id(id)
    usuario = await coleccion.find_one({"_id": ObjectId(id)})
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario_serializer(usuario)


# ── UPDATE ────────────────────────────────────────────────────────────────────

@router.put("/{id}")
async def actualizar_usuario(id: str, data: UsuarioUpdate):
    validar_object_id(id)

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    resultado = await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    actualizado = await coleccion.find_one({"_id": ObjectId(id)})
    return usuario_serializer(actualizado)


# ── DELETE (soft delete) ──────────────────────────────────────────────────────

@router.delete("/{id}")
async def eliminar_usuario(id: str):
    validar_object_id(id)

    resultado = await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"activo": False}}
    )
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {"mensaje": "Usuario desactivado correctamente"}