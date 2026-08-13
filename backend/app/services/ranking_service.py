from typing import List
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.utils.helpers import count_keyword_matches


class RankingService:
    def __init__(self, semantic_weight: float = 0.8, keyword_weight: float = 0.2) -> None:
        self.semantic_weight = semantic_weight
        self.keyword_weight = keyword_weight

    def score_articles(self, query: str, query_terms: List[str], articles: List[dict], query_embedding: np.ndarray, article_embeddings: np.ndarray) -> List[dict]:
        if len(articles) != article_embeddings.shape[0]:
            raise ValueError("Number of articles and embeddings do not match")

        semantic_scores = cosine_similarity(query_embedding.reshape(1, -1), article_embeddings).flatten() if article_embeddings.size else np.zeros(len(articles))
        normalized_semantic = self._normalize_scores(semantic_scores.tolist())

        scored = []
        for i, article in enumerate(articles):
            keyword_matches = 0
            keyword_matches += count_keyword_matches(article.get("title", ""), query_terms)
            keyword_matches += count_keyword_matches(article.get("abstract", ""), query_terms)
            for mesh in article.get("mesh_terms", []):
                keyword_matches += count_keyword_matches(mesh, query_terms)

            keyword_score = min(keyword_matches / max(len(query_terms), 1), 1.0)
            semantic_score = float(normalized_semantic[i]) if len(normalized_semantic) > i else 0.0
            relevance_score = self.semantic_weight * semantic_score + self.keyword_weight * keyword_score

            scored.append({
                **article,
                "semantic_score": round(semantic_score, 4),
                "keyword_score": round(keyword_score, 4),
                "relevance_score": round(relevance_score, 4),
            })

        return sorted(scored, key=lambda item: item["relevance_score"], reverse=True)

    def _normalize_scores(self, scores: List[float]) -> List[float]:
        if not scores:
            return []
        min_score = min(scores)
        max_score = max(scores)
        if max_score - min_score < 1e-7:
            return [0.0 if s <= 0 else 1.0 for s in scores]
        return [(s - min_score) / (max_score - min_score) for s in scores]

    def semantic_rerank(self, query_embedding: np.ndarray, article_embeddings: np.ndarray, articles: List[dict]) -> List[dict]:
        """Rank articles by cosine similarity to the query embedding (semantic-only).

        Returns articles sorted by `semantic_score` (0..1 normalized), and sets
        `relevance_score` equal to the `semantic_score` for compatibility with responses.
        """
        if len(articles) != article_embeddings.shape[0]:
            raise ValueError("Number of articles and embeddings do not match")

        if article_embeddings.size == 0:
            return articles

        semantic_scores = cosine_similarity(query_embedding.reshape(1, -1), article_embeddings).flatten()
        normalized_semantic = self._normalize_scores(semantic_scores.tolist())

        scored = []
        for i, article in enumerate(articles):
            semantic_score = float(normalized_semantic[i]) if len(normalized_semantic) > i else 0.0
            scored.append({
                **article,
                "semantic_score": round(semantic_score, 4),
                "keyword_score": 0.0,
                "relevance_score": round(semantic_score, 4),
            })

        return sorted(scored, key=lambda item: item["relevance_score"], reverse=True)
