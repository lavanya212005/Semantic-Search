from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import httpx
import logging
from datetime import datetime, timedelta

from app.config import (
    DEFAULT_LIMIT,
    DEFAULT_PAGE,
    MAX_LIMIT,
    RE_RANK_TOP_K,
    MIN_RELEVANCE_THRESHOLD,
)

from app.models.schemas import (
    ErrorResponse,
    SearchResponse,
    AnalyticsVisitRequest,
    AnalyticsSearchRequest,
    AnalyticsResponse,
    AnalyticsStatsResponse,
)

from app.services.embedding_service import EmbeddingService
from app.services.pubmed_service import PubMedService
from app.services.ranking_service import RankingService
from app.services.analytics_service import AnalyticsService

from app.utils.helpers import (
    build_pubmed_term,
    extract_concepts,
    preprocess_query,
    truncate_text,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


# ============================================================================
# SERVICES
# ============================================================================

pubmed_service = PubMedService()
embedding_service = EmbeddingService()
ranking_service = RankingService()
analytics_service = AnalyticsService()


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get(
    "/health",
    summary="Health check",
    response_model=dict
)
def health_check() -> dict:
    return {
        "status": "ok",
        "service": "BioMed Semantic Search Backend"
    }


# ============================================================================
# ANALYTICS ENDPOINTS
# Anonymous Usage Tracking
# ============================================================================


@router.post(
    "/analytics/visit",
    summary="Record anonymous visitor session",
    response_model=AnalyticsResponse
)
def analytics_visit(
    request: AnalyticsVisitRequest
) -> AnalyticsResponse:
    """
    Record an anonymous visitor session.

    The visitor is identified using an anonymous UUID
    stored in browser localStorage.

    Analytics failures never break the frontend.
    """

    try:
        success = analytics_service.record_visit(
            request.visitor_id
        )

        if success:
            return AnalyticsResponse(
                success=True,
                message="Visit recorded"
            )

        logger.warning(
            "Failed to record visit for visitor %s",
            request.visitor_id
        )

        return AnalyticsResponse(
            success=False,
            message="Visit not recorded"
        )

    except Exception as e:

        logger.error(
            "Error in /analytics/visit endpoint: %s",
            e
        )

        return AnalyticsResponse(
            success=False,
            message="Recording service temporarily unavailable"
        )


# ============================================================================
# ANALYTICS SEARCH
# ============================================================================

@router.post(
    "/analytics/search",
    summary="Record anonymous search event",
    response_model=AnalyticsResponse
)
def analytics_search(
    request: AnalyticsSearchRequest
) -> AnalyticsResponse:
    """
    Record an anonymous search event.

    Stores:
    - Anonymous visitor ID
    - Search query
    - Number of results returned
    - Total PubMed results
    - Search mode
    """

    try:

        success = analytics_service.record_search(
            request.visitor_id,
            request.search_query,
            request.result_count,
            request.total_results,
            request.search_mode
        )

        if success:
            return AnalyticsResponse(
                success=True,
                message="Search recorded"
            )

        logger.warning(
            "Failed to record search for visitor %s",
            request.visitor_id
        )

        return AnalyticsResponse(
            success=False,
            message="Search not recorded"
        )

    except Exception as e:

        logger.error(
            "Error in /analytics/search endpoint: %s",
            e
        )

        return AnalyticsResponse(
            success=False,
            message="Recording service temporarily unavailable"
        )


# ============================================================================
# ANALYTICS STATISTICS
# ============================================================================

@router.get(
    "/analytics/stats",
    summary="Get analytics statistics",
    response_model=AnalyticsStatsResponse
)
def analytics_stats() -> AnalyticsStatsResponse:
    """
    Return aggregated anonymous usage statistics.
    """

    try:

        stats = analytics_service.get_statistics()

        return AnalyticsStatsResponse(
            total_unique_visitors=stats.get(
                "total_unique_visitors",
                0
            ),
            today_unique_visitors=stats.get(
                "today_unique_visitors",
                0
            ),
            week_unique_visitors=stats.get(
                "week_unique_visitors",
                0
            ),
            total_searches=stats.get(
                "total_searches",
                0
            ),
            today_searches=stats.get(
                "today_searches",
                0
            ),
            week_searches=stats.get(
                "week_searches",
                0
            ),
            returning_visitors=stats.get(
                "returning_visitors",
                0
            ),
            recent_searches=stats.get(
                "recent_searches",
                []
            ),
            timestamp=stats.get(
                "timestamp",
                ""
            )
        )

    except Exception as e:

        logger.error(
            "Error in /analytics/stats endpoint: %s",
            e
        )

        return AnalyticsStatsResponse(
            total_unique_visitors=0,
            today_unique_visitors=0,
            week_unique_visitors=0,
            total_searches=0,
            today_searches=0,
            week_searches=0,
            returning_visitors=0,
            recent_searches=[],
            timestamp=""
        )


# ============================================================================
# ANALYTICS VISITORS
# ============================================================================

@router.get(
    "/analytics/visitors",
    summary="Get all visitors in table format"
)
def analytics_visitors() -> dict:
    """
    Return visitor activity information.

    Includes:
    - Visitor ID
    - First visit
    - Last visit
    - Visit count
    - Total searches
    """

    try:

        db = analytics_service.db

        with db.get_connection() as conn:

            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT
                    v.visitor_id,
                    v.first_visit_at,
                    v.last_visit_at,
                    v.visit_count,
                    COUNT(DISTINCT s.id) AS total_searches
                FROM visits v
                LEFT JOIN searches s
                    ON v.visitor_id = s.visitor_id
                GROUP BY v.visitor_id
                ORDER BY v.last_visit_at DESC
                """
            )

            rows = cursor.fetchall()

            visitors = []

            for row in rows:

                visitors.append(
                    {
                        "visitor_id": row["visitor_id"],
                        "first_visit": row["first_visit_at"],
                        "last_visit": row["last_visit_at"],
                        "visit_count": row["visit_count"],
                        "total_searches": row["total_searches"]
                    }
                )

            return {
                "success": True,
                "count": len(visitors),
                "visitors": visitors
            }

    except Exception as e:

        logger.error(
            "Error in /analytics/visitors endpoint: %s",
            e
        )

        return {
            "success": False,
            "count": 0,
            "visitors": [],
            "error": str(e)
        }


# ============================================================================
# ANALYTICS SEARCH HISTORY
# ============================================================================

@router.get(
    "/analytics/searches",
    summary="Get all searches in table format"
)
def analytics_searches(
    limit: int = Query(
        100,
        ge=1,
        le=1000
    ),
    days: int = Query(
        7,
        ge=1
    )
) -> dict:
    """
    Return recent search history.

    Args:
        limit:
            Maximum number of searches.

        days:
            Only return searches from the last N days.
    """

    try:

        db = analytics_service.db

        with db.get_connection() as conn:

            cursor = conn.cursor()

            cutoff = (
                datetime.now()
                - timedelta(days=days)
            )

            cursor.execute(
                """
                SELECT
                    s.id,
                    s.visitor_id,
                    s.search_query,
                    s.result_count,
                    s.total_results,
                    s.search_mode,
                    s.timestamp
                FROM searches s
                WHERE s.timestamp >= ?
                ORDER BY s.timestamp DESC
                LIMIT ?
                """,
                (
                    cutoff,
                    limit
                )
            )

            rows = cursor.fetchall()

            searches = []

            for row in rows:

                searches.append(
                    {
                        "id": row["id"],
                        "visitor_id": row["visitor_id"],
                        "search_query": row["search_query"],
                        "result_count": row["result_count"],
                        "total_results": row["total_results"],
                        "search_mode": row["search_mode"],
                        "timestamp": row["timestamp"]
                    }
                )

            return {
                "success": True,
                "count": len(searches),
                "limit_days": days,
                "searches": searches
            }

    except Exception as e:

        logger.error(
            "Error in /analytics/searches endpoint: %s",
            e
        )

        return {
            "success": False,
            "count": 0,
            "searches": [],
            "error": str(e)
        }


# ============================================================================
# ANALYTICS SPECIFIC VISITOR
# ============================================================================

@router.get(
    "/analytics/visitor/{visitor_id}",
    summary="Get details for specific visitor"
)
def analytics_visitor_details(
    visitor_id: str
) -> dict:
    """
    Return complete activity information
    for a specific anonymous visitor.
    """

    try:

        db = analytics_service.db

        with db.get_connection() as conn:

            cursor = conn.cursor()

            # ------------------------------------------------------------
            # Visitor information
            # ------------------------------------------------------------

            cursor.execute(
                """
                SELECT *
                FROM visits
                WHERE visitor_id = ?
                """,
                (visitor_id,)
            )

            visit_row = cursor.fetchone()

            if not visit_row:

                return {
                    "success": False,
                    "error": (
                        f"Visitor {visitor_id} not found"
                    )
                }

            # ------------------------------------------------------------
            # Search history
            # ------------------------------------------------------------

            cursor.execute(
                """
                SELECT
                    id,
                    search_query,
                    result_count,
                    total_results,
                    search_mode,
                    timestamp
                FROM searches
                WHERE visitor_id = ?
                ORDER BY timestamp DESC
                """,
                (visitor_id,)
            )

            searches = []

            for row in cursor.fetchall():

                searches.append(
                    {
                        "id": row["id"],
                        "search_query": row["search_query"],
                        "result_count": row["result_count"],
                        "total_results": row["total_results"],
                        "search_mode": row["search_mode"],
                        "timestamp": row["timestamp"]
                    }
                )

            return {
                "success": True,
                "visitor": {
                    "visitor_id": visit_row["visitor_id"],
                    "first_visit": visit_row["first_visit_at"],
                    "last_visit": visit_row["last_visit_at"],
                    "visit_count": visit_row["visit_count"],
                    "total_searches": len(searches)
                },
                "searches": searches
            }

    except Exception as e:

        logger.error(
            "Error in /analytics/visitor endpoint: %s",
            e
        )

        return {
            "success": False,
            "error": str(e)
        }


# ============================================================================
# PUBMED SEARCH
# CONTINUOUS GLOBAL RANKING + PAGINATION
# ============================================================================

@router.get(
    "/search",
    summary="Search PubMed articles",
    response_model=SearchResponse,
    responses={
        400: {"model": ErrorResponse},
        503: {"model": ErrorResponse}
    }
)
def search_pubmed(
    query: str = Query(
        ...,
        min_length=1,
        description="Natural language search query."
    ),

    year_from: Optional[int] = Query(
        None,
        description="Filter articles published after or in this year."
    ),

    year_to: Optional[int] = Query(
        None,
        description="Filter articles published before or in this year."
    ),

    article_types: Optional[str] = Query(
        None,
        description=(
            "Comma-separated article types like "
            "Review, Clinical Trial, Meta-Analysis."
        )
    ),

    free_full_text: Optional[bool] = Query(
        False,
        description="Return only articles with free full text."
    ),

    limit: Optional[int] = Query(
        DEFAULT_LIMIT,
        ge=1,
        le=MAX_LIMIT,
        description="Maximum number of articles returned."
    ),

    page: Optional[int] = Query(
        DEFAULT_PAGE,
        ge=1,
        description="Page number for pagination."
    ),

    semantic_only: Optional[bool] = Query(
        False,
        description=(
            "If true, rank results by semantic similarity only."
        )
    ),

    visitor_id: Optional[str] = Query(
        None,
        description=(
            "Anonymous visitor ID for analytics tracking."
        )
    ),
):

    # ========================================================================
    # STEP 1: PREPROCESS QUERY
    # ========================================================================

    cleaned_query = preprocess_query(query)

    if not cleaned_query:

        raise HTTPException(
            status_code=400,
            detail="Query must not be empty."
        )

    # ========================================================================
    # STEP 2: ARTICLE TYPE FILTERS
    # ========================================================================

    article_types_list = (
        [
            t.strip()
            for t in article_types.split(",")
            if t.strip()
        ]
        if article_types
        else []
    )

    # ========================================================================
    # STEP 3: BUILD PUBMED QUERY
    # ========================================================================

    search_term = build_pubmed_term(
        cleaned_query,
        article_types_list,
        year_from,
        year_to,
        free_full_text
    )

    logger.info(
        "Search request: original_user_query='%s' "
        "final_pubmed_query='%s'",
        query,
        search_term
    )

    # ========================================================================
    # STEP 4: RETRIEVE ONE COMMON CANDIDATE POOL
    #
    # IMPORTANT:
    #
    # We ALWAYS request page=1 here.
    #
    # We do NOT request:
    #
    #     page=page
    #
    # because that would cause every page to be ranked independently.
    #
    # Instead:
    #
    # PubMed candidates
    #       ↓
    # Global ranking
    #       ↓
    # Filtering
    #       ↓
    # Pagination
    #
    # ========================================================================

    candidate_pool_limit = RE_RANK_TOP_K

    try:

        search_result = pubmed_service.search_ids(
            search_term,
            page=1,
            limit=candidate_pool_limit
        )

    except httpx.HTTPError:

        logger.exception(
            "ESearch failed for query=%s",
            search_term
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to connect to PubMed. "
                "Please try again."
            )
        )

    # ========================================================================
    # STEP 5: PUBMED RESULT COUNT
    # ========================================================================

    total_results = search_result.get(
        "count",
        0
    )

    ids = search_result.get(
        "ids",
        []
    )

    if total_results == 0 or not ids:

        logger.info(
            "PubMed returned zero results for query='%s' "
            "(count=%s, ids=%s)",
            search_term,
            total_results,
            len(ids)
        )

        raise HTTPException(
            status_code=404,
            detail=(
                "No PubMed articles found "
                "for this query."
            )
        )

    # ========================================================================
    # STEP 6: LIMIT CANDIDATE IDS
    # ========================================================================

    candidate_ids = ids[
        :min(
            len(ids),
            RE_RANK_TOP_K
        )
    ]

    # ========================================================================
    # STEP 7: FETCH ARTICLES
    # ========================================================================

    try:

        articles = pubmed_service.fetch_articles(
            candidate_ids
        )

        logger.info(
            "Fetched %s articles for %s PMIDs "
            "from query='%s'",
            len(articles),
            len(candidate_ids),
            search_term
        )

    except httpx.HTTPError:

        logger.exception(
            "EFetch failed for pmids=%s "
            "on query=%s",
            candidate_ids,
            search_term
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to connect to PubMed. "
                "Please try again."
            )
        )

    if not articles:

        logger.warning(
            "PubMed returned %s total results and %s PMIDs, "
            "but EFetch produced zero parsed articles.",
            total_results,
            len(candidate_ids)
        )

        raise HTTPException(
            status_code=404,
            detail=(
                "Unable to retrieve PubMed "
                "articles."
            )
        )

    # ========================================================================
    # STEP 8: CREATE QUERY EMBEDDING
    # ========================================================================

    query_terms = [
        term.strip()
        for term in cleaned_query.split()
        if term.strip()
    ]

    query_embedding = (
        embedding_service.get_query_embedding(
            cleaned_query
        )
    )

    article_embeddings = (
        embedding_service.get_article_embeddings(
            articles
        )
    )

    # ========================================================================
    # STEP 9: GLOBAL RANKING
    #
    # ALL candidate articles are scored BEFORE pagination.
    #
    # ========================================================================

    if semantic_only:

        scored_articles = (
            ranking_service.semantic_rerank(
                query_embedding,
                article_embeddings,
                articles
            )
        )

    else:

        scored_articles = (
            ranking_service.score_articles(
                cleaned_query,
                query_terms,
                articles,
                query_embedding,
                article_embeddings
            )
        )

    # ========================================================================
    # STEP 10: EXPLICIT GLOBAL SORT
    #
    # Ensure highest relevance_score comes first.
    # ========================================================================

    scored_articles = sorted(
        scored_articles,
        key=lambda article: article.get(
            "relevance_score",
            0.0
        ),
        reverse=True
    )

    # ========================================================================
    # STEP 11: FILTER LOW RELEVANCE ARTICLES
    # ========================================================================

    filtered_articles = [
        article
        for article in scored_articles
        if article.get(
            "relevance_score",
            0.0
        ) >= MIN_RELEVANCE_THRESHOLD
    ]

    # ========================================================================
    # STEP 12: FALLBACK
    # ========================================================================

    if not filtered_articles:

        if scored_articles:

            filtered_articles = [
                scored_articles[0]
            ]

        else:

            raise HTTPException(
                status_code=404,
                detail=(
                    "No articles with meaningful "
                    "relevance scores found."
                )
            )

    # ========================================================================
    # STEP 13: SORT AGAIN AFTER FILTERING
    #
    # Guarantees continuous ranking.
    # ========================================================================

    filtered_articles = sorted(
        filtered_articles,
        key=lambda article: article.get(
            "relevance_score",
            0.0
        ),
        reverse=True
    )

    # ========================================================================
    # STEP 14: CONTINUOUS PAGINATION
    #
    # IMPORTANT:
    #
    # Pagination happens AFTER global ranking.
    #
    # Page 1:
    #   rank 1 - 10
    #
    # Page 2:
    #   rank 11 - 20
    #
    # Page 3:
    #   rank 21 - 30
    #
    # ========================================================================

    offset = (
        (page - 1)
        * limit
    )

    paginated_articles = filtered_articles[
        offset:
        offset + limit
    ]

    logger.info(
        "Continuous pagination: "
        "page=%s, limit=%s, offset=%s, "
        "ranked_articles=%s, returned=%s",
        page,
        limit,
        offset,
        len(filtered_articles),
        len(paginated_articles)
    )

    # ========================================================================
    # STEP 15: MESH TERMS
    # ========================================================================

    top_mesh_terms = {}

    for article in paginated_articles:

        for mesh in article.get(
            "mesh_terms",
            []
        ):

            top_mesh_terms[mesh] = (
                top_mesh_terms.get(
                    mesh,
                    0
                ) + 1
            )

    mesh_items = sorted(
        [
            {
                "term": term,
                "count": count
            }
            for term, count
            in top_mesh_terms.items()
        ],
        key=lambda item: item["count"],
        reverse=True
    )

    # ========================================================================
    # STEP 16: FORMAT RESULTS
    # ========================================================================

    results = []

    for article in paginated_articles:

        results.append(
            {
                "pmid": article.get(
                    "pmid",
                    ""
                ),

                "title": article.get(
                    "title",
                    ""
                ),

                "abstract": truncate_text(
                    article.get(
                        "abstract",
                        ""
                    ),
                    300
                ),

                "authors": article.get(
                    "authors",
                    []
                ),

                "journal": article.get(
                    "journal",
                    ""
                ),

                "publication_date": article.get(
                    "publication_date",
                    ""
                ),

                "article_type": article.get(
                    "article_type",
                    ""
                ),

                "mesh_terms": article.get(
                    "mesh_terms",
                    []
                ),

                "doi": article.get(
                    "doi",
                    ""
                ),

                "pubmed_url": (
                    "https://pubmed.ncbi.nlm.nih.gov/"
                    f"{article.get('pmid', '')}/"
                ),

                "semantic_score": article.get(
                    "semantic_score",
                    0.0
                ),

                "keyword_score": article.get(
                    "keyword_score",
                    0.0
                ),

                "relevance_score": article.get(
                    "relevance_score",
                    0.0
                ),
            }
        )

    # ========================================================================
    # STEP 17: TOTAL MEANINGFUL RESULTS
    # ========================================================================

    total_meaningful_results = len(
        filtered_articles
    )

    # ========================================================================
    # STEP 18: RESPONSE
    # ========================================================================

    response = {
        "query": cleaned_query,

        # Total number of results available in PubMed
        "total_results": total_results,

        # Number of results surviving relevance filtering
        "total_meaningful_results": (
            total_meaningful_results
        ),

        "page": page,

        "limit": limit,

        "top_mesh_terms": (
            mesh_items[:10]
        ),

        "concepts": extract_concepts(
            cleaned_query
        ),

        "results": results,
    }

    # ========================================================================
    # STEP 19: ANALYTICS
    # ========================================================================

    if visitor_id:

        try:

            analytics_service.record_search(
                visitor_id=visitor_id,
                search_query=cleaned_query,
                result_count=len(results),
                total_results=total_results,
                search_mode=(
                    "semantic_only"
                    if semantic_only
                    else "hybrid"
                )
            )

        except Exception as e:

            logger.error(
                "Failed to record analytics "
                "for visitor %s: %s",
                visitor_id,
                e
            )

            # Never allow analytics failure
            # to break the search request.

    # ========================================================================
    # STEP 20: RETURN
    # ========================================================================

    return response