from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import List, Optional

from app.config import DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT
from app.models.schemas import ErrorResponse, SearchResponse
from app.services.embedding_service import EmbeddingService
from app.services.pubmed_service import PubMedService
from app.services.ranking_service import RankingService
from app.utils.helpers import build_pubmed_term, extract_concepts, preprocess_query

router = APIRouter(prefix="/api")

pubmed_service = PubMedService()
embedding_service = EmbeddingService()
ranking_service = RankingService()


@router.get("/health", summary="Health check", response_model=dict)
def health_check() -> dict:
    return {"status": "ok", "service": "BioMed Semantic Search Backend"}


@router.get("/search", summary="Search PubMed articles", response_model=SearchResponse, responses={400: {"model": ErrorResponse}, 503: {"model": ErrorResponse}})
def search_pubmed(
    query: str = Query(..., min_length=1, description="Natural language search query."),
    year_from: Optional[int] = Query(None, description="Filter articles published after or in this year."),
    year_to: Optional[int] = Query(None, description="Filter articles published before or in this year."),
    article_types: Optional[str] = Query(None, description="Comma-separated article types like Review, Clinical Trial, Meta-Analysis."),
    free_full_text: Optional[bool] = Query(False, description="Return only articles with free full text.") ,
    limit: Optional[int] = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT, description="Maximum number of articles returned."),
    page: Optional[int] = Query(DEFAULT_PAGE, ge=1, description="Page number for pagination."),
):
    cleaned_query = preprocess_query(query)
    if not cleaned_query:
        raise HTTPException(status_code=400, detail="Query must not be empty.")

    article_types_list = [t.strip() for t in article_types.split(",") if t.strip()] if article_types else []
    search_term = build_pubmed_term(cleaned_query, article_types_list, year_from, year_to, free_full_text)

    try:
        search_result = pubmed_service.search_ids(search_term, page=page, limit=limit)
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Unable to reach PubMed search service.")

    total_results = search_result.get("count", 0)
    ids = search_result.get("ids", [])
    if not ids:
        raise HTTPException(status_code=404, detail="No PubMed articles found for the given query.")

    try:
        articles = pubmed_service.fetch_articles(ids)
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Unable to fetch PubMed article details.")

    query_terms = [term.strip() for term in cleaned_query.split() if term.strip()]
    query_embedding = embedding_service.embed_texts([cleaned_query])[0]
    article_embeddings = embedding_service.embed_texts([f"{article['title']} {article['abstract']}" for article in articles])
    scored_articles = ranking_service.score_articles(cleaned_query, query_terms, articles, query_embedding, article_embeddings)

    top_mesh_terms = {}
    for article in scored_articles:
        for mesh in article.get("mesh_terms", []):
            top_mesh_terms[mesh] = top_mesh_terms.get(mesh, 0) + 1

    mesh_items = sorted(
        [{"term": term, "count": count} for term, count in top_mesh_terms.items()],
        key=lambda item: item["count"],
        reverse=True,
    )

    results = [
        {
            "pmid": article["pmid"],
            "title": article["title"],
            "abstract": article["abstract"],
            "authors": article["authors"],
            "journal": article["journal"],
            "publication_date": article["publication_date"],
            "article_type": article["article_type"],
            "mesh_terms": article["mesh_terms"],
            "doi": article["doi"],
            "pubmed_url": f"https://pubmed.ncbi.nlm.nih.gov/{article['pmid']}/",
            "semantic_score": article["semantic_score"],
            "keyword_score": article["keyword_score"],
            "relevance_score": article["relevance_score"],
        }
        for article in scored_articles
    ]

    response = {
        "query": cleaned_query,
        "total_results": total_results,
        "page": page,
        "limit": limit,
        "top_mesh_terms": mesh_items[:10],
        "concepts": extract_concepts(cleaned_query),
        "results": results,
    }

    return response
