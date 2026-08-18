/**
 * Analytics Helper Functions
 * 
 * Non-blocking utility functions for recording anonymous usage analytics.
 * These fire-and-forget requests ensure that analytics failures never
 * impact the search functionality or user experience.
 */

/**
 * Generate a UUID v4 identifier for anonymous visitor tracking
 * @returns {string} Random UUID-like string
 */
export function generateVisitorId() {
  // Simple UUID v4-like generation (sufficient for non-critical analytics)
  return 'v_' + [
    Math.random().toString(16).slice(2, 10),
    Math.random().toString(16).slice(2, 10),
    Math.random().toString(16).slice(2, 6),
    Math.random().toString(16).slice(2, 6),
    Math.random().toString(16).slice(2, 12)
  ].join('-');
}

/**
 * Get or create persistent anonymous visitor ID from localStorage
 * @returns {string} Visitor ID
 */
export function getOrCreateVisitorId() {
  const STORAGE_KEY = 'biomed_visitor_id';
  let visitorId = localStorage.getItem(STORAGE_KEY);
  
  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(STORAGE_KEY, visitorId);
  }
  
  return visitorId;
}

/**
 * Record an anonymous visitor session (fire-and-forget)
 * @param {string} visitorId - Anonymous visitor ID
 * @param {string} apiUrl - Base API URL (e.g., http://localhost:8000/api)
 */
export async function recordVisit(visitorId, apiUrl) {
  if (!visitorId) return;
  
  try {
    const analyticsUrl = apiUrl.replace('/search', '/analytics/visit');
    const response = await fetch(analyticsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId }),
      // Use short timeout to avoid blocking
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) {
      console.debug('Analytics visit failed:', response.status);
    }
  } catch (err) {
    // Silently fail - never impact user experience
    console.debug('Analytics visit error (expected to be graceful):', err.message);
  }
}

/**
 * Record an anonymous search event (fire-and-forget)
 * @param {object} params - Search event parameters
 * @param {string} params.visitorId - Anonymous visitor ID
 * @param {string} params.query - Search query text
 * @param {number} params.resultCount - Number of results returned
 * @param {number} params.totalResults - Total results in PubMed index
 * @param {string} params.searchMode - 'hybrid' or 'semantic_only'
 * @param {string} params.apiUrl - Base API URL
 */
export async function recordSearch({ visitorId, query, resultCount, totalResults, searchMode, apiUrl }) {
  if (!visitorId || !query) return;
  
  try {
    const analyticsUrl = apiUrl.replace('/search', '/analytics/search');
    const response = await fetch(analyticsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor_id: visitorId,
        search_query: query,
        result_count: resultCount,
        total_results: totalResults,
        search_mode: searchMode
      }),
      // Use short timeout to avoid blocking
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) {
      console.debug('Analytics search failed:', response.status);
    }
  } catch (err) {
    // Silently fail - never impact user experience
    console.debug('Analytics search error (expected to be graceful):', err.message);
  }
}

/**
 * Fetch current analytics statistics (non-blocking)
 * @param {string} apiUrl - Base API URL
 * @returns {Promise<object|null>} Statistics or null if failed
 */
export async function fetchAnalyticsStats(apiUrl) {
  try {
    const statsUrl = apiUrl.replace('/search', '/analytics/stats');
    const response = await fetch(statsUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (err) {
    console.debug('Analytics stats fetch error:', err.message);
    return null;
  }
}
