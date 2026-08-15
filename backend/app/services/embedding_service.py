from sentence_transformers import SentenceTransformer
from typing import List, Optional
import numpy as np
import os
import shelve
import logging
import hashlib

from app.config import EMBEDDING_MODEL

logger = logging.getLogger(__name__)

# Default embedding dimension when model is unavailable (sparse hash-based fallback)
DEFAULT_EMBEDDING_DIM = 384


class EmbeddingService:
    def __init__(self, model_name: str = EMBEDDING_MODEL, cache_path: str | None = None) -> None:
        self.model_name = model_name
        self.model: Optional[SentenceTransformer] = None
        self.model_load_failed = False
        self.embedding_dim = DEFAULT_EMBEDDING_DIM
        
        # simple on-disk cache using shelve; keys are pmid strings, values are numpy arrays
        data_dir = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
        os.makedirs(data_dir, exist_ok=True)
        self.cache_path = cache_path or os.path.join(data_dir, "embeddings_cache.db")
        # open shelve lazily
        self._cache = None

    @property
    def cache(self):
        if self._cache is None:
            # writeback=False to avoid unnecessary memory usage
            self._cache = shelve.open(self.cache_path, writeback=False)
        return self._cache

    def close(self):
        if self._cache is not None:
            try:
                self._cache.close()
            except Exception:
                pass

    def _ensure_model_loaded(self) -> bool:
        """Load model on first use. Returns True if successful, False if fallback in use.
        
        This defers model loading to first use, allowing the service to initialize
        even if the model isn't available yet. If loading fails, falls back to
        sparse hash-based embeddings with a warning.
        """
        if self.model is not None:
            return True  # Already loaded
        
        if self.model_load_failed:
            return False  # Failed before, stay on fallback
        
        try:
            logger.info("Loading embedding model: %s", self.model_name)
            self.model = SentenceTransformer(self.model_name)
            self.embedding_dim = self.model.get_sentence_embedding_dimension()
            logger.info("Embedding model loaded successfully. Dimension: %d", self.embedding_dim)
            return True
        except Exception as e:
            logger.warning(
                "Failed to load embedding model '%s': %s. Falling back to sparse embeddings. "
                "Search quality will be degraded until model is available.",
                self.model_name, str(e)
            )
            self.model_load_failed = True
            self.embedding_dim = DEFAULT_EMBEDDING_DIM
            return False

    def _embed_texts_with_model(self, texts: List[str]) -> np.ndarray:
        """Embed texts using the loaded sentence transformer model."""
        if not texts:
            return np.zeros((0, self.embedding_dim), dtype=float)
        embeddings = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return embeddings

    def _embed_texts_fallback(self, texts: List[str]) -> np.ndarray:
        """Fallback sparse embedding using text hash when model is unavailable.
        
        Creates reproducible sparse embeddings from text hashes. Not semantically
        meaningful, but allows ranking and search to continue with degraded quality.
        """
        if not texts:
            return np.zeros((0, self.embedding_dim), dtype=float)
        
        embeddings = np.zeros((len(texts), self.embedding_dim), dtype=float)
        for i, text in enumerate(texts):
            # Create sparse vector from hash of text
            hash_bytes = hashlib.sha256(text.encode()).digest()
            # Use hash bytes to seed positions in sparse vector
            for j, byte in enumerate(hash_bytes):
                pos = (byte * j) % self.embedding_dim
                embeddings[i, pos] = (byte / 255.0) - 0.5  # Normalize to ~[-0.5, 0.5]
            
            # Normalize to unit length
            norm = np.linalg.norm(embeddings[i])
            if norm > 0:
                embeddings[i] /= norm
        
        return embeddings

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """Embed texts using model if available, else use fallback sparse embeddings."""
        if self._ensure_model_loaded():
            return self._embed_texts_with_model(texts)
        else:
            return self._embed_texts_fallback(texts)

    def get_query_embedding(self, text: str) -> np.ndarray:
        emb = self.embed_texts([text])
        return emb[0]

    def get_article_embeddings(self, articles: List[dict]) -> np.ndarray:
        # returns embeddings aligned with articles order; uses cache when pmid available
        dim = self.embedding_dim
        n = len(articles)
        if n == 0:
            return np.zeros((0, dim), dtype=float)

        embeddings = np.zeros((n, dim), dtype=float)
        texts_to_compute = []
        idxs_to_compute = []
        pmids_to_store = []

        for i, article in enumerate(articles):
            pmid = str(article.get("pmid", "")) if article.get("pmid") is not None else ""
            if pmid and pmid in self.cache:
                try:
                    embeddings[i] = self.cache[pmid]
                    continue
                except Exception:
                    # fallthrough to compute
                    pass

            # need to compute
            texts_to_compute.append(f"{article.get('title','')} {article.get('abstract','')}")
            idxs_to_compute.append(i)
            pmids_to_store.append(pmid)

        if texts_to_compute:
            computed = self.embed_texts(texts_to_compute)
            for j, idx in enumerate(idxs_to_compute):
                embeddings[idx] = computed[j]
                pmid = pmids_to_store[j]
                if pmid:
                    try:
                        # store numpy array; shelve will pickle it
                        self.cache[pmid] = computed[j]
                    except Exception:
                        pass

        return embeddings
