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
DEFAULT_LIMIT = int(os.getenv("DEFAULT_LIMIT", "20"))
MAX_LIMIT = int(os.getenv("MAX_LIMIT", "200"))
# Keep the rerank pool moderate to stay responsive while still allowing the
# backend to rank a meaningful set before slicing for the current page.
RE_RANK_TOP_K = int(os.getenv("RE_RANK_TOP_K", "200"))
# Minimum relevance score threshold (0.0-1.0) - articles below this are filtered out
# Lowered to 0.0 - show ALL ranked articles (no filtering by score)
# The ranking itself provides the quality ordering
MIN_RELEVANCE_THRESHOLD = float(os.getenv("MIN_RELEVANCE_THRESHOLD", "0.0"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
USE_HYBRID_RETRIEVAL = os.getenv("USE_HYBRID_RETRIEVAL", "true").lower() in ("1", "true", "yes")
