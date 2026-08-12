# BioMed Semantic Search Backend

A FastAPI backend for a PubMed semantic search prototype.

## Overview

This backend accepts natural-language medical research queries, searches PubMed using the official E-utilities API, retrieves article metadata, ranks results using semantic similarity and keyword matching, and returns JSON ready for a React frontend.

## Architecture

- `app/main.py` – FastAPI application entry point
- `app/api/routes.py` – API endpoints
- `app/services/pubmed_service.py` – PubMed ESearch and EFetch integration
- `app/services/embedding_service.py` – Sentence embeddings with `sentence-transformers`
- `app/services/ranking_service.py` – Hybrid relevance scoring and ranking
- `app/models/schemas.py` – request/response models
- `app/config.py` – environment-based configuration
- `app/utils/helpers.py` – query preprocessing and concept extraction

## Technologies

- Python 3.11+
- FastAPI
- Uvicorn
- httpx
- Pydantic
- python-dotenv
- sentence-transformers
- NumPy
- scikit-learn

## Setup

1. Create a Python virtual environment

```powershell
cd "c:\Users\LAVANYA\Semantic Search\backend"
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies

```powershell
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and update values

```powershell
copy .env.example .env
```

4. Run the backend

```powershell
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### Health

`GET /api/health`

Response:

```json
{
  "status": "ok",
  "service": "BioMed Semantic Search Backend"
}
```

### Search

`GET /api/search`

Query parameters:

- `query` (required)
- `year_from` (optional)
- `year_to` (optional)
- `article_types` (optional, comma-separated)
- `free_full_text` (optional boolean)
- `limit` (optional integer, default 10)
- `page` (optional integer, default 1)

Example:

```http
GET /api/search?query=effects%20of%20diabetes%20on%20kidney%20function&year_from=2020&limit=10&page=1
```

## Example Response

```json
{
  "query": "effects of diabetes on kidney function",
  "total_results": 256,
  "page": 1,
  "limit": 10,
  "top_mesh_terms": [
    {"term": "Diabetes Mellitus", "count": 12},
    {"term": "Kidney Diseases", "count": 9}
  ],
  "concepts": [
    "diabetes",
    "kidney function"
  ],
  "results": [
    {
      "pmid": "12345678",
      "title": "Impact of diabetes on kidney function",
      "abstract": "Diabetes is a leading cause of chronic kidney disease...",
      "authors": ["A. Author", "B. Author"],
      "journal": "Journal of Medicine",
      "publication_date": "2024",
      "article_type": "Review",
      "mesh_terms": ["Diabetes Mellitus", "Kidney Diseases"],
      "doi": "10.1001/example",
      "pubmed_url": "https://pubmed.ncbi.nlm.nih.gov/12345678/",
      "semantic_score": 0.92,
      "keyword_score": 0.24,
      "relevance_score": 0.80
    }
  ]
}
```

## Semantic Ranking

The backend uses `sentence-transformers/all-MiniLM-L6-v2` to compute sentence embeddings for the user query and article title + abstract. It combines:

- semantic score (cosine similarity)
- keyword score (query terms in title, abstract, MeSH terms)

with a hybrid weight: `0.8 * semantic + 0.2 * keyword`.

## Notes

- PubMed API keys are optional but supported via `.env`
- CORS is configured for local frontend origins
- Automatic docs available at `/docs` and `/redoc`
