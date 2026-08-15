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
    # de-duplicate while preserving order
    seen = set()
    ordered = []
    for c in concepts:
        if c not in seen:
            seen.add(c)
            ordered.append(c)
    return ordered[:5]


def build_pubmed_term(query: str, article_types: List[str] = None, year_from: int | None = None, year_to: int | None = None, free_full_text: bool | None = None) -> str:
    normalized_query = preprocess_query(query or "")
    query_parts = []

    if normalized_query:
        lower_query = normalized_query.lower()
        if "heart attack" in lower_query:
            term_group = " OR ".join([
                "heart attack",
                "myocardial infarction",
                "acute coronary syndrome",
            ])
            query_parts.append(f"({term_group})")
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


def truncate_text(text: str, max_length: int = 300, suffix: str = "...") -> str:
    """Shorten text for snippet display without cutting a word in half.

    - Returns the text unchanged if it's already within max_length.
    - Otherwise cuts at the last full word before max_length and appends suffix.
    """
    if not text:
        return ""

    text = text.strip()
    if len(text) <= max_length:
        return text

    truncated = text[:max_length].rsplit(" ", 1)[0]
    return truncated.rstrip(",.;:") + suffix