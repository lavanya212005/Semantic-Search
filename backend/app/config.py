import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

PUBMED_BASE_URL = os.getenv("PUBMED_BASE_URL", "https://eutils.ncbi.nlm.nih.gov/entrez/eutils")
PUBMED_EMAIL = os.getenv("PUBMED_EMAIL", "")
PUBMED_API_KEY = os.getenv("PUBMED_API_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",") if origin.strip()]
DEFAULT_PAGE = int(os.getenv("DEFAULT_PAGE", "1"))
DEFAULT_LIMIT = int(os.getenv("DEFAULT_LIMIT", "10"))
MAX_LIMIT = int(os.getenv("MAX_LIMIT", "50"))
