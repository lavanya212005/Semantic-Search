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
    total_results: int
    page: int
    limit: int
    top_mesh_terms: List[MeshTermCount] = Field(default_factory=list)
    concepts: List[str] = Field(default_factory=list)
    results: List[ArticleResult] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
