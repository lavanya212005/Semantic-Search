import os
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "BioMed Semantic Search Backend"}


def test_search_empty_query():
    response = client.get("/api/search", params={"query": "   "})
    assert response.status_code == 400
    assert response.json()["detail"] == "Query must not be empty."


@pytest.mark.parametrize("query", ["diabetes kidney disease", "tumor immunotherapy", "breast cancer treatment"])
def test_search_normal_pubmed(query):
    response = client.get("/api/search", params={"query": query, "limit": 3, "page": 1})
    assert response.status_code == 200
    payload = response.json()
    assert payload["query"] == query.strip()
    assert payload["total_results"] >= 0
    assert isinstance(payload["results"], list)
    assert len(payload["results"]) <= 3


def test_search_no_results():
    response = client.get("/api/search", params={"query": "asdfghjklqwertyuiopzxcvbnm", "limit": 5, "page": 1})
    assert response.status_code in (200, 404)


def test_search_year_filter():
    response = client.get("/api/search", params={"query": "cancer", "year_from": 2022, "year_to": 2024, "limit": 3, "page": 1})
    assert response.status_code == 200
    payload = response.json()
    assert payload["query"] == "cancer"
    assert payload["page"] == 1
    assert payload["limit"] == 3


def test_search_article_type_filter():
    response = client.get("/api/search", params={"query": "cancer", "article_types": "Review", "limit": 3, "page": 1})
    assert response.status_code == 200
    payload = response.json()
    assert payload["query"] == "cancer"
    assert isinstance(payload["results"], list)


def test_search_pagination():
    response = client.get("/api/search", params={"query": "diabetes", "limit": 2, "page": 1})
    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 1
    assert payload["limit"] == 2


def test_broad_term_query_not_title_only():
    from app.utils.helpers import build_pubmed_term
    assert build_pubmed_term("cardiac") == "cardiac"
    assert build_pubmed_term("heart disease") == "heart disease"
    assert build_pubmed_term("breast cancer", year_from=2020) == "breast cancer AND 2020:2100[dp]"


def test_heart_attack_query_expands_to_related_pubmed_terms():
    from app.utils.helpers import build_pubmed_term
    term = build_pubmed_term("heart attack")
    assert "heart attack" in term.lower()
    assert "myocardial infarction" in term.lower()
    assert "OR" in term


def test_build_boolean_pubmed_query_from_natural_language():
    from app.utils.helpers import build_boolean_pubmed_query
    query = build_boolean_pubmed_query("medicine that reduces fever in children")
    assert "fever[tiab]" in query.lower()
    assert "pyrexia[tiab]" in query.lower()
    assert "children[tiab]" in query.lower()
    assert "pediatric[tiab]" in query.lower()
    assert "AND" in query.upper()
    assert "OR" in query.upper()


def test_pubmed_esearch_uses_requested_page_and_limit(monkeypatch):
    import httpx
    from app.services.pubmed_service import PubMedService

    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "esearchresult": {
                    "count": "30",
                    "idlist": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
                }
            }

    def fake_get(self, url, params=None, **kwargs):
        captured["url"] = url
        captured["params"] = params
        return FakeResponse()

    monkeypatch.setattr(httpx.Client, "get", fake_get)
    result = PubMedService().search_ids("cardiac", page=2, limit=10)

    assert result["count"] == 30
    assert captured["params"]["term"] == "cardiac"
    assert captured["params"]["retstart"] == 10
    assert captured["params"]["retmax"] == 10


def test_search_uses_full_rerank_pool_before_pagination(monkeypatch):
    import numpy as np
    from app.api import routes
    from app.config import RE_RANK_TOP_K

    calls = {}

    def fake_search_ids(term, page=1, limit=10):
        calls["search_ids"] = {"term": term, "page": page, "limit": limit}
        return {"count": 12, "ids": [str(i) for i in range(1, 12)]}

    monkeypatch.setattr(routes.pubmed_service, "search_ids", fake_search_ids)
    monkeypatch.setattr(routes.pubmed_service, "fetch_articles", lambda ids: [{"pmid": str(i), "title": f"Paper {i}", "abstract": "x", "authors": [], "journal": "J", "mesh_terms": [], "publication_date": "2024", "article_type": "Review", "doi": ""} for i in ids])
    monkeypatch.setattr(routes.embedding_service, "get_query_embedding", lambda query: np.zeros(3))
    monkeypatch.setattr(routes.embedding_service, "get_article_embeddings", lambda articles: np.zeros((len(articles), 3)))
    monkeypatch.setattr(routes.ranking_service, "score_articles", lambda *args, **kwargs: [
        {**article, "semantic_score": 0.9, "keyword_score": 0.1, "relevance_score": 0.9}
        for article in args[2]
    ])

    response = routes.search_pubmed(
        query="diabetes",
        year_from=None,
        year_to=None,
        article_types=None,
        free_full_text=False,
        limit=10,
        page=1,
        semantic_only=False,
    )

    assert calls["search_ids"]["page"] == 1
    assert calls["search_ids"]["limit"] == RE_RANK_TOP_K
    assert response["page"] == 1
    assert response["limit"] == 10
    assert len(response["results"]) == 10


def test_fetch_articles_batches_large_id_list(monkeypatch):
    import httpx
    from app.services.pubmed_service import PubMedService

    calls = []

    class FakeResponse:
        def __init__(self, text: str):
            self.text = text

        def raise_for_status(self):
            return None

    def fake_get(self, url, params=None, **kwargs):
        calls.append(params["id"].split(","))
        return FakeResponse("<PubmedArticleSet></PubmedArticleSet>")

    monkeypatch.setattr(httpx.Client, "get", fake_get)
    service = PubMedService()
    ids = [str(i) for i in range(1, 401)]

    articles = service.fetch_articles(ids, batch_size=200)

    assert len(calls) == 2
    assert len(calls[0]) == 200
    assert len(calls[1]) == 200
    assert articles == []


def test_search_invalid_year_filter():
    response = client.get("/api/search", params={"query": "cancer", "year_from": "abcd"})
    assert response.status_code == 422
