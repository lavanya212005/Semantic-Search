import re
from typing import List


def preprocess_query(query: str) -> str:
    if not query or not isinstance(query, str):
        return ""

    query = query.strip()
    query = re.sub(r"\s+", " ", query)
    query = re.sub(r"[^\w\s\-\/:,.?()\%\+]+", " ", query)
    query = re.sub(r"\s+", " ", query)
    return query.strip()


STOPWORDS = {
    "what", "which", "where", "when", "how", "does", "do", "the", "and", "for",
    "with", "about", "that", "this", "are", "can", "show", "find", "papers",
    "articles", "studies", "research", "related", "recent", "latest", "new",
    "effect", "effects", "role", "impact", "between", "from", "into",
}


def extract_concepts(query: str) -> List[str]:
    """Query-driven concept extraction: strips stopwords, keeps meaningful
    domain terms in the order they appear. No hardcoded topic list."""
    query = preprocess_query(query)
    if not query:
        return []

    tokens = [t for t in re.split(r"[\s,]+", query.lower()) if t]
    concepts = [t for t in tokens if len(t) > 3 and t not in STOPWORDS]
    seen = set()
    ordered = []
    for concept in concepts:
        if concept not in seen:
            seen.add(concept)
            ordered.append(concept)
    return ordered[:5]


def truncate_text(value: str, max_length: int = 200) -> str:
    if not value:
        return ""
    value = normalize_text(value)
    if len(value) <= max_length:
        return value
    return value[: max_length - 3].rstrip() + "..."


def build_pubmed_term(query: str, article_types: List[str] = None, year_from: int | None = None, year_to: int | None = None, free_full_text: bool | None = None) -> str:
    normalized_query = truncate_text(preprocess_query(query or ""), max_length=250)
    query_parts = []

    if normalized_query:
        key_terms = extract_concepts(normalized_query)
        mesh_candidates = [f"{term}[MeSH Terms]" for term in key_terms[:3]]

        if mesh_candidates:
            query_parts.append(f"({normalized_query} OR {' OR '.join(mesh_candidates)})")
        else:
            query_parts.append(normalized_query)

    if article_types:
        type_filters = []
        for t in article_types:
            normalized = t.strip().lower()
            if normalized == "review":
                type_filters.append("Review[pt]")
            elif normalized == "clinical trial":
                type_filters.append("Clinical Trial[pt]")
            elif normalized == "meta-analysis":
                type_filters.append("Meta-Analysis[pt]")
            elif normalized == "randomized controlled trial":
                type_filters.append("Randomized Controlled Trial[pt]")
        if type_filters:
            query_parts.append("(" + " OR ".join(type_filters) + ")")

    if year_from is not None or year_to is not None:
        if year_from is None:
            year_from = 1800
        if year_to is None:
            year_to = 2100
        query_parts.append(f"{year_from}:{year_to}[dp]")

    if free_full_text:
        query_parts.append("free full text[Filter]")

    return " AND ".join(query_parts) if query_parts else ""


def normalize_text(value: str) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value.strip())


def count_keyword_matches(text: str, query_terms: List[str]) -> int:
    if not text:
        return 0
    normalized = text.lower()
    score = 0
    for term in query_terms:
        if term.lower() in normalized:
            score += 1
    return score