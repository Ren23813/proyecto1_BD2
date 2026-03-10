from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from app.db import db, fs
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import re

router = APIRouter(prefix="/ordenes", tags=["Órdenes"])

coleccion = db["ordenes"]


# ── MODELOS ───────────────────────────────────────────────────────────────────

class ItemOrdenCreate(BaseModel):
    articuloId: str
    cantidad: int

class OrdenCreate(BaseModel):
    usuarioId: str
    restauranteId: str
    items: List[ItemOrdenCreate]
    metodoPago: str
    tipoOrden: str

class OrdenUpdate(BaseModel):
    estado: Optional[str] = None
    metodoPago: Optional[str] = None
    tipoOrden: Optional[str] = None


# ── HELPERS ───────────────────────────────────────────────────────────────────

def orden_serializer(orden) -> dict:
    return {
        "id": str(orden["_id"]),
        "usuarioId": str(orden["usuarioId"]),
        "restauranteId": str(orden["restauranteId"]),
        "items": [
            {
                "articuloId": str(item["articuloId"]),
                "cantidad": item["cantidad"],
                "precioUnitario": item["precioUnitario"]
            } for item in orden.get("items", [])
        ],
        "total": orden.get("total", 0.0),
        "estado": orden.get("estado"),
        "metodoPago": orden.get("metodoPago"),
        "tipoOrden": orden.get("tipoOrden"),
        "fechaPedido": orden.get("fechaPedido"),
    }

def validar_object_id(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido")


# ── READ (paginado + filtros) ─────────────────────────────────────────────────

# IMPORTANTE: esta ruta fija debe ir ANTES de /{id}
@router.get("/completar-pendientes", include_in_schema=False)
async def _guard(): pass  # evita colisión con PUT /{id}

@router.get("/reportes/ventas-por-mes")
async def ventas_por_mes():
    pipeline = [
        {
            "$group": {
                "_id": {
                    "año": {"$year": "$fechaPedido"},
                    "mes": {"$month": "$fechaPedido"}
                },
                "totalVentas": {"$sum": "$total"},
                "totalOrdenes": {"$sum": 1}
            }
        },
        {"$sort": {"_id.año": 1, "_id.mes": 1}}
    ]
    cursor = coleccion.aggregate(pipeline)
    resultados = await cursor.to_list(length=100)
    return [
        {
            "año": r["_id"]["año"],
            "mes": r["_id"]["mes"],
            "totalVentas": r["totalVentas"],
            "totalOrdenes": r["totalOrdenes"]
        }
        for r in resultados
    ]


@router.get("/")
async def obtener_ordenes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=200),
    estado: Optional[str] = Query(None),
    restaurante_id: Optional[str] = Query(None),
    usuario_id: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Búsqueda parcial por ID (últimos caracteres)"),
):
    filtro: dict = {}

    if estado:
        filtro["estado"] = estado

    if restaurante_id:
        validar_object_id(restaurante_id)
        filtro["restauranteId"] = ObjectId(restaurante_id)

    if usuario_id:
        validar_object_id(usuario_id)
        filtro["usuarioId"] = ObjectId(usuario_id)

    # Búsqueda por fragmento de ID: buscamos con regex sobre el string del _id
    # Nota: esto requiere $expr + $toString, es costoso sin índice; usarlo con moderación.
    if q and q.strip():
        filtro["$expr"] = {
            "$regexMatch": {
                "input": {"$toString": "$_id"},
                "regex": re.escape(q.strip()),
                "options": "i"
            }
        }

    total = await coleccion.count_documents(filtro)

    cursor = coleccion.find(filtro).sort("fechaPedido", -1).skip(skip).limit(limit)
    items = [orden_serializer(doc) async for doc in cursor]

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ── READ por ID ───────────────────────────────────────────────────────────────

@router.get("/{id}")
async def obtener_orden(id: str):
    validar_object_id(id)
    orden = await coleccion.find_one({"_id": ObjectId(id)})
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return orden_serializer(orden)


# ── CREATE ────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def crear_orden(data: OrdenCreate):
    validar_object_id(data.usuarioId)
    validar_object_id(data.restauranteId)

    if not data.items:
        raise HTTPException(status_code=400, detail="La orden debe contener al menos un artículo")

    usuario = await db["usuarios"].find_one({"_id": ObjectId(data.usuarioId)})
    if not usuario or not usuario.get("activo", True):
        raise HTTPException(status_code=404, detail="Usuario no válido")

    restaurante = await db["restaurantes"].find_one({"_id": ObjectId(data.restauranteId)})
    if not restaurante or not restaurante.get("activo", True):
        raise HTTPException(status_code=404, detail="Restaurante no válido")

    async with await db.client.start_session() as session:
        try:
            async with session.start_transaction():
                total_orden = 0.0
                items_orden = []

                for item in data.items:
                    if not ObjectId.is_valid(item.articuloId):
                        raise HTTPException(400, detail="ID de artículo inválido")
                    if item.cantidad <= 0:
                        raise HTTPException(400, detail="Cantidad inválida")

                    articulo = await db["articulosMenu"].find_one(
                        {"_id": ObjectId(item.articuloId), "restauranteId": ObjectId(data.restauranteId)},
                        session=session
                    )
                    if not articulo:
                        raise HTTPException(status_code=404, detail=f"Artículo {item.articuloId} no encontrado en este restaurante")
                    if not articulo.get("disponible", True):
                        raise HTTPException(status_code=400, detail=f"Artículo {articulo['nombre']} no disponible")

                    precio_unitario = articulo["precio"]
                    total_orden += precio_unitario * item.cantidad
                    items_orden.append({
                        "articuloId": ObjectId(item.articuloId),
                        "cantidad": item.cantidad,
                        "precioUnitario": precio_unitario
                    })

                    for ing in articulo.get("ingredientes", []):
                        id_ing = ing.get("ingredienteId")
                        cant_ingrediente = ing.get("cantidad", 0)
                        if not id_ing:
                            print(f"Alerta: artículo {articulo['nombre']} tiene ingrediente sin ID.")
                            continue

                        cantidad_necesaria = cant_ingrediente * item.cantidad
                        resultado = await db["ingredientes"].update_one(
                            {
                                "_id": ObjectId(id_ing),
                                "restauranteId": ObjectId(data.restauranteId),
                                "cantidadDisponible": {"$gte": cantidad_necesaria}
                            },
                            {"$inc": {"cantidadDisponible": -cantidad_necesaria}},
                            session=session
                        )
                        if resultado.modified_count == 0:
                            raise HTTPException(status_code=400, detail=f"Inventario insuficiente para ingrediente {id_ing}")

                nueva_orden = {
                    "usuarioId": ObjectId(data.usuarioId),
                    "restauranteId": ObjectId(data.restauranteId),
                    "items": items_orden,
                    "total": total_orden,
                    "estado": "Pendiente",
                    "metodoPago": data.metodoPago,
                    "tipoOrden": data.tipoOrden,
                    "fechaPedido": datetime.utcnow()
                }

                resultado_orden = await coleccion.insert_one(nueva_orden, session=session)
                orden_creada = await coleccion.find_one({"_id": resultado_orden.inserted_id}, session=session)
                return orden_serializer(orden_creada)

        except HTTPException:
            raise
        except Exception as e:
            print(f"DEBUG ERROR: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


# ── UPDATE ────────────────────────────────────────────────────────────────────

@router.put("/completar-pendientes")
async def completar_ordenes_pendientes():
    resultado = await coleccion.update_many(
        {"estado": "Pendiente"},
        {"$set": {"estado": "Completada"}}
    )
    return {"mensaje": "Órdenes actualizadas correctamente", "modificadas": resultado.modified_count}


@router.put("/{id}")
async def actualizar_orden(id: str, data: OrdenUpdate):
    validar_object_id(id)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    resultado = await coleccion.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    orden_actualizada = await coleccion.find_one({"_id": ObjectId(id)})
    return orden_serializer(orden_actualizada)


# ── DELETE (soft delete) ──────────────────────────────────────────────────────

@router.delete("/{id}")
async def eliminar_orden(id: str):
    validar_object_id(id)
    resultado = await coleccion.update_one({"_id": ObjectId(id)}, {"$set": {"estado": "Cancelada"}})
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return {"mensaje": "Orden cancelada correctamente"}


# ── GRIDFS ────────────────────────────────────────────────────────────────────

@router.post("/subir-reporte")
async def subir_reporte(file: UploadFile = File(...)):
    contenido = await file.read()
    file_id = await fs.upload_from_stream(
        file.filename, contenido,
        metadata={"content_type": file.content_type}
    )
    return {"file_id": str(file_id), "nombre": file.filename}


@router.get("/archivo/{file_id}")
async def descargar_archivo(file_id: str):
    if not ObjectId.is_valid(file_id):
        raise HTTPException(400, "ID inválido")
    try:
        grid_out = await fs.open_download_stream(ObjectId(file_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    async def iterar():
        while chunk := await grid_out.readchunk():
            yield chunk

    return StreamingResponse(
        iterar(),
        media_type=grid_out.metadata.get("content_type", "application/octet-stream"),
        headers={"Content-Disposition": f"attachment; filename={grid_out.filename}"}
    )