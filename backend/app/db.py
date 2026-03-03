import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("DATABASE_URL")

client = AsyncIOMotorClient(MONGO_URL)
db = client.get_database("Proyecto1")