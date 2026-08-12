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


def test_search_invalid_year_filter():
    response = client.get("/api/search", params={"query": "cancer", "year_from": "abcd"})
    assert response.status_code == 422
