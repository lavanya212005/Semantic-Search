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


def extract_concepts(query: str) -> List[str]:
    query = preprocess_query(query)
    if not query:
        return []

    concepts = []
    lower_query = query.lower()
    if "tumor microenvironment" in lower_query:
        concepts.append("tumor microenvironment")
    if "immunotherapy" in lower_query:
        concepts.append("immunotherapy")
    if "kidney function" in lower_query:
        concepts.append("kidney function")
    if "diabetes" in lower_query:
        concepts.append("diabetes")
    if "breast cancer" in lower_query:
        concepts.append("breast cancer")
    if not concepts:
        tokens = [token for token in re.split(r"[\s,]+", query) if len(token) > 3]
        concepts = tokens[:3]
    return concepts


def build_pubmed_term(query: str, article_types: List[str] = None, year_from: int | None = None, year_to: int | None = None, free_full_text: bool | None = None) -> str:
    query_parts = [query]

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

    return " AND ".join(query_parts)


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
