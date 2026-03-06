from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from app.handlers.articulosMenu_handler import router as articulos_router
from app.handlers.ingredientes_handler import router as ingredientes_router
from app.handlers.ordenes_handler import router as ordenes_router
from app.handlers.resenas_handler import router as resenas_router
from app.handlers.restaurant_handler import router as restaurant_router
from app.handlers.usuarios_handler import router as usuarios_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(articulos_router)
app.include_router(ingredientes_router)
app.include_router(ordenes_router)
app.include_router(resenas_router)
app.include_router(restaurant_router)
app.include_router(usuarios_router)
