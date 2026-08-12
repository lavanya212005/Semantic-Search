import React, { useState } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/search';

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [articleType, setArticleType] = useState('');
  const [freeFullText, setFreeFullText] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchSearch = async (pageNumber = 1) => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    params.append('query', query);
    params.append('page', String(pageNumber));
    params.append('limit', String(pageSize));
    if (articleType) params.append('article_types', articleType);
    if (freeFullText) params.append('free_full_text', 'true');

    try {
      const response = await fetch(`${API_URL}?${params.toString()}`);

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.detail || 'Search request failed.');
      }

      const data = await response.json();
      setResults(data.results || []);
      setTotal(data.total_results || 0);
      setPage(data.page || pageNumber);
    } catch (err) {
      setError(err.message || 'Search request failed.');
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    fetchSearch(1);
  };

  const handlePrev = () => {
    if (page > 1) {
      const nextPage = page - 1;
      setPage(nextPage);
      fetchSearch(nextPage);
    }
  };

  const handleNext = () => {
    if (page * pageSize < total) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSearch(nextPage);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>BioMed Semantic Search</h1>
        <p>Search PubMed articles using natural language and semantic ranking.</p>
      </header>

      <form className="search-form" onSubmit={handleSearch}>
        <div className="form-group">
          <label htmlFor="query">Query</label>
          <input
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter keywords, disease, symptoms, or treatment"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="articleType">Article type</label>
            <select
              id="articleType"
              value={articleType}
              onChange={(e) => setArticleType(e.target.value)}
            >
              <option value="">All types</option>
              <option value="Clinical Trial">Clinical Trial</option>
              <option value="Review">Review</option>
              <option value="Meta-Analysis">Meta-Analysis</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label htmlFor="freeFullText">
              <input
                id="freeFullText"
                type="checkbox"
                checked={freeFullText}
                onChange={(e) => setFreeFullText(e.target.checked)}
              />
              Free full text only
            </label>
          </div>
        </div>

        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div className="message error">{error}</div>}
      {!error && !loading && results.length === 0 && page === 1 && (
        <div className="message">Enter a query and click Search.</div>
      )}

      {!loading && results.length > 0 && (
        <div className="results">
          <div className="results-summary">
            <span>{total} results found</span>
            <span>Page {page}</span>
          </div>

          <ul className="article-list">
            {results.map((article) => (
              <li key={article.pmid} className="article-card">
                <h2>{article.title}</h2>
                <p className="article-authors">{article.authors || 'Unknown authors'}</p>
                <p className="article-meta">
                  <span>{article.journal}</span>
                  {article.publication_date && <span> · {article.publication_date}</span>}
                </p>
                <p className="article-abstract">{article.abstract || 'No abstract available.'}</p>
                <div className="article-bottom">
                  <span className="score">Score: {article.relevance_score?.toFixed(3) ?? 'N/A'}</span>
                  <a href={article.pubmed_url} target="_blank" rel="noreferrer">
                    View on PubMed
                  </a>
                </div>
              </li>
            ))}
          </ul>

          <div className="pagination">
            <button onClick={handlePrev} disabled={page === 1}>Previous</button>
            <button onClick={handleNext} disabled={page * pageSize >= total}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
