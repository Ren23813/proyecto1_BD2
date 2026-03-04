from fastapi import APIRouter, HTTPException
from app.db import db
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/ordenes", tags=["Órdenes"])

coleccion = db["ordenes"]


# MODELOS
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
    estado: Optional[str]
    metodoPago: Optional[str]
    tipoOrden: Optional[str]


# Serializador
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
    

# CREATE
@router.post("/")
async def crear_orden(data: OrdenCreate):
    async with await db.client.start_session() as session:
        async with session.start_transaction():
            total_orden = 0.0
            items_orden = []

            for item in data.items:
                articulo = await db["articulosMenu"].find_one(
                    {"_id": ObjectId(item.articuloId)},
                    session=session
                )
                
                if not articulo:
                    raise HTTPException(status_code=404, detail=f"Artículo {item.articuloId} no encontrado")

                precio_unitario = articulo.get("precio", 0.0)
                total_orden += precio_unitario * item.cantidad

                items_orden.append({
                    "articuloId": ObjectId(item.articuloId),
                    "cantidad": item.cantidad,
                    "precioUnitario": precio_unitario
                })

                # Descontar ingredientes del inventario
                for ing in articulo.get("ingredientes", []):
                    resultado = await db["ingredientes"].update_one(
                        {
                            "_id": ObjectId(ing["ingredienteId"]),
                            "cantidadDisponible": {"$gte": ing["cantidad"] * item.cantidad}
                        },
                        {
                            "$inc": {
                                "cantidadDisponible": -(ing["cantidad"] * item.cantidad)
                            }
                        },
                        session=session
                    )
                    
                    if resultado.modified_count == 0:
                        raise HTTPException(status_code=400, detail="Inventario insuficiente para crear la orden")

            nueva_orden = {
                "usuarioId": ObjectId(data.usuarioId),
                "restauranteId": ObjectId(data.restauranteId),
                "items": items_orden,
                "total": total_orden,
                "estado": "Completada",
                "metodoPago": data.metodoPago,
                "tipoOrden": data.tipoOrden,
                "fechaPedido": datetime.utcnow()
            }

            resultado_orden = await coleccion.insert_one(nueva_orden, session=session)
            orden_creada = await coleccion.find_one({"_id": resultado_orden.inserted_id}, session=session)
            
            return orden_serializer(orden_creada)


# READ all
@router.get("/")
async def obtener_ordenes():
    ordenes = []
    cursor = coleccion.find()

    async for orden in cursor:
        ordenes.append(orden_serializer(orden))

    return ordenes


# READ - {ID}
@router.get("/{id}")
async def obtener_orden(id: str):
    validar_object_id(id)
    orden = await coleccion.find_one({"_id": ObjectId(id)})

    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    return orden_serializer(orden)


# UPDATE
@router.put("/{id}")
async def actualizar_orden(id: str, data: OrdenUpdate):
    validar_object_id(id)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    resultado = await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    orden_actualizada = await coleccion.find_one({"_id": ObjectId(id)})

    return orden_serializer(orden_actualizada)


# DELETE (soft delete)
@router.delete("/{id}")
async def eliminar_orden(id: str):
    validar_object_id(id)

    resultado = await coleccion.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"estado": "Cancelada"}}
    )

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    return {"mensaje": "Orden cancelada correctamente"}


# AGGREGATION
@router.get("/reportes/ventas-por-mes")
async def ventas_por_mes():
    pipeline = [
        {
            "$group": {
                "_id": {
                    "año": { "$year": "$fechaPedido" },
                    "mes": { "$month": "$fechaPedido" }
                },
                "totalVentas": { "$sum": "$total" },
                "totalOrdenes": { "$sum": 1 }
            }
        },
        { "$sort": { "_id.año": 1, "_id.mes": 1 } }
    ]

    cursor = coleccion.aggregate(pipeline)
    resultados = await cursor.to_list(length=100)
    
    reporte = []
    for r in resultados:
        reporte.append({
            "año": r["_id"]["año"],
            "mes": r["_id"]["mes"],
            "totalVentas": r["totalVentas"],
            "totalOrdenes": r["totalOrdenes"]
        })
        
    return reporte