"""
Analytics Database Module

Manages SQLite database operations for anonymous usage tracking.
Handles visitor sessions, search events, and statistics calculations.

Database schema:
- visits: Anonymous visitor sessions
- searches: Search events with query, result count, and mode
"""

import sqlite3
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)


class AnalyticsDB:
    """SQLite analytics database for anonymous usage tracking."""
    
    def __init__(self, db_path: str | None = None):
        """Initialize analytics database.
        
        Args:
            db_path: Path to SQLite database. Defaults to data/analytics.db
        """
        if db_path is None:
            data_dir = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
            os.makedirs(data_dir, exist_ok=True)
            db_path = os.path.join(data_dir, "analytics.db")
        
        self.db_path = db_path
        self._initialize_db()
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            conn.close()
    
    def _initialize_db(self):
        """Create tables if they don't exist."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Visits table: Track anonymous visitor sessions
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS visits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    visitor_id TEXT UNIQUE NOT NULL,
                    first_visit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_visit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    visit_count INTEGER DEFAULT 1
                )
            """)
            
            # Searches table: Track individual search events
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS searches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    visitor_id TEXT NOT NULL,
                    search_query TEXT NOT NULL,
                    result_count INTEGER,
                    total_results INTEGER,
                    search_mode TEXT DEFAULT 'hybrid',
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (visitor_id) REFERENCES visits(visitor_id)
                )
            """)
            
            # Create indexes for faster queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_visitor_id ON visits(visitor_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_search_visitor ON searches(visitor_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_search_timestamp ON searches(timestamp)
            """)
            
            conn.commit()
            logger.info(f"Analytics database initialized at {self.db_path}")
    
    def record_visit(self, visitor_id: str) -> bool:
        """Record or update a visitor visit.
        
        Args:
            visitor_id: Anonymous visitor ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Check if visitor exists
                cursor.execute("SELECT id FROM visits WHERE visitor_id = ?", (visitor_id,))
                existing = cursor.fetchone()
                
                if existing:
                    # Update last visit and increment counter
                    cursor.execute(
                        "UPDATE visits SET last_visit_at = CURRENT_TIMESTAMP, visit_count = visit_count + 1 WHERE visitor_id = ?",
                        (visitor_id,)
                    )
                else:
                    # Insert new visitor
                    cursor.execute(
                        "INSERT INTO visits (visitor_id, first_visit_at, last_visit_at, visit_count) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)",
                        (visitor_id,)
                    )
                
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error recording visit for {visitor_id}: {e}")
            return False
    
    def record_search(self, visitor_id: str, search_query: str, result_count: int, 
                     total_results: int, search_mode: str = "hybrid") -> bool:
        """Record a search event.
        
        Args:
            visitor_id: Anonymous visitor ID
            search_query: User's search query
            result_count: Number of results returned to user
            total_results: Total results found in PubMed index
            search_mode: Search mode ('hybrid' or 'semantic_only')
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """INSERT INTO searches (visitor_id, search_query, result_count, total_results, search_mode)
                       VALUES (?, ?, ?, ?, ?)""",
                    (visitor_id, search_query, result_count, total_results, search_mode)
                )
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error recording search for {visitor_id}: {e}")
            return False
    
    def get_unique_visitors(self, days: int | None = None) -> int:
        """Get count of unique anonymous visitors.
        
        Args:
            days: If specified, only count visitors from last N days
            
        Returns:
            Count of unique visitors
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                if days:
                    cutoff = datetime.now() - timedelta(days=days)
                    cursor.execute(
                        "SELECT COUNT(DISTINCT visitor_id) as count FROM visits WHERE first_visit_at >= ?",
                        (cutoff,)
                    )
                else:
                    cursor.execute("SELECT COUNT(DISTINCT visitor_id) as count FROM visits")
                
                result = cursor.fetchone()
                return result["count"] if result else 0
        except Exception as e:
            logger.error(f"Error getting unique visitors: {e}")
            return 0
    
    def get_total_searches(self, days: int | None = None) -> int:
        """Get total number of searches.
        
        Args:
            days: If specified, only count searches from last N days
            
        Returns:
            Total search count
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                if days:
                    cutoff = datetime.now() - timedelta(days=days)
                    cursor.execute(
                        "SELECT COUNT(*) as count FROM searches WHERE timestamp >= ?",
                        (cutoff,)
                    )
                else:
                    cursor.execute("SELECT COUNT(*) as count FROM searches")
                
                result = cursor.fetchone()
                return result["count"] if result else 0
        except Exception as e:
            logger.error(f"Error getting total searches: {e}")
            return 0
    
    def get_returning_visitors(self, min_visits: int = 2) -> int:
        """Get count of returning visitors (multiple visits).
        
        Args:
            min_visits: Minimum number of visits to count as returning
            
        Returns:
            Count of returning visitors
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT COUNT(*) as count FROM visits WHERE visit_count >= ?",
                    (min_visits,)
                )
                result = cursor.fetchone()
                return result["count"] if result else 0
        except Exception as e:
            logger.error(f"Error getting returning visitors: {e}")
            return 0
    
    def get_recent_searches(self, limit: int = 10, days: int = 7) -> List[Dict]:
        """Get recent search queries.
        
        Args:
            limit: Maximum number of searches to return
            days: Only include searches from last N days
            
        Returns:
            List of recent searches
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cutoff = datetime.now() - timedelta(days=days)
                cursor.execute(
                    """SELECT search_query, result_count, timestamp 
                       FROM searches 
                       WHERE timestamp >= ? 
                       ORDER BY timestamp DESC 
                       LIMIT ?""",
                    (cutoff, limit)
                )
                
                results = []
                for row in cursor.fetchall():
                    results.append({
                        "query": row["search_query"],
                        "result_count": row["result_count"],
                        "timestamp": row["timestamp"]
                    })
                return results
        except Exception as e:
            logger.error(f"Error getting recent searches: {e}")
            return []
    
    def get_statistics(self) -> Dict:
        """Get overall statistics.
        
        Returns:
            Dictionary with analytics statistics
        """
        try:
            total_visitors = self.get_unique_visitors()
            today_visitors = self.get_unique_visitors(days=1)
            week_visitors = self.get_unique_visitors(days=7)
            
            total_searches = self.get_total_searches()
            today_searches = self.get_total_searches(days=1)
            week_searches = self.get_total_searches(days=7)
            
            returning_visitors = self.get_returning_visitors()
            recent_searches = self.get_recent_searches(limit=5)
            
            return {
                "total_unique_visitors": total_visitors,
                "today_unique_visitors": today_visitors,
                "week_unique_visitors": week_visitors,
                "total_searches": total_searches,
                "today_searches": today_searches,
                "week_searches": week_searches,
                "returning_visitors": returning_visitors,
                "recent_searches": recent_searches,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
