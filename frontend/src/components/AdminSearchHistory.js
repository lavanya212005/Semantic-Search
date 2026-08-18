import React, { useState, useEffect } from 'react';
import { Lock, Search, ChevronLeft, ChevronRight, Eye, EyeOff, Download, ArrowLeft } from 'lucide-react';

const API_URL = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || 'http://127.0.0.1:8000/api';

/**
 * AdminSearchHistory Component
 * 
 * Admin-only interface for viewing anonymized search activity.
 * Requires admin API key for access.
 * 
 * Features:
 * - Requires admin authentication
 * - View all search history with pagination
 * - Filter by visitor ID and date range
 * - Export data to CSV
 */

export default function AdminSearchHistory({ onBackClick }) {
  // Authentication state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  // Data state
  const [searchHistory, setSearchHistory] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(50);

  // Filter state
  const [filterVisitorId, setFilterVisitorId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // UI state
  const [successMessage, setSuccessMessage] = useState('');

  // Authenticate with admin key
  const handleAuthenticate = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setAuthError('Admin API key is required');
      return;
    }
    setAuthError('');
    setIsAuthenticated(true);
    setCurrentPage(1);
    fetchSearchHistory(1, apiKey.trim());
  };

  // Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setApiKey('');
    setSearchHistory([]);
    setError('');
    setAuthError('');
  };

  // Fetch search history
  const fetchSearchHistory = async (page, key) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        api_key: key,
        page: page,
        limit: pageLimit
      });

      if (filterVisitorId.trim()) {
        params.append('visitor_id', filterVisitorId.trim());
      }
      if (filterStartDate) {
        params.append('start_date', filterStartDate);
      }
      if (filterEndDate) {
        params.append('end_date', filterEndDate);
      }

      const response = await fetch(`${API_URL}/admin/search-history?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        setAuthError('Invalid admin API key');
        setIsAuthenticated(false);
        setApiKey('');
        setSearchHistory([]);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSearchHistory(data.results || []);
      setTotalCount(data.total_count || 0);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching search history:', err);
      setError(`Failed to fetch search history: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      fetchSearchHistory(currentPage - 1, apiKey.trim());
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalCount / pageLimit);
    if (currentPage < totalPages) {
      fetchSearchHistory(currentPage + 1, apiKey.trim());
    }
  };

  // Handle filter changes
  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchSearchHistory(1, apiKey.trim());
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilterVisitorId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setCurrentPage(1);
    fetchSearchHistory(1, apiKey.trim());
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (searchHistory.length === 0) {
      setError('No data to export');
      return;
    }

    const headers = ['Visitor ID', 'Search Query', 'Result Count', 'Total Results', 'Search Mode', 'Timestamp'];
    const rows = searchHistory.map(item => [
      item.visitor_id,
      `"${item.search_query.replace(/"/g, '""')}"`,
      item.result_count,
      item.total_results,
      item.search_mode,
      item.timestamp
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    setSuccessMessage('Data exported to CSV');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // If not authenticated, show login form
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <Lock size={32} style={{ color: '#2F6E62' }} />
            <h1 style={styles.loginTitle}>Admin Dashboard</h1>
            <p style={styles.loginSubtitle}>Search Activity History</p>
          </div>

          <form onSubmit={handleAuthenticate}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Admin API Key</label>
              <div style={styles.apiKeyInputContainer}>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter admin API key"
                  style={styles.input}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={styles.toggleButton}
                  title={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {authError && <p style={styles.errorText}>{authError}</p>}
            </div>

            <button
              type="submit"
              style={styles.loginButton}
              disabled={!apiKey.trim()}
            >
              Sign In
            </button>
          </form>

          <div style={styles.helpText}>
            <p>Admin credentials are required to access search history.</p>
            <p style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
              Contact system administrator if you don't have access.
            </p>
          </div>

          {onBackClick && (
            <button
              onClick={onBackClick}
              style={styles.backButton}
              title="Return to search"
            >
              <ArrowLeft size={16} /> Back to Search
            </button>
          )}
        </div>
      </div>
    );
  }

  // Authenticated view - show search history
  const totalPages = Math.ceil(totalCount / pageLimit);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.mainTitle}>Search Activity Dashboard</h1>
          <div style={styles.headerButtons}>
            {onBackClick && (
              <button
                onClick={onBackClick}
                style={styles.backMainButton}
                title="Return to search"
              >
                <ArrowLeft size={16} /> Back to Search
              </button>
            )}
            <button
              onClick={handleLogout}
              style={styles.logoutButton}
            >
              Sign Out
            </button>
          </div>
        </div>
        <p style={styles.subtitle}>View and analyze anonymized user search activity</p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div style={styles.successMessage}>
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={styles.filterPanel}>
        <h3 style={styles.filterTitle}>Filters</h3>

        <div style={styles.filterGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Visitor ID</label>
            <input
              type="text"
              value={filterVisitorId}
              onChange={(e) => setFilterVisitorId(e.target.value)}
              placeholder="Filter by visitor ID (optional)"
              style={styles.filterInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Start Date</label>
            <input
              type="datetime-local"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>End Date</label>
            <input
              type="datetime-local"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Results per page</label>
            <select
              value={pageLimit}
              onChange={(e) => {
                setPageLimit(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              style={styles.filterInput}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>

        <div style={styles.filterButtons}>
          <button
            onClick={handleFilterChange}
            style={styles.applyButton}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Apply Filters'}
          </button>
          <button
            onClick={handleResetFilters}
            style={styles.resetButton}
            disabled={loading}
          >
            Reset
          </button>
          <button
            onClick={handleExportCSV}
            style={styles.exportButton}
            disabled={loading || searchHistory.length === 0}
          >
            <Download size={16} style={{ marginRight: '8px' }} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsPanel}>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Total Results</span>
          <span style={styles.statValue}>{totalCount.toLocaleString()}</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Current Page</span>
          <span style={styles.statValue}>
            {totalCount === 0 ? '0' : currentPage} of {totalPages}
          </span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Showing</span>
          <span style={styles.statValue}>{searchHistory.length} items</span>
        </div>
      </div>

      {/* Search History Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loadingMessage}>Loading search history...</div>
        ) : searchHistory.length === 0 ? (
          <div style={styles.emptyMessage}>
            No search records found. Try adjusting your filters.
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th}>Visitor ID</th>
                <th style={styles.th}>Search Query</th>
                <th style={styles.th}>Results</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Mode</th>
                <th style={styles.th}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {searchHistory.map((item, index) => (
                <tr key={index} style={{ ...styles.row, backgroundColor: index % 2 === 0 ? '#f8f8f4' : '#ffffff' }}>
                  <td style={styles.td}>
                    <code style={styles.code}>{item.visitor_id}</code>
                  </td>
                  <td style={styles.td}>
                    <span title={item.search_query} style={styles.query}>
                      {item.search_query.length > 50
                        ? item.search_query.substring(0, 50) + '...'
                        : item.search_query}
                    </span>
                  </td>
                  <td style={styles.td}>{item.result_count}</td>
                  <td style={styles.td}>{item.total_results.toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={styles.modeTag(item.search_mode)}>
                      {item.search_mode}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.timestamp}>
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1 || loading}
            style={styles.paginationButton}
          >
            <ChevronLeft size={18} /> Previous
          </button>

          <div style={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || loading}
            style={styles.paginationButton}
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <p>All visitor IDs and queries are anonymized. No personal information is collected or stored.</p>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#eff2ef',
    padding: '2rem',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
  },

  // Login
  loginCard: {
    maxWidth: '400px',
    margin: '4rem auto',
    backgroundColor: '#f8f8f4',
    border: '0.5px solid #d6d2c4',
    borderRadius: '4px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  loginTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1b2a33',
    margin: '1rem 0 0.25rem'
  },
  loginSubtitle: {
    fontSize: '14px',
    color: '#4a5a61',
    margin: 0
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1b2a33',
    marginBottom: '0.5rem'
  },
  apiKeyInputContainer: {
    display: 'flex',
    alignItems: 'center',
    border: '0.5px solid #d6d2c4',
    borderRadius: '2px',
    overflow: 'hidden',
    backgroundColor: '#ffffff'
  },
  input: {
    flex: 1,
    padding: '0.75rem',
    border: 'none',
    fontSize: '14px',
    fontFamily: 'monospace',
    outline: 'none'
  },
  toggleButton: {
    padding: '0.75rem',
    border: 'none',
    backgroundColor: '#f8f8f4',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4a5a61'
  },
  errorText: {
    fontSize: '12px',
    color: '#b8562a',
    marginTop: '0.5rem'
  },
  loginButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#2f6e62',
    color: '#ffffff',
    border: 'none',
    borderRadius: '2px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  backButton: {
    width: '100%',
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#ffffff',
    color: '#2f6e62',
    border: '0.5px solid #2f6e62',
    borderRadius: '2px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s'
  },
  helpText: {
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '0.5px solid #d6d2c4',
    fontSize: '13px',
    color: '#4a5a61',
    lineHeight: '1.5'
  },

  // Header
  header: {
    marginBottom: '2rem'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  headerButtons: {
    display: 'flex',
    gap: '1rem'
  },
  mainTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#1b2a33',
    margin: 0
  },
  backMainButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ffffff',
    color: '#2f6e62',
    border: '0.5px solid #2f6e62',
    borderRadius: '2px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s'
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e74c3c',
    color: '#ffffff',
    border: 'none',
    borderRadius: '2px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  subtitle: {
    fontSize: '14px',
    color: '#4a5a61',
    margin: 0
  },

  // Messages
  successMessage: {
    padding: '0.75rem 1rem',
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '0.5px solid #c3e6cb',
    borderRadius: '2px',
    marginBottom: '1rem',
    fontSize: '13px'
  },
  errorMessage: {
    padding: '0.75rem 1rem',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '0.5px solid #f5c6cb',
    borderRadius: '2px',
    marginBottom: '1rem',
    fontSize: '13px'
  },

  // Filters
  filterPanel: {
    backgroundColor: '#f8f8f4',
    border: '0.5px solid #d6d2c4',
    borderRadius: '4px',
    padding: '1rem',
    marginBottom: '1rem'
  },
  filterTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1b2a33',
    margin: '0 0 1rem'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#4a5a61',
    marginBottom: '0.25rem'
  },
  filterInput: {
    padding: '0.5rem',
    fontSize: '13px',
    border: '0.5px solid #d6d2c4',
    borderRadius: '2px',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit'
  },
  filterButtons: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  applyButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2f6e62',
    color: '#ffffff',
    border: 'none',
    borderRadius: '2px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  resetButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f8f8f4',
    color: '#4a5a61',
    border: '0.5px solid #d6d2c4',
    borderRadius: '2px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  exportButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#27ae60',
    color: '#ffffff',
    border: 'none',
    borderRadius: '2px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s'
  },

  // Stats
  statsPanel: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem'
  },
  statItem: {
    backgroundColor: '#f8f8f4',
    border: '0.5px solid #d6d2c4',
    borderRadius: '4px',
    padding: '1rem',
    textAlign: 'center'
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#4a5a61',
    marginBottom: '0.5rem',
    fontWeight: '500'
  },
  statValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1b2a33'
  },

  // Table
  tableContainer: {
    overflow: 'auto',
    backgroundColor: '#ffffff',
    border: '0.5px solid #d6d2c4',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  loadingMessage: {
    padding: '2rem',
    textAlign: 'center',
    color: '#4a5a61'
  },
  emptyMessage: {
    padding: '2rem',
    textAlign: 'center',
    color: '#4a5a61'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  headerRow: {
    backgroundColor: '#f8f8f4',
    borderBottom: '0.5px solid #d6d2c4'
  },
  th: {
    padding: '0.75rem',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#1b2a33'
  },
  row: {
    borderBottom: '0.5px solid #e8e4d8'
  },
  td: {
    padding: '0.75rem',
    fontSize: '13px',
    color: '#1b2a33'
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '12px',
    backgroundColor: '#f8f8f4',
    padding: '0.25rem 0.5rem',
    borderRadius: '2px'
  },
  query: {
    display: 'block',
    maxWidth: '400px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  modeTag: (mode) => ({
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '2px',
    fontSize: '11px',
    fontWeight: '500',
    backgroundColor: mode === 'semantic_only' ? '#e3f2fd' : '#f0f4c3',
    color: mode === 'semantic_only' ? '#1565c0' : '#827717'
  }),
  timestamp: {
    fontSize: '12px',
    color: '#4a5a61'
  },

  // Pagination
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem'
  },
  paginationButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2f6e62',
    color: '#ffffff',
    border: 'none',
    borderRadius: '2px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s'
  },
  pageInfo: {
    fontSize: '13px',
    color: '#4a5a61',
    fontWeight: '500',
    minWidth: '100px',
    textAlign: 'center'
  },

  // Footer
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#4a5a61',
    borderTop: '0.5px solid #d6d2c4',
    paddingTop: '1rem',
    marginTop: '2rem'
  }
};
