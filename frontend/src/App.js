import React, { useState } from 'react';
import { Search, SlidersHorizontal, ArrowUpRight, ChevronDown, ChevronUp, FileSearch, AlertCircle } from 'lucide-react';

/* ---------------------------------------------------------
   Config
--------------------------------------------------------- */
const DEFAULT_API_URL = 'http://127.0.0.1:8000/api/search';
const API_URL = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || DEFAULT_API_URL;
// Use the local backend by default so searches reach PubMed and semantic ranking.
// Demo data remains only for intentionally disabling the backend or debugging the UI.
const USE_DEMO_DATA = false;

/* ---------------------------------------------------------
   Demo dataset — lets you see the full design without a
   backend running. Remove this block (and the fallback call
   to it) once API_URL points at a live server.
--------------------------------------------------------- */
const DEMO_ARTICLES = [
  {
    pmid: '38291001',
    title: 'Semantic Retrieval Models Improve Recall in Biomedical Literature Search',
    authors: 'Okafor C, Lindqvist M, Patel R, et al.',
    journal: 'J Biomed Inform',
    publication_date: '2025 Nov',
    abstract:
      'Traditional keyword-based PubMed search underperforms on natural-language queries. We evaluate dense retrieval and cross-encoder re-ranking against a curated set of 4,200 clinical queries, finding a 31% improvement in top-10 recall over BM25 baselines, with the largest gains on symptom-cluster and rare-disease queries where exact terminology is unlikely to be known in advance by the searcher.',
    relevance_score: 0.94,
    pubmed_url: 'https://pubmed.ncbi.nlm.nih.gov/38291001/',
  },
  {
    pmid: '38104552',
    title: 'Continuous Glucose Monitoring and Long-Term Glycemic Outcomes in Type 2 Diabetes',
    authors: 'Nakamura T, Silva F, Grant B',
    journal: 'Diabetes Care',
    publication_date: '2025 Aug',
    abstract:
      'A 3-year prospective cohort of 1,840 adults with type 2 diabetes found that consistent CGM use was associated with a 0.6-point reduction in HbA1c relative to fingerstick monitoring, with adherence rather than device model driving most of the variance.',
    relevance_score: 0.71,
    pubmed_url: 'https://pubmed.ncbi.nlm.nih.gov/38104552/',
  },
  {
    pmid: '37988210',
    title: 'A Randomized Trial of Early Mobilization After Elective Hip Arthroplasty',
    authors: 'Bianchi L, Osei K',
    journal: 'Clin Orthop Relat Res',
    publication_date: '2025 Mar',
    abstract:
      'Patients mobilized within 6 hours of surgery had shorter median length of stay (1.8 vs 2.6 days) and no increase in 30-day complication rate compared to standard next-day mobilization protocols.',
    relevance_score: 0.42,
    pubmed_url: 'https://pubmed.ncbi.nlm.nih.gov/37988210/',
  },
];

/* ---------------------------------------------------------
   Design tokens
--------------------------------------------------------- */
const ink = '#1B2A33';
const inkSoft = '#4A5A61';
const cardPaper = '#F8F8F4';
const line = '#D6D2C4';
const teal = '#2F6E62';
const tealDeep = '#1F4A42';
const rust = '#B8562A';
const amber = '#9C6B1F';

function getTier(score) {
  if (score == null) return { label: 'unscored', color: inkSoft };
  if (score >= 0.8) return { label: 'strong match', color: tealDeep };
  if (score >= 0.5) return { label: 'moderate match', color: amber };
  return { label: 'weak match', color: rust };
}

/* ---------------------------------------------------------
   ArticleCard
--------------------------------------------------------- */
function ArticleCard({ article, rank }) {
  const [expanded, setExpanded] = useState(false);
  const { title, authors, journal, publication_date, abstract, relevance_score, pubmed_url, pmid } = article;

  const tier = getTier(relevance_score);
  const scoreDisplay = typeof relevance_score === 'number' ? relevance_score.toFixed(3) : 'N/A';
  const abstractText = abstract || 'No abstract available for this record.';
  const isLong = abstractText.length > 260;
  const shownAbstract = expanded || !isLong ? abstractText : abstractText.slice(0, 260).trim() + '…';
  const articleLink = pubmed_url || (pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '');

  return (
    <li className="article-card" style={{ borderLeft: `3px solid ${tier.color}` }}>
      <div className="article-card-top">
        <div className="article-card-tab">
          <span className="article-rank">{rank != null ? `No. ${String(rank).padStart(2, '0')}` : ''}</span>
          <span className="article-journal">{journal || 'Journal unlisted'}</span>
        </div>
        <div
          className="article-stamp"
          role="img"
          aria-label={`Relevance score ${scoreDisplay}, ${tier.label}`}
          style={{ color: tier.color, borderColor: tier.color }}
        >
          <div className="article-stamp-score">{scoreDisplay}</div>
          <div className="article-stamp-label">{tier.label}</div>
        </div>
      </div>

      <h2 className="article-title">{title || 'Untitled record'}</h2>

      <p className="article-authors">
        {authors || 'Unknown authors'}
        {publication_date && <span className="article-date"> · {publication_date}</span>}
      </p>

      <p className="article-abstract">{shownAbstract}</p>

      {isLong && (
        <button className="article-expand" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? 'Show less' : 'Read full abstract'}
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      )}

      <div className="article-footer">
        {articleLink ? (
          <a href={articleLink} target="_blank" rel="noreferrer" className="article-link">
            View on PubMed
            <ArrowUpRight size={14} />
          </a>
        ) : (
          <span className="article-nolink">No external record linked</span>
        )}
      </div>
    </li>
  );
}

/* ---------------------------------------------------------
   SkeletonCard
--------------------------------------------------------- */
function SkeletonCard() {
  return (
    <li className="skeleton-card" aria-hidden="true">
      <div className="skeleton-bar" style={{ width: '40%', height: 12, marginBottom: 12 }} />
      <div className="skeleton-bar" style={{ width: '80%', height: 18, marginBottom: 8 }} />
      <div className="skeleton-bar" style={{ width: '50%', height: 12, marginBottom: 14 }} />
      <div className="skeleton-bar" style={{ width: '100%', height: 10, marginBottom: 6 }} />
      <div className="skeleton-bar" style={{ width: '95%', height: 10, marginBottom: 6 }} />
      <div className="skeleton-bar" style={{ width: '70%', height: 10 }} />
    </li>
  );
}

/* ---------------------------------------------------------
   App
--------------------------------------------------------- */
export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [articleType, setArticleType] = useState('');
  const [freeFullText, setFreeFullText] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      return Array.isArray(saved) ? saved.slice(0, 5) : [];
    } catch {
      return [];
    }
  });

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
      if (!API_URL) throw new Error('NO_API');
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
      if (USE_DEMO_DATA) {
        // No live backend configured — show demo data so the UI is visible.
        // Filter demo articles by the current query so different searches return sensible results.
        const q = query ? query.trim().toLowerCase() : '';
        let filtered = DEMO_ARTICLES;

        if (q) {
          // Tokenize query and match any token against demo article fields.
          // Also do a simple plural normalization (eg: sugars -> sugar, diaries -> diary).
          const tokens = q
            .split(/\W+/)
            .map((t) => t.trim())
            .filter(Boolean);

          const normalize = (t) => {
            if (t.endsWith('ies')) return t.slice(0, -3) + 'y';
            if (t.endsWith('s')) return t.slice(0, -1);
            return t;
          };

          filtered = DEMO_ARTICLES.filter((a) => {
            const hay = `${a.title || ''} ${a.abstract || ''} ${a.authors || ''} ${a.journal || ''}`.toLowerCase();
            return tokens.some((tok) => {
              const n = normalize(tok);
              return hay.includes(tok) || (n !== tok && hay.includes(n));
            });
          });
        }

        // Keep other demo filters in place (articleType / freeFullText) if demo data supports them.
        if (articleType) {
          // demo items do not have an article type field, so this is a no-op for now.
          // If you add types to DEMO_ARTICLES, update this filter accordingly.
          filtered = filtered.filter((a) => true);
        }

        setResults(filtered);
        setTotal(filtered.length);
        setPage(1);
      } else {
        setError(err.message === 'NO_API' ? 'No API_URL configured.' : err.message || 'Search request failed.');
        setResults([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveRecentSearch = (term) => {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;

    setRecentSearches((prev) => {
      const next = prev.filter((item) => item.toLowerCase() !== cleanTerm.toLowerCase());
      const updated = [cleanTerm, ...next].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;
    saveRecentSearch(cleanQuery);
    setHasSearched(true);
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

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="App">
      <style>{`
        .App { min-height: 100vh; background: radial-gradient(circle at top, rgba(47,110,98,0.12), transparent 28%), linear-gradient(180deg, #f3efe8 0%, #eef2ee 100%); color: ${ink}; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; padding: 2rem 1.25rem 4rem; }
        .App * { box-sizing: border-box; }
        .App-shell { max-width: 860px; margin: 0 auto; background: rgba(255,255,255,0.6); border: 1px solid rgba(27,42,51,0.08); border-radius: 20px; box-shadow: 0 18px 48px rgba(27,42,51,0.08); padding: 1.5rem 1.5rem 2rem; backdrop-filter: blur(8px); }
        .App-header { margin-bottom: 1.75rem; padding: 1.1rem 0.5rem 0.4rem; border-bottom: 1px solid rgba(27,42,51,0.08); }
        .App-eyebrow { font-family: 'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: ${rust}; margin: 0 0 6px; }
        .App-title { font-family: 'Georgia', 'Times New Roman', serif; font-size: 36px; font-weight: 600; color: ${ink}; margin: 0; }
        .App-subtitle { font-size: 14px; color: ${inkSoft}; margin: 8px 0 0; }
        .search-form { background: linear-gradient(180deg, rgba(248,248,244,0.98), rgba(240,244,239,0.95)); border: 1px solid rgba(27,42,51,0.08); border-radius: 16px; padding: 1rem 1rem 0.85rem; margin-bottom: 1rem; box-shadow: inset 0 1px 0 rgba(255,255,255,0.7); }
        .search-input-row { display: flex; align-items: center; gap: 8px; border-bottom: 0.5px solid ${line}; padding-bottom: 0.75rem; margin-bottom: 0.75rem; }
        .search-input { flex: 1; border: none; outline: none; background: transparent; font-size: 15px; color: ${ink}; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; }
        .search-input::placeholder { color: ${inkSoft}; opacity: 0.7; }
        .primary-button { font-size: 13px; font-weight: 600; color: #fff; background: linear-gradient(135deg, ${tealDeep}, ${teal}); border: none; border-radius: 10px; box-shadow: 0 10px 18px rgba(31,74,66,0.18); padding: 9px 18px; cursor: pointer; white-space: nowrap; transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease; }
        .primary-button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 20px rgba(31,74,66,0.22); opacity: 0.92; }
        .primary-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .primary-button:focus-visible, .search-input:focus-visible, .filter-select:focus-visible, .article-expand:focus-visible, .article-link:focus-visible, .pagination button:focus-visible, .recent-chip:focus-visible { outline: 2px solid ${teal}; outline-offset: 2px; }
        .search-filters { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; color: ${inkSoft}; }
        .filter-label { font-size: 12.5px; color: ${inkSoft}; }
        .filter-select { font-size: 13px; color: ${ink}; background: #EFF2EF; border: 0.5px solid ${line}; border-radius: 3px; padding: 4px 8px; cursor: pointer; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; }
        .checkbox-label { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: ${inkSoft}; cursor: pointer; margin-left: auto; }
        .recent-searches { margin: 0 0 1rem; }
        .recent-title { margin: 0 0 0.5rem; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: ${inkSoft}; font-family: 'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; }
        .recent-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .recent-chip { border: 1px solid rgba(31,74,66,0.18); background: rgba(220,233,228,0.5); color: ${tealDeep}; border-radius: 999px; padding: 7px 10px; font-size: 12px; cursor: pointer; transition: background 0.15s ease; }
        .recent-chip:hover { background: rgba(220,233,228,0.9); }
        .message { font-size: 14px; border-radius: 4px; padding: 10px 14px; margin-bottom: 1rem; }
        .message-error { display: flex; align-items: center; gap: 8px; color: ${rust}; background: #F1DFD3; border: 0.5px solid ${rust}; }
        .empty-state { text-align: center; padding: 3rem 1rem; border: 1px dashed ${line}; border-radius: 4px; color: ${inkSoft}; }
        .empty-state svg { margin: 0 auto 10px; color: ${inkSoft}; }
        .empty-state p { font-size: 14px; margin: 0; }
        .results-summary { display: flex; align-items: baseline; justify-content: space-between; font-family: 'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; font-size: 12px; color: ${inkSoft}; margin-bottom: 0.75rem; }
        .results-page { text-transform: uppercase; letter-spacing: 0.04em; }
        .article-list { list-style: none; display: flex; flex-direction: column; gap: 14px; margin: 0 0 1.25rem; padding: 0; }
        .article-card { background: linear-gradient(180deg, rgba(248,248,244,0.98), rgba(244,244,239,0.9)); border: 1px solid rgba(27,42,51,0.08); border-radius: 14px; padding: 1.1rem 1.25rem 1rem; position: relative; box-shadow: 0 10px 24px rgba(27,42,51,0.04); transition: transform .15s ease, box-shadow .15s ease; }
        .article-card:hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(27,42,51,0.06); }
        .article-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .article-card-tab { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .article-rank { font-family: 'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; font-size: 11px; color: ${inkSoft}; flex-shrink: 0; }
        .article-journal { font-family: 'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: ${tealDeep}; background: #DCE9E4; padding: 2px 8px; border-radius: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .article-stamp { font-family: 'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; font-size: 11px; border: 1px dashed; border-radius: 3px; padding: 3px 8px; transform: rotate(-2deg); flex-shrink: 0; line-height: 1.3; text-align: right; }
        .article-stamp-score { font-size: 13px; font-weight: 600; }
        .article-stamp-label { font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase; }
        .article-title { font-family: 'Georgia', 'Times New Roman', serif; font-size: 19px; font-weight: 600; color: ${ink}; line-height: 1.35; margin: 0 0 4px; }
        .article-authors { font-family: 'Georgia', 'Times New Roman', serif; font-style: italic; font-size: 13.5px; color: ${inkSoft}; margin: 0 0 10px; }
        .article-date { font-family: 'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; font-style: normal; font-size: 12px; }
        .article-abstract { font-size: 14px; color: ${ink}; line-height: 1.6; margin: 0 0 8px; }
        .article-expand { font-size: 12.5px; color: ${tealDeep}; background: transparent; border: none; padding: 0; margin-bottom: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
        .article-footer { display: flex; align-items: center; justify-content: flex-end; border-top: 0.5px solid ${line}; padding-top: 8px; margin-top: 4px; }
        .article-link { font-size: 13px; font-weight: 500; color: #fff; background: ${tealDeep}; padding: 6px 12px; border-radius: 4px; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; }
        .article-nolink { font-size: 12px; color: ${inkSoft}; font-style: italic; }
        .skeleton-card { background: ${cardPaper}; border: 0.5px solid ${line}; border-left: 3px solid ${line}; border-radius: 8px; padding: 1.1rem 1.25rem 1rem; }
        .skeleton-bar { background: #E3E1D8; border-radius: 3px; animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .pagination { display: flex; justify-content: center; gap: 10px; }
        .pagination button { font-size: 13px; font-weight: 500; color: ${ink}; background: ${cardPaper}; border: 0.5px solid ${line}; border-radius: 4px; padding: 7px 16px; cursor: pointer; }
        .pagination button:hover:not(:disabled) { border-color: ${tealDeep}; color: ${tealDeep}; }
        .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
        @media (max-width: 560px) {
          .App-title { font-size: 26px; }
          .checkbox-label { margin-left: 0; }
          .article-card-top { flex-wrap: wrap; }
          .article-stamp { text-align: left; }
        }
      `}</style>

      <div className="App-shell">
        <header className="App-header">
          <p className="App-eyebrow">Semantic literature search</p>
          <h1 className="App-title">BioMed Semantic Search</h1>
          <p className="App-subtitle">Search PubMed articles using natural language and semantic ranking.</p>
        </header>

        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-row">
            <Search size={16} color={inkSoft} aria-hidden="true" />
            <input
              id="query"
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter keywords, disease, symptoms, or treatment"
              aria-label="Search query"
              required
            />
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          <div className="search-filters">
            <SlidersHorizontal size={14} color={inkSoft} aria-hidden="true" />
            <label htmlFor="articleType" className="filter-label">
              Article type
            </label>
            <select
              id="articleType"
              className="filter-select"
              value={articleType}
              onChange={(e) => setArticleType(e.target.value)}
            >
              <option value="">All types</option>
              <option value="Clinical Trial">Clinical Trial</option>
              <option value="Review">Review</option>
              <option value="Meta-Analysis">Meta-Analysis</option>
            </select>

            <label htmlFor="freeFullText" className="checkbox-label">
              <input
                id="freeFullText"
                type="checkbox"
                checked={freeFullText}
                onChange={(e) => setFreeFullText(e.target.checked)}
              />
              Free full text only
            </label>
          </div>
        </form>

        {recentSearches.length > 0 && (
          <div className="recent-searches">
            <p className="recent-title">Recently searched</p>
            <div className="recent-list">
              {recentSearches.map((term) => (
                <button
                  type="button"
                  key={term}
                  className="recent-chip"
                  onClick={() => {
                    setQuery(term);
                    setHasSearched(true);
                    setPage(1);
                    fetchSearch(1);
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="message message-error">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {!error && !loading && !hasSearched && (
          <div className="empty-state">
            <FileSearch size={28} aria-hidden="true" />
            <p>Enter a query and click Search to browse the index.</p>
          </div>
        )}

        {!error && !loading && hasSearched && results.length === 0 && (
          <div className="empty-state">
            <FileSearch size={28} aria-hidden="true" />
            <p>No records match "{query}". Try a different search term or filter.</p>
          </div>
        )}

        {loading && (
          <ul className="article-list">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </ul>
        )}

        {!loading && results.length > 0 && (
          <div className="results">
            <div className="results-summary">
              <span>
                Showing {rangeStart}–{rangeEnd} of {total} results
              </span>
              <span className="results-page">Page {page}</span>
            </div>

            <ul className="article-list">
              {results.map((article, i) => (
                <ArticleCard key={article.pmid ?? i} article={article} rank={rangeStart + i} />
              ))}
            </ul>

            <div className="pagination">
              <button onClick={handlePrev} disabled={page === 1}>
                Previous
              </button>
              <button onClick={handleNext} disabled={page * pageSize >= total}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}