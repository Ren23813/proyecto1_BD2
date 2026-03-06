from fastapi import APIRouter, HTTPException
from app.db import db
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

coleccion = db["usuarios"]

# MODELOS
class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    roles: List[str]
    activo: bool
    nit: Optional[int] = None

class UsuarioUpdate(BaseModel):
    nombre: Optional[str]
    email: Optional[str]
    roles: Optional[List[str]]
    activo: Optional[bool]
    nit: Optional[int]

# Serializador
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

# CREATE
@router.post("/")
async def crear_usuario(data: UsuarioCreate):
    usuario = {
        **data.model_dump(),
        "fechaRegistro": datetime.utcnow(),
    }
    resultado = await coleccion.insert_one(usuario)
    nuevo = await coleccion.find_one({"_id": resultado.inserted_id})
    return usuario_serializer(nuevo)

# READ all
@router.get("/")
async def obtener_usuarios():
    usuarios = []
    cursor = coleccion.find()
    async for usuario in cursor:
        usuarios.append(usuario_serializer(usuario))
    return usuarios

# READ - {ID}
@router.get("/{id}")
async def obtener_usuario(id: str):
    validar_object_id(id)
    usuario = await coleccion.find_one({"_id": ObjectId(id)})
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario_serializer(usuario)

# UPDATE
@router.put("/{id}")
async def actualizar_usuario(id: str, data: UsuarioUpdate):
    validar_object_id(id)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    resultado = await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario_actualizado = await coleccion.find_one({"_id": ObjectId(id)})
    return usuario_serializer(usuario_actualizado)

# DELETE (soft delete)
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

# AGGREGATION
@router.get("/reportes/top-gastadores")
async def usuarios_top_gastadores(limite: int = 10):
    pipeline = [
        {
            "$group": {
                "_id": "$usuarioId",
                "totalGastado": { "$sum": "$total" },
                "totalOrdenes": { "$sum": 1 }
            }
        },
        { "$sort": { "totalGastado": -1 } },
        { "$limit": limite },
        {
            "$lookup": {
                "from": "usuarios",
                "localField": "_id",
                "foreignField": "_id",
                "as": "usuario"
            }
        },
        { "$unwind": "$usuario" },
        {
            "$project": {
                "_id": 0,
                "usuarioId": {"$toString": "$_id"},
                "nombre": "$usuario.nombre",
                "totalGastado": 1,
                "totalOrdenes": 1
            }
        }
    ]

    cursor = db["ordenes"].aggregate(pipeline)
    return await cursor.to_list(length=limite)

@router.get("/count/activos")
async def contar_usuarios_activos():

    total = await coleccion.count_documents({"activo": True})

    return {
        "usuariosActivos": total
    }
