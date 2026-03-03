from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from app.handlers.restaurant_handler import router as restaurant_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(restaurant_router)