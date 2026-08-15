#!/usr/bin/env python3
"""Quick syntax and import validation for refactored code."""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

print("=" * 60)
print("Testing imports and basic functionality...")
print("=" * 60)

# Test 1: Import rate limiter
print("\n[1] Testing RateLimiter import...")
try:
    from app.utils.rate_limiter import RateLimiter
    limiter = RateLimiter(max_requests=3, time_window_seconds=1.0)
    print("✓ RateLimiter imported and instantiated successfully")
except Exception as e:
    print(f"✗ RateLimiter import failed: {e}")
    sys.exit(1)

# Test 2: Import updated helpers
print("\n[2] Testing updated helpers module...")
try:
    from app.utils.helpers import (
        preprocess_query,
        extract_concepts,
        build_boolean_pubmed_query,
        build_pubmed_term,
        _tokenize_query,
        _extract_content_tokens,
        MEDICAL_STOPWORDS,
    )
    print("✓ All helper functions imported successfully")
except Exception as e:
    print(f"✗ Helpers import failed: {e}")
    sys.exit(1)

# Test 3: Test concept extraction
print("\n[3] Testing concept extraction...")
try:
    test_query = "treatment for breast cancer immunotherapy"
    concepts = extract_concepts(test_query)
    print(f"  Query: '{test_query}'")
    print(f"  Extracted concepts: {concepts}")
    assert isinstance(concepts, list), "extract_concepts should return a list"
    assert len(concepts) > 0, "Should extract at least one concept"
    print("✓ Concept extraction works")
except Exception as e:
    print(f"✗ Concept extraction failed: {e}")
    sys.exit(1)

# Test 4: Test query preprocessing
print("\n[4] Testing query preprocessing...")
try:
    queries = [
        "   spaces   everywhere   ",
        "query-with-dashes",
        "special!@#$%characters",
    ]
    for q in queries:
        result = preprocess_query(q)
        print(f"  '{q}' -> '{result}'")
    print("✓ Query preprocessing works")
except Exception as e:
    print(f"✗ Query preprocessing failed: {e}")
    sys.exit(1)

# Test 5: Test boolean query building
print("\n[5] Testing boolean query building...")
try:
    test_query = "fever in children"
    boolean_query = build_boolean_pubmed_query(test_query)
    print(f"  Natural language: '{test_query}'")
    print(f"  Boolean query: '{boolean_query}'")
    assert "fever" in boolean_query.lower(), "Should contain fever"
    assert "child" in boolean_query.lower(), "Should contain child-related terms"
    print("✓ Boolean query building works")
except Exception as e:
    print(f"✗ Boolean query building failed: {e}")
    sys.exit(1)

# Test 6: Test PubMedService rate limiter integration
print("\n[6] Testing PubMedService rate limiter integration...")
try:
    from app.services.pubmed_service import PubMedService
    service = PubMedService()
    assert hasattr(service, 'rate_limiter'), "PubMedService should have rate_limiter"
    assert isinstance(service.rate_limiter, RateLimiter), "rate_limiter should be RateLimiter instance"
    print("✓ PubMedService has rate limiter integrated")
except Exception as e:
    print(f"✗ PubMedService integration failed: {e}")
    sys.exit(1)

# Test 7: Test RankingService has semantic scoring consolidation
print("\n[7] Testing RankingService method consolidation...")
try:
    from app.services.ranking_service import RankingService
    service = RankingService()
    assert hasattr(service, '_compute_semantic_scores'), "Should have _compute_semantic_scores method"
    print("✓ RankingService has consolidated semantic scoring method")
except Exception as e:
    print(f"✗ RankingService consolidation failed: {e}")
    sys.exit(1)

# Test 8: Test EmbeddingService graceful degradation
print("\n[8] Testing EmbeddingService graceful degradation...")
try:
    from app.services.embedding_service import EmbeddingService
    service = EmbeddingService()
    assert hasattr(service, '_ensure_model_loaded'), "Should have _ensure_model_loaded method"
    assert hasattr(service, '_embed_texts_fallback'), "Should have _embed_texts_fallback method"
    print("✓ EmbeddingService has graceful degradation methods")
    
    # Test fallback embedding (without loading actual model)
    fallback_emb = service._embed_texts_fallback(["test text"])
    assert fallback_emb.shape == (1, 384), "Fallback should return (1, 384) shaped array"
    print(f"  Fallback embedding shape: {fallback_emb.shape}")
    print("✓ EmbeddingService fallback works")
except Exception as e:
    print(f"✗ EmbeddingService graceful degradation failed: {e}")
    sys.exit(1)

print("\n" + "=" * 60)
print("✓ All validation tests passed!")
print("=" * 60)
