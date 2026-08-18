"""
Analytics Service

High-level service for handling anonymous analytics operations.
Provides a clean interface between API routes and the database layer.

Features:
- Non-blocking analytics recording
- Graceful error handling
- Statistics aggregation
"""

import logging
from typing import Dict, Optional
from app.services.analytics_db import AnalyticsDB

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for anonymous usage analytics."""
    
    def __init__(self, db: AnalyticsDB | None = None):
        """Initialize analytics service.
        
        Args:
            db: Analytics database instance. If None, creates new instance.
        """
        self.db = db or AnalyticsDB()
    
    def record_visit(self, visitor_id: str) -> bool:
        """Record an anonymous visitor session.
        
        Args:
            visitor_id: Anonymous visitor ID
            
        Returns:
            True if recorded successfully, False otherwise.
            Never raises exceptions - always handles errors gracefully.
        """
        try:
            if not visitor_id or len(visitor_id.strip()) == 0:
                logger.warning("Invalid visitor_id provided to record_visit")
                return False
            
            return self.db.record_visit(visitor_id.strip())
        except Exception as e:
            logger.error(f"Unexpected error recording visit: {e}")
            return False
    
    def record_search(self, visitor_id: str, search_query: str, result_count: int,
                     total_results: int, search_mode: str = "hybrid") -> bool:
        """Record an anonymous search event.
        
        Args:
            visitor_id: Anonymous visitor ID
            search_query: User's search query
            result_count: Number of results returned to user
            total_results: Total results in PubMed index
            search_mode: Search mode ('hybrid' or 'semantic_only')
            
        Returns:
            True if recorded successfully, False otherwise.
            Never raises exceptions - always handles errors gracefully.
        """
        try:
            if not visitor_id or len(visitor_id.strip()) == 0:
                logger.warning("Invalid visitor_id provided to record_search")
                return False
            
            if result_count < 0 or total_results < 0:
                logger.warning(f"Invalid counts - result_count: {result_count}, total_results: {total_results}")
                return False
            
            search_mode = search_mode.strip().lower() if search_mode else "hybrid"
            if search_mode not in ("hybrid", "semantic_only"):
                search_mode = "hybrid"
            
            return self.db.record_search(
                visitor_id.strip(),
                search_query.strip()[:500],  # Limit query length
                result_count,
                total_results,
                search_mode
            )
        except Exception as e:
            logger.error(f"Unexpected error recording search: {e}")
            return False
    
    def get_statistics(self) -> Dict:
        """Get current analytics statistics.
        
        Returns:
            Dictionary with statistics or empty dict on error.
            Never raises exceptions - always handles errors gracefully.
        """
        try:
            return self.db.get_statistics()
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {
                "total_unique_visitors": 0,
                "today_unique_visitors": 0,
                "week_unique_visitors": 0,
                "total_searches": 0,
                "today_searches": 0,
                "week_searches": 0,
                "returning_visitors": 0,
                "recent_searches": [],
                "timestamp": None
            }
