"""Thread-safe rate limiter for external API calls (e.g., PubMed).

Implements a token-bucket style rate limiter to prevent hitting NCBI rate limits
when multiple concurrent requests flow through the API.
"""

import threading
import time
from typing import Optional


class RateLimiter:
    """Thread-safe rate limiter using token bucket algorithm.
    
    Allows up to `max_requests` calls within `time_window_seconds`.
    If rate limit is hit, blocks until a token is available.
    """

    def __init__(self, max_requests: int = 3, time_window_seconds: float = 1.0):
        """
        Args:
            max_requests: Number of requests allowed per time window.
            time_window_seconds: Duration of the time window.
        """
        self.max_requests = max_requests
        self.time_window_seconds = time_window_seconds
        self.tokens = max_requests
        self.last_refill = time.time()
        self.lock = threading.Lock()

    def acquire(self) -> None:
        """Block until a token is available, then consume it.
        
        This method is thread-safe and will wait if necessary to respect
        the rate limit across concurrent callers.
        """
        while True:
            with self.lock:
                now = time.time()
                elapsed = now - self.last_refill
                
                # Refill tokens based on time passed
                if elapsed >= self.time_window_seconds:
                    self.tokens = self.max_requests
                    self.last_refill = now
                else:
                    # Proportional refill for sub-window elapsed time
                    refill_amount = (elapsed / self.time_window_seconds) * self.max_requests
                    self.tokens = min(self.max_requests, self.tokens + refill_amount)
                
                # If token available, consume and return
                if self.tokens >= 1.0:
                    self.tokens -= 1.0
                    return
            
            # No tokens available, sleep briefly and retry
            time.sleep(0.01)  # 10ms sleep between retries
