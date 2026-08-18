from typing import List, Optional
from pydantic import BaseModel, Field


class ArticleResult(BaseModel):
    pmid: str
    title: str
    abstract: str
    authors: List[str] = Field(default_factory=list)
    journal: Optional[str] = None
    publication_date: Optional[str] = None
    article_type: Optional[str] = None
    mesh_terms: List[str] = Field(default_factory=list)
    doi: Optional[str] = None
    pubmed_url: str
    semantic_score: float
    keyword_score: float
    relevance_score: float


class MeshTermCount(BaseModel):
    term: str
    count: int


class SearchResponse(BaseModel):
    query: str
    total_results: int  # Total results in PubMed index
    total_meaningful_results: int = 0  # Results after filtering by relevance threshold
    page: int
    limit: int
    top_mesh_terms: List[MeshTermCount] = Field(default_factory=list)
    concepts: List[str] = Field(default_factory=list)
    results: List[ArticleResult] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    success: bool = False
    message: str


# ============================================================================
# ANALYTICS MODELS - Anonymous Usage Tracking
# ============================================================================

class AnalyticsVisitRequest(BaseModel):
    """Request to record an anonymous visitor session."""
    visitor_id: str = Field(..., description="Anonymous visitor ID (UUID v4 or similar)")


class AnalyticsSearchRequest(BaseModel):
    """Request to record an anonymous search event."""
    visitor_id: str = Field(..., description="Anonymous visitor ID")
    search_query: str = Field(..., description="User's search query")
    result_count: int = Field(..., description="Number of results returned to user")
    total_results: int = Field(..., description="Total results found in PubMed index")
    search_mode: str = Field(default="hybrid", description="Search mode: 'hybrid' or 'semantic_only'")


class RecentSearchItem(BaseModel):
    """A recent search query item."""
    query: str
    result_count: int
    timestamp: str


class AnalyticsResponse(BaseModel):
    """Response for successful analytics recording."""
    success: bool = True
    message: str = "Analytics recorded"


class AnalyticsStatsResponse(BaseModel):
    """Analytics statistics response."""
    total_unique_visitors: int = Field(..., description="Total unique anonymous visitors ever")
    today_unique_visitors: int = Field(..., description="Unique visitors today")
    week_unique_visitors: int = Field(..., description="Unique visitors this week")
    total_searches: int = Field(..., description="Total searches performed")
    today_searches: int = Field(..., description="Searches performed today")
    week_searches: int = Field(..., description="Searches performed this week")
    returning_visitors: int = Field(..., description="Visitors with 2+ visits")
    recent_searches: List[RecentSearchItem] = Field(default_factory=list, description="Recent search queries")
    timestamp: str = Field(..., description="Statistics timestamp")
