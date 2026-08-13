from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import ALLOWED_ORIGINS
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="BioMed Semantic Search Backend",
    description="FastAPI backend for PubMed semantic search prototype.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
