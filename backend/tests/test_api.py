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


def test_search_invalid_year_filter():
    response = client.get("/api/search", params={"query": "cancer", "year_from": "abcd"})
    assert response.status_code == 422
