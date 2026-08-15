from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np
import os
import shelve
from app.config import EMBEDDING_MODEL


class EmbeddingService:
    def __init__(self, model_name: str = EMBEDDING_MODEL, cache_path: str | None = None) -> None:
        self.model = SentenceTransformer(model_name)
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

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.model.get_sentence_embedding_dimension()), dtype=float)
        embeddings = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return embeddings

    def get_query_embedding(self, text: str) -> np.ndarray:
        emb = self.embed_texts([text])
        return emb[0]

    def get_article_embeddings(self, articles: List[dict]) -> np.ndarray:
        # returns embeddings aligned with articles order; uses cache when pmid available
        dim = self.model.get_sentence_embedding_dimension()
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

            title = article.get("title", "") or ""
            abstract = article.get("abstract", "") or ""
            mesh_terms = article.get("mesh_terms", []) or []
            mesh_text = " ".join(str(term) for term in mesh_terms if term)
            article_text = " ".join(part for part in [title, abstract, mesh_text] if part)
            texts_to_compute.append(article_text)
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
