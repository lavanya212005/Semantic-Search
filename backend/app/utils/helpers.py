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


def build_boolean_pubmed_query(query: str) -> str:
    """Turns a simple natural-language query into a PubMed Boolean string.

    Example:
        "medicine that reduces fever in children"
        -> "(fever[tiab] OR pyrexia[tiab]) AND (children[tiab] OR pediatric[tiab])"
    """
    normalized = preprocess_query(query or "")
    if not normalized:
        return ""

    query_lower = normalized.lower()
    synonym_map = {
        "fever": ["fever", "pyrexia"],
        "children": ["children", "child", "pediatric", "paediatric"],
        "cancer": ["cancer", "carcinoma", "tumor", "tumour", "malignancy"],
        "diabetes": ["diabetes", "hyperglycemia", "glycemic disorder"],
        "asthma": ["asthma", "bronchial asthma"],
        "pain": ["pain", "ache", "dolor"],
        "infection": ["infection", "infectious disease"],
        "influenza": ["influenza", "flu"],
    }

    def make_group(terms: List[str]) -> str:
        seen = []
        for term in terms:
            clean = preprocess_query(term)
            if not clean:
                continue
            if clean.lower() not in [item.lower() for item in seen]:
                seen.append(clean)
        if not seen:
            return ""
        return "(" + " OR ".join(f"{term}[tiab]" for term in seen) + ")"

    groups = []
    for concept, synonyms in synonym_map.items():
        if concept in query_lower or any(synonym in query_lower for synonym in synonyms):
            groups.append(make_group(synonyms))

    if not groups:
        tokens = [token for token in re.split(r"[\s,]+", normalized) if len(token) > 3 and token.lower() not in {"that", "with", "from", "into", "this", "these", "those"}]
        if not tokens:
            return normalized
        groups.append(make_group(tokens[:3]))

    return " AND ".join(group for group in groups if group)


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
