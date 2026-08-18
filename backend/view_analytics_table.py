#!/usr/bin/env python3
"""
Analytics Table Viewer

Display analytics data in beautiful table format.
Shows visitor details and search history.

Usage:
    python view_analytics_table.py             # Show all data
    python view_analytics_table.py --visitors   # Show only visitors
    python view_analytics_table.py --searches   # Show only searches
    python view_analytics_table.py --visitor v_xxxxx  # Show one visitor's details
"""

import sqlite3
import os
import sys
from datetime import datetime, timedelta
from typing import List, Tuple

# Try to use tabulate for nice table formatting (optional)
try:
    from tabulate import tabulate
    HAS_TABULATE = True
except ImportError:
    HAS_TABULATE = False
    print("💡 Tip: Install tabulate for better formatting: pip install tabulate\n")

DB_PATH = os.path.join(
    os.path.dirname(__file__), 
    'data', 
    'analytics.db'
)


class AnalyticsViewer:
    """Display analytics data in table format."""
    
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        if not os.path.exists(db_path):
            print(f"❌ Database not found at {db_path}")
            print("Make sure the backend is running and has created analytics.db")
            sys.exit(1)
    
    def get_connection(self):
        """Get database connection."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def print_table(self, headers: List[str], rows: List[Tuple], title: str = ""):
        """Print data in table format."""
        if title:
            print(f"\n{'='*80}")
            print(f"  {title}")
            print(f"{'='*80}\n")
        
        if not rows:
            print("   (No data)\n")
            return
        
        if HAS_TABULATE:
            print(tabulate(rows, headers=headers, tablefmt="grid", showindex=True))
        else:
            # Fallback to simple format
            col_widths = [len(h) for h in headers]
            for row in rows:
                for i, cell in enumerate(row):
                    col_widths[i] = max(col_widths[i], len(str(cell)))
            
            # Print headers
            header_line = " | ".join(h.ljust(col_widths[i]) for i, h in enumerate(headers))
            print(header_line)
            print("-" * len(header_line))
            
            # Print rows
            for row in rows:
                print(" | ".join(str(cell).ljust(col_widths[i]) for i, cell in enumerate(row)))
        
        print()
    
    def show_visitors(self):
        """Display all visitors."""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                visitor_id,
                first_visit_at,
                last_visit_at,
                visit_count,
                (SELECT COUNT(*) FROM searches WHERE searches.visitor_id = visits.visitor_id) as searches
            FROM visits
            ORDER BY last_visit_at DESC
        """)
        
        rows = []
        for row in cursor.fetchall():
            visitor_id = row["visitor_id"][:20] + "..." if len(row["visitor_id"]) > 20 else row["visitor_id"]
            rows.append([
                visitor_id,
                row["first_visit_at"][:19],
                row["last_visit_at"][:19],
                row["visit_count"],
                row["searches"]
            ])
        
        self.print_table(
            ["Visitor ID", "First Visit", "Last Visit", "Visits", "Searches"],
            rows,
            f"👥 VISITORS ({len(rows)} total)"
        )
        
        conn.close()
    
    def show_searches(self, limit: int = 50, days: int = 7):
        """Display recent searches."""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cutoff = datetime.now() - timedelta(days=days)
        
        cursor.execute("""
            SELECT DISTINCT
                visitor_id,
                search_query,
                result_count,
                total_results,
                search_mode,
                MAX(timestamp) as timestamp
            FROM searches
            WHERE timestamp >= ?
            GROUP BY visitor_id, search_query
            ORDER BY MAX(timestamp) DESC
            LIMIT ?
        """, (cutoff, limit))
        
        rows = []
        for row in cursor.fetchall():
            visitor_id = row["visitor_id"][:15] + "..." if len(row["visitor_id"]) > 15 else row["visitor_id"]
            query = row["search_query"][:30] + "..." if len(row["search_query"]) > 30 else row["search_query"]
            rows.append([
                visitor_id,
                query,
                row["result_count"],
                row["total_results"],
                row["search_mode"],
                row["timestamp"][:19]
            ])
        
        self.print_table(
            ["Visitor", "Query", "Results", "Total", "Mode", "Timestamp"],
            rows,
            f"🔍 SEARCHES (Last {days} days, {len(rows)} shown of {self._get_total_searches(days)})"
        )
        
        conn.close()
    
    def show_visitor_details(self, visitor_id: str):
        """Display details for a specific visitor."""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Get visitor info
        cursor.execute("SELECT * FROM visits WHERE visitor_id = ?", (visitor_id,))
        visitor = cursor.fetchone()
        
        if not visitor:
            print(f"❌ Visitor {visitor_id} not found\n")
            conn.close()
            return
        
        # Display visitor details in table format
        visitor_rows = [
            ["Visitor ID", visitor['visitor_id']],
            ["First Visit", visitor['first_visit_at']],
            ["Last Visit", visitor['last_visit_at']],
            ["Visit Count", visitor['visit_count']]
        ]
        
        self.print_table(
            ["Property", "Value"],
            visitor_rows,
            "VISITOR DETAILS"
        )
        
        # Get searches for this visitor
        cursor.execute("""
            SELECT DISTINCT
                search_query,
                result_count,
                total_results,
                search_mode,
                MAX(timestamp) as timestamp
            FROM searches
            WHERE visitor_id = ?
            GROUP BY search_query
            ORDER BY MAX(timestamp) DESC
        """, (visitor_id,))
        
        rows = []
        for row in cursor.fetchall():
            query = row["search_query"][:40] + "..." if len(row["search_query"]) > 40 else row["search_query"]
            rows.append([
                query,
                row["result_count"],
                row["total_results"],
                row["search_mode"],
                row["timestamp"][:19]
            ])
        
        self.print_table(
            ["Query", "Results", "Total", "Mode", "Timestamp"],
            rows,
            f"Search History ({len(rows)} searches)"
        )
        
        conn.close()
    
    def show_summary(self):
        """Display summary statistics."""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        print(f"\n{'='*80}")
        print(f"  ANALYTICS SUMMARY")
        print(f"{'='*80}\n")
        
        # Visitors
        cursor.execute("SELECT COUNT(DISTINCT visitor_id) as count FROM visits")
        total_visitors = cursor.fetchone()["count"]
        
        cursor.execute("SELECT COUNT(*) as count FROM visits WHERE DATE(first_visit_at) = DATE('now')")
        today_visitors = cursor.fetchone()["count"]
        
        cursor.execute("SELECT COUNT(*) as count FROM visits WHERE visit_count >= 2")
        returning = cursor.fetchone()["count"]
        
        # Searches
        cursor.execute("SELECT COUNT(*) as count FROM searches")
        total_searches = cursor.fetchone()["count"]
        
        cursor.execute("SELECT COUNT(*) as count FROM searches WHERE DATE(timestamp) = DATE('now')")
        today_searches = cursor.fetchone()["count"]
        
        # Display
        print(f"  📊 VISITORS")
        print(f"     Total Visitors:      {total_visitors}")
        print(f"     Today's Visitors:    {today_visitors}")
        print(f"     Returning Visitors:  {returning}")
        print()
        
        print(f"  🔍 SEARCHES")
        print(f"     Total Searches:      {total_searches}")
        print(f"     Today's Searches:    {today_searches}")
        print()
        
        # Top searches
        cursor.execute("""
            SELECT search_query, COUNT(*) as count
            FROM searches
            GROUP BY search_query
            ORDER BY count DESC
            LIMIT 5
        """)
        
        print(f"  📈 TOP SEARCHES")
        for i, row in enumerate(cursor.fetchall(), 1):
            query = row["search_query"][:50] + "..." if len(row["search_query"]) > 50 else row["search_query"]
            print(f"     {i}. {query} ({row['count']} times)")
        
        print()
        print(f"{'='*80}\n")
        
        conn.close()
    
    def _get_total_searches(self, days: int) -> int:
        """Get total searches in period."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cutoff = datetime.now() - timedelta(days=days)
        cursor.execute("SELECT COUNT(*) as count FROM searches WHERE timestamp >= ?", (cutoff,))
        count = cursor.fetchone()["count"]
        conn.close()
        return count


def main():
    """Main entry point."""
    viewer = AnalyticsViewer()
    
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        
        if arg == "--visitors":
            viewer.show_visitors()
        elif arg == "--searches":
            viewer.show_searches(limit=100, days=7)
        elif arg == "--visitor" and len(sys.argv) > 2:
            visitor_id = sys.argv[2]
            viewer.show_visitor_details(visitor_id)
        elif arg in ["-h", "--help", "help"]:
            print(__doc__)
        else:
            print(f"Unknown argument: {arg}")
            print(__doc__)
    else:
        # Show all by default
        viewer.show_summary()
        viewer.show_visitors()
        viewer.show_searches(limit=20, days=7)


if __name__ == "__main__":
    main()
