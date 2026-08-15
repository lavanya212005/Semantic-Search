import re
from typing import List, Set


# Common English stopwords that don't carry semantic meaning in medical searches
MEDICAL_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by",
    "for", "from", "has", "have", "he", "her", "hers", "his",
    "how", "i", "if", "in", "into", "is", "it", "its",
    "just", "me", "my", "no", "not", "of", "on", "or",
    "other", "our", "out", "over", "should", "so", "some",
    "such", "than", "that", "the", "their", "theirs", "them",
    "then", "these", "they", "this", "to", "too", "under",
    "was", "we", "what", "when", "where", "which", "who",
    "whom", "why", "with", "you", "your", "yours",
    # Medical-specific common words
    "study", "studies", "effect", "effects", "disease", "treatment",
    "therapy", "patient", "patients", "clinical", "medical"
}

# Known multi-word phrases in biomedical domain (for enhanced matching)
KNOWN_BIOMEDICAL_PHRASES = {
    "tumor microenvironment": ["tumor", "microenvironment"],
    "immunotherapy": ["immunotherapy"],
    "kidney function": ["kidney", "function"],
    "diabetes": ["diabetes"],
    "breast cancer": ["breast", "cancer"],
    "heart attack": ["heart", "attack"],
    "myocardial infarction": ["myocardial", "infarction"],
    "acute coronary syndrome": ["acute", "coronary", "syndrome"],
}


def preprocess_query(query: str) -> str:
    if not query or not isinstance(query, str):
        return ""

    query = query.strip()
    query = re.sub(r"\s+", " ", query)
    query = re.sub(r"[^\w\s\-\/:,.?()\%\+]+", " ", query)
    query = re.sub(r"\s+", " ", query)
    return query.strip()


def _tokenize_query(query: str) -> List[str]:
    """Tokenize query into lowercase words, removing punctuation."""
    normalized = preprocess_query(query)
    if not normalized:
        return []
    # Split on whitespace and punctuation boundaries
    tokens = re.split(r"[\s,\-]+", normalized.lower())
    return [t for t in tokens if t]  # Filter empty strings


def _extract_known_phrases(query_lower: str) -> List[str]:
    """Extract known biomedical phrases from query (for enhanced matching).
    
    Only returns phrases that appear contiguously in the original query.
    """
    phrases = []
    for phrase in KNOWN_BIOMEDICAL_PHRASES.keys():
        if phrase in query_lower:
            phrases.append(phrase)
    return phrases


def _extract_content_tokens(query: str, min_length: int = 3) -> List[str]:
    """Extract meaningful tokens from query, filtering stopwords and short terms.
    
    Args:
        query: Input query string
        min_length: Minimum token length to keep (3 chars filters most stopwords)
    
    Returns:
        List of content tokens sorted by length (longer terms first)
    """
    tokens = _tokenize_query(query)
    content = []
    
    for token in tokens:
        # Skip stopwords and short tokens
        if token.lower() in MEDICAL_STOPWORDS or len(token) < min_length:
            continue
        # Skip numeric-only tokens
        if token.isdigit():
            continue
        content.append(token)
    
    # Return deduplicated tokens, longer ones first (more specific)
    seen = set()
    result = []
    for token in sorted(set(content), key=len, reverse=True):
        if token.lower() not in seen:
            result.append(token)
            seen.add(token.lower())
    
    return result


def extract_concepts(query: str) -> List[str]:
    """Extract key biomedical concepts from user query.
    
    Uses multi-level approach:
    1. Known multi-word biomedical phrases (if present in query)
    2. Content tokens filtered by stopwords (meaningful single/multi-word terms)
    
    This replaces naive dictionary-based matching with robust tokenization that
    guarantees extracted phrases actually appear in the original text.
    """
    query = preprocess_query(query)
    if not query:
        return []

    query_lower = query.lower()
    concepts = []
    
    # First, try to extract known biomedical phrases (higher confidence)
    known_phrases = _extract_known_phrases(query_lower)
    concepts.extend(known_phrases)
    
    # Then extract content tokens (meaningful single/multi-word terms)
    content_tokens = _extract_content_tokens(query, min_length=3)
    concepts.extend(content_tokens)
    
    # Return up to 5 most meaningful concepts (longer/more specific first)
    return list(dict.fromkeys(concepts))[:5] if concepts else content_tokens[:3]


def build_boolean_pubmed_query(query: str) -> str:
    """Turns a natural-language query into a PubMed Boolean string.

    Uses known synonyms for enhanced matching, but falls back to direct
    token-based search for unknown terms rather than requiring hardcoded entries.
    
    Example:
        "medicine that reduces fever in children"
        -> "(fever[tiab] OR pyrexia[tiab]) AND (children[tiab] OR pediatric[tiab])"
    """
    normalized = preprocess_query(query or "")
    if not normalized:
        return ""

    query_lower = normalized.lower()
    
    # Hardcoded synonym map for known medical concepts
    # (These are high-confidence synonyms used to enhance search)
    synonym_map = {
        "fever": ["fever", "pyrexia", "febrile"],
        "children": ["children", "child", "pediatric", "paediatric", "infant", "juvenile"],
        "cancer": ["cancer", "carcinoma", "tumor", "tumour", "malignancy", "neoplasm"],
        "diabetes": ["diabetes", "hyperglycemia", "glycemic disorder", "diabetic"],
        "asthma": ["asthma", "bronchial asthma", "reactive airway"],
        "pain": ["pain", "ache", "dolor", "analgesia"],
        "infection": ["infection", "infectious disease", "sepsis", "bacterial"],
        "influenza": ["influenza", "flu", "H1N1"],
    }

    def make_group(terms: List[str]) -> str:
        """Build a PubMed OR group for synonym matching."""
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
    
    # Try hardcoded synonyms first (high confidence)
    for concept, synonyms in synonym_map.items():
        if concept in query_lower or any(syn in query_lower for syn in synonyms):
            synonym_group = make_group(synonyms)
            if synonym_group:
                groups.append(synonym_group)

    # Extract and add content tokens that didn't match known concepts
    # This ensures we don't miss user queries with domain terms we don't have synonyms for
    content_tokens = _extract_content_tokens(normalized, min_length=3)
    
    # Only add tokens that aren't already covered by hardcoded synonyms
    for token in content_tokens[:3]:  # Limit to top 3 content tokens
        # Check if this token is already in a synonym group
        token_lower = token.lower()
        already_covered = False
        for concept, synonyms in synonym_map.items():
            if token_lower == concept.lower() or any(token_lower == syn.lower() for syn in synonyms):
                already_covered = True
                break
        
        if not already_covered:
            groups.append(make_group([token]))

    return " AND ".join(group for group in groups if group) if groups else normalized


def build_pubmed_term(query: str, article_types: List[str] = None, year_from: int | None = None, year_to: int | None = None, free_full_text: bool | None = None) -> str:
    """Build a PubMed search query with filters for article type, date range, and availability.
    
    Combines natural language query transformation with PubMed-specific search filters.
    """
    normalized_query = preprocess_query(query or "")
    query_parts = []

    if normalized_query:
        lower_query = normalized_query.lower()
        # Special handling for known multi-word medical phrases with known synonyms
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
    """Normalize whitespace in text."""
    if not value:
        return ""
    return re.sub(r"\s+", " ", value.strip())


def count_keyword_matches(text: str, query_terms: List[str]) -> int:
    """Count how many query terms appear in text (case-insensitive substring matching)."""
    if not text:
        return 0
    normalized = text.lower()
    score = 0
    for term in query_terms:
        if term.lower() in normalized:
            score += 1
    return score
