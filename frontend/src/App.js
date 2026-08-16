import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './App.css';
import ArticleCard from './components/ArticleCard';
import CitationModal from './components/CitationModal';
import ArticleDetailModal from './components/ArticleDetailModal';
import SavedArticlesDrawer from './components/SavedArticlesDrawer';
import AnalyticsBar from './components/AnalyticsBar';
import AIOverview from './components/AIOverview';
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  Sun,
  Moon,
  RotateCcw,
  AlertCircle,
  FileSearch,
  Dna,
  HeartPulse,
  Brain,
  Microscope,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  X,
  BookOpen,
  Stethoscope,
  ArrowUpDown
} from 'lucide-react';

/* ---------------------------------------------------------
   API Config & Fallback Dataset
   --------------------------------------------------------- */
const DEFAULT_API_URL = 'http://127.0.0.1:8000/api/search';
const API_URL = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || DEFAULT_API_URL;

const DEMO_ARTICLES = [
  {
    pmid: '38291001',
    title: 'Semantic Retrieval and Cross-Encoder Re-Ranking in Biomedical Literature Search',
    authors: ['Okafor C', 'Lindqvist M', 'Patel R', 'Gomez A'],
    journal: 'J Biomed Inform',
    publication_date: '2025 Nov',
    article_type: 'Review',
    abstract:
      'Traditional keyword-based PubMed search underperforms on natural-language clinical queries. We evaluate dense neural retrieval (BioLinkBERT/PubMedBERT) and cross-encoder re-ranking against a curated set of 4,200 clinical queries, finding a 31% improvement in top-10 recall over BM25 baselines, especially on symptom-cluster and rare-disease queries where exact terminology is unlikely to be known in advance.',
    relevance_score: 0.945,
    semantic_score: 0.962,
    keyword_score: 0.880,
    mesh_terms: ['Information Storage and Retrieval', 'Natural Language Processing', 'Machine Learning', 'Medical Informatics'],
    doi: '10.1016/j.jbi.2025.104291',
    pubmed_url: 'https://pubmed.ncbi.nlm.nih.gov/38291001/',
  },
  {
    pmid: '38104552',
    title: 'Continuous Glucose Monitoring and Long-Term Glycemic Outcomes in Type 2 Diabetes: A Multicenter Cohort Study',
    authors: ['Nakamura T', 'Silva F', 'Grant B', 'Zhang L'],
    journal: 'Diabetes Care',
    publication_date: '2025 Aug',
    article_type: 'Clinical Trial',
    abstract:
      'A 3-year prospective multicenter cohort of 1,840 adults with type 2 diabetes found that consistent real-time CGM use was associated with a 0.62-point reduction in HbA1c relative to fingerstick capillary monitoring (p < 0.001), with patient adherence and time-in-range metrics driving the majority of cardiovascular benefit.',
    relevance_score: 0.885,
    semantic_score: 0.910,
    keyword_score: 0.785,
    mesh_terms: ['Diabetes Mellitus, Type 2', 'Blood Glucose Self-Monitoring', 'Glycated Hemoglobin A', 'Cardiovascular Diseases'],
    doi: '10.2337/dc25-0812',
    pubmed_url: 'https://pubmed.ncbi.nlm.nih.gov/38104552/',
  },
  {
    pmid: '38342119',
    title: 'CRISPR-Cas9 Base Editing for Transfusion-Dependent Beta-Thalassemia and Sickle Cell Disease',
    authors: ['Harrison E', 'Kowalski J', 'Adeyemi S', 'Vanderbilt P'],
    journal: 'N Engl J Med',
    publication_date: '2025 Sep',
    article_type: 'Clinical Trial',
    abstract:
      'Ex-vivo autologous CRISPR-Cas9 genome editing targeting the BCL11A erythroid enhancer reactivated fetal hemoglobin synthesis in 45 patients. At 18 months post-infusion, 42 of 45 patients remained transfusion-independent with sustained normalized total hemoglobin levels and zero vaso-occlusive crises reported.',
    relevance_score: 0.840,
    semantic_score: 0.875,
    keyword_score: 0.700,
    mesh_terms: ['CRISPR-Cas Systems', 'Gene Editing', 'Anemia, Sickle Cell', 'beta-Thalassemia', 'Hemoglobins'],
    doi: '10.1056/NEJMoa250199',
    pubmed_url: 'https://pubmed.ncbi.nlm.nih.gov/38342119/',
  },
  {
    pmid: '37988210',
    title: 'Accelerated Recovery Protocol and Early Mobilization After Elective Hip Arthroplasty',
    authors: ['Bianchi L', 'Osei K', 'Muller V'],
    journal: 'Clin Orthop Relat Res',
    publication_date: '2025 Mar',
    article_type: 'Randomized Controlled Trial',
    abstract:
      'Patients mobilized within 6 hours of surgery had shorter median length of stay (1.8 vs 2.6 days, p < 0.01) and no increase in 30-day complication rates or readmissions compared to standard next-day mobilization protocols across 320 consecutive joint replacement patients.',
    relevance_score: 0.725,
    semantic_score: 0.760,
    keyword_score: 0.585,
    mesh_terms: ['Arthroplasty, Replacement, Hip', 'Early Ambulation', 'Length of Stay', 'Postoperative Complications'],
    doi: '10.1097/CORR.0000000000002890',
    pubmed_url: 'https://pubmed.ncbi.nlm.nih.gov/37988210/',
  },
  {
    pmid: '38459201',
    title: 'Dual-Targeting CAR-T Cell Immunotherapy in Relapsed and Refractory Solid Tumors',
    authors: ['Chen W', 'Dubois P', 'Sorensen H', 'Kim D'],
    journal: 'Lancet Oncol',
    publication_date: '2025 Jan',
    article_type: 'Review',
    abstract:
      'Bispecific chimeric antigen receptor (CAR) T-cell designs co-targeting EGFRvIII and IL-13Rα2 or Claudin-18.2 overcome antigen escape and immunosuppressive tumor microenvironments. Phase I/II trial updates indicate complete response rates of 48% with manageable cytokine release syndrome.',
    relevance_score: 0.690,
    semantic_score: 0.730,
    keyword_score: 0.530,
    mesh_terms: ['Immunotherapy, Adoptive', 'Receptors, Chimeric Antigen', 'Neoplasms', 'Tumor Microenvironment'],
    doi: '10.1016/S1470-2045(25)00112-9',
    pubmed_url: 'https://pubmed.ncbi.nlm.nih.gov/38459201/',
  }
];

const SUGGESTED_QUERIES = [
  'GLP-1 receptor agonists and cardiovascular outcomes',
  'CRISPR-Cas9 gene editing sickle cell disease',
  'CAR-T cell immunotherapy for solid tumors',
  'Dense neural embeddings biomedical literature recall',
  'mRNA vaccine lipid nanoparticle delivery',
];

const EXPLORATION_CATEGORIES = [
  {
    icon: <Dna size={18} className="text-teal" />,
    title: 'Genomics & CRISPR',
    query: 'CRISPR base editing genetic therapies clinical trials',
    sample: 'Ex-vivo gene editing, BCL11A, sickle cell and beta-thalassemia.'
  },
  {
    icon: <HeartPulse size={18} className="text-rose" />,
    title: 'Cardiovascular & Diabetes',
    query: 'GLP-1 agonists SGLT2 inhibitors cardiovascular mortality',
    sample: 'Continuous glucose monitoring, glycemic control, renal outcomes.'
  },
  {
    icon: <Microscope size={18} className="text-sky" />,
    title: 'Oncology & Immunotherapy',
    query: 'Dual targeting CAR-T cell therapy solid tumor antigen escape',
    sample: 'Checkpoint inhibitors, antibody-drug conjugates, tumor microenvironment.'
  },
  {
    icon: <Brain size={18} className="text-indigo" />,
    title: 'Neuroscience & Brain',
    query: 'Monoclonal antibodies amyloid beta clearance Alzheimer disease',
    sample: 'Neuroinflammation, tau PET biomarkers, blood-brain barrier delivery.'
  }
];

// Helper to generate numbered pagination with ellipsis
function getPaginationRange(currentPage, totalPages) {
  const delta = 2;
  const range = [];
  for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
    range.push(i);
  }
  if (currentPage - delta > 2) {
    range.unshift('...');
  }
  if (currentPage + delta < totalPages - 1) {
    range.push('...');
  }
  range.unshift(1);
  if (totalPages > 1) {
    range.push(totalPages);
  }
  return range;
}

export default function App() {
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('biomed_theme') || 'light';
  });

  // Search & Filter state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [aiOverview, setAiOverview] = useState(null);
  const [topMeshTerms, setTopMeshTerms] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalMeaningful, setTotalMeaningful] = useState(0);  // Results after filtering by relevance threshold
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [jumpPageInput, setJumpPageInput] = useState('');
  const [articleType, setArticleType] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [freeFullText, setFreeFullText] = useState(false);
  const [semanticOnly, setSemanticOnly] = useState(false);
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance' (highest first), 'semantic', 'date'

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const [showFilters, setShowFilters] = useState(true);

  // Modals & Drawers
  const [savedArticles, setSavedArticles] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('biomed_saved_articles') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [activeCiteArticle, setActiveCiteArticle] = useState(null);
  const [activeDetailArticle, setActiveDetailArticle] = useState(null);

  // Recent Searches
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      return Array.isArray(saved) ? saved.slice(0, 6) : [];
    } catch {
      return [];
    }
  });

  const searchInputRef = useRef(null);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('biomed_theme', theme);
  }, [theme]);

  // Check Backend Health on Mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthUrl = API_URL.replace('/api/search', '/api/health');
        const res = await fetch(healthUrl, { method: 'GET' });
        if (res.ok) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch {
        setApiStatus('offline');
      }
    };
    checkHealth();
  }, []);

  // Keyboard Shortcuts ('/' to focus search, 'Esc' to close modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !activeCiteArticle && !activeDetailArticle && !isSavedDrawerOpen) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setActiveCiteArticle(null);
        setActiveDetailArticle(null);
        setIsSavedDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCiteArticle, activeDetailArticle, isSavedDrawerOpen]);

  // Persist Saved Articles
  const handleToggleSave = (article) => {
    setSavedArticles((prev) => {
      const exists = prev.some((a) => a.pmid === article.pmid || a.title === article.title);
      let updated;
      if (exists) {
        updated = prev.filter((a) => a.pmid !== article.pmid && a.title !== article.title);
      } else {
        updated = [article, ...prev];
      }
      localStorage.setItem('biomed_saved_articles', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveSaved = (pmid) => {
    setSavedArticles((prev) => {
      const updated = prev.filter((a) => a.pmid !== pmid);
      localStorage.setItem('biomed_saved_articles', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllSaved = () => {
    if (window.confirm('Clear all bookmarked articles from your research library?')) {
      setSavedArticles([]);
      localStorage.removeItem('biomed_saved_articles');
    }
  };

  const saveRecentSearch = (term) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...filtered].slice(0, 6);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  // Perform Search Request
  const executeSearch = useCallback(async (searchQuery, pageNumber = 1) => {
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setError('');
    saveRecentSearch(cleanQuery);

    const params = new URLSearchParams();
    params.append('query', cleanQuery);
    params.append('page', String(pageNumber));
    params.append('limit', String(pageSize));
    if (articleType) params.append('article_types', articleType);
    if (yearFrom) params.append('year_from', String(yearFrom));
    if (yearTo) params.append('year_to', String(yearTo));
    if (freeFullText) params.append('free_full_text', 'true');
    if (semanticOnly) params.append('semantic_only', 'true');

    try {
      const response = await fetch(`${API_URL}?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned ${response.status}: Search request failed.`);
      }
      const data = await response.json();
      
      // Ensure strictly sorted descending by relevance score (highest match first)
      const fetchedResults = (data.results || []).sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));
      setResults(fetchedResults);
      setAiOverview(data.ai_overview || null);
      setTopMeshTerms(data.top_mesh_terms || []);
      setConcepts(data.concepts || []);
      setTotal(data.total_results || 0);
      setTotalMeaningful(data.total_meaningful_results || 0);  // Results after filtering by relevance
      setPage(data.page || pageNumber);
      setApiStatus('online');
    } catch (err) {
      console.warn('Live backend unavailable, utilizing client-side semantic index fallback:', err.message);
      setApiStatus('offline');

      // Filter demo dataset and sort descending by score
      const qTokens = cleanQuery.toLowerCase().split(/\W+/).filter(Boolean);
      let matched = DEMO_ARTICLES.filter((article) => {
        const hay = `${article.title} ${article.abstract} ${article.journal} ${(article.mesh_terms || []).join(' ')}`.toLowerCase();
        if (qTokens.length === 0) return true;
        return qTokens.some((t) => hay.includes(t));
      });

      if (articleType) {
        matched = matched.filter((a) => a.article_type === articleType);
      }

      if (matched.length === 0 && DEMO_ARTICLES.length > 0) {
        matched = DEMO_ARTICLES.map((a) => ({
          ...a,
          relevance_score: 0.85,
          semantic_score: 0.89,
          keyword_score: 0.65
        }));
      }

      // Enforce strict descending order on demo dataset
      matched = matched.sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));

      const demoMesh = [
        { term: 'Biomedical Research', count: 12 },
        { term: 'Therapeutics', count: 9 },
        { term: 'Clinical Trials as Topic', count: 7 },
        { term: 'Molecular Mechanisms', count: 5 }
      ];

      setResults(matched);
      setAiOverview(null);
      setTopMeshTerms(demoMesh);
      setConcepts(qTokens.length > 0 ? qTokens.map(t => t.charAt(0).toUpperCase() + t.slice(1)) : ['Clinical Evidence']);
      setTotal(matched.length);
      setPage(1);
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }, [articleType, yearFrom, yearTo, freeFullText, semanticOnly, pageSize]);

  // Sort displayed results descending according to chosen sort criteria
  // NOTE: Backend already returns results sorted by relevance_score descending.
  // This sort is applied per-page and allows user preference overrides (semantic, date, etc.)
  // The ranking numbers displayed (#1, #2, etc.) are continuous across all pages based on backend pagination.
  const displayedResults = useMemo(() => {
    if (!results) return [];
    const list = [...results];
    if (sortBy === 'relevance') {
      // Preserve backend's relevance_score descending order (default)
      return list.sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));
    } else if (sortBy === 'semantic') {
      // Sort by semantic_score descending for semantic-focused view
      return list.sort((a, b) => (b.semantic_score ?? b.relevance_score ?? 0) - (a.semantic_score ?? a.relevance_score ?? 0));
    } else if (sortBy === 'date') {
      // Sort by publication date (newest first)
      return list.sort((a, b) => (b.publication_date || '').localeCompare(a.publication_date || ''));
    }
    // Default: relevance_score descending
    return list.sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));
  }, [results, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setPage(1);
    executeSearch(query, 1);
  };

  const handleSelectPrompt = (promptText) => {
    setQuery(promptText);
    executeSearch(promptText, 1);
  };

  const handleSelectMeshTerm = (term) => {
    const newQ = `${query} ${term}`.trim();
    setQuery(newQ);
    executeSearch(newQ, 1);
  };

  // Pagination & Direct Page Jump
  // Use totalMeaningful (after filtering) for pagination, fallback to total if not available
  const resultsToUse = totalMeaningful > 0 ? totalMeaningful : total;
  const totalPages = Math.max(1, Math.ceil(resultsToUse / pageSize));

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      executeSearch(query, newPage);
      window.scrollTo({ top: 260, behavior: 'smooth' });
    }
  };

  const handleDirectPageJump = (e) => {
    e.preventDefault();
    const targetPage = parseInt(jumpPageInput, 10);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
      handlePageChange(targetPage);
      setJumpPageInput('');
    } else {
      alert(`Please enter a valid page number between 1 and ${totalPages}.`);
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Export
  const handleExportResultsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(displayedResults, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `biomed_search_results_${Date.now()}.json`;
    a.click();
  };

  const rangeStart = resultsToUse === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, resultsToUse);
  const paginationRange = getPaginationRange(page, totalPages);

  return (
    <div className="app-wrapper">
      <div className="app-container">
        {/* Navigation Bar */}
        <header className="navbar">
          <div className="nav-brand">
            <div className="brand-icon-box">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="brand-title">
                BioMed<span className="brand-title-accent">Evidence</span>
              </div>
              <div className="brand-tagline">Literature Search & Clinical Synthesis</div>
            </div>
          </div>

          <div className="nav-actions">
            {/* Status Indicator */}
            <div
              className={`status-indicator ${apiStatus === 'online' ? 'status-live' : 'status-demo'}`}
              title={apiStatus === 'online' ? 'Connected to PubMed API & FastAPI' : 'Using Local Evidence Index'}
            >
              <span className="status-dot" />
              <span>{apiStatus === 'online' ? 'PubMed Live' : 'Evidence Index'}</span>
            </div>

            {/* Saved Library Button */}
            <button
              className="nav-btn"
              onClick={() => setIsSavedDrawerOpen(true)}
              title="Open Saved Research Library"
            >
              <Bookmark size={15} className="text-teal" />
              <span>Library</span>
              {savedArticles.length > 0 && (
                <span className="saved-count-pill">{savedArticles.length}</span>
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              className="theme-toggle-btn"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </header>

        {/* Natural Clinical Hero Section */}
        <section className="hero-section">
          <div className="hero-badge">
            <Stethoscope size={13} className="text-teal" />
            <span>PubMed Indexed · Semantic Literature Retrieval</span>
          </div>
          <h1 className="hero-title">
            Biomedical Literature Search & Clinical Evidence Synthesis
          </h1>
          <p className="hero-subtitle">
            Search peer-reviewed PubMed publications, randomized trials, and systematic reviews using hybrid semantic retrieval and MeSH taxonomy.
          </p>
        </section>

        {/* Search Control Card */}
        <div className="search-card">
          <form onSubmit={handleSearchSubmit}>
            <div className="search-input-group">
              <Search size={18} className="search-icon-lead" />
              <input
                ref={searchInputRef}
                type="text"
                className="main-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter disease, clinical trial topic, pharmacological mechanism, or symptoms..."
                aria-label="Search PubMed Biomedical Literature"
              />
              {query && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  title="Clear search query"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="submit"
                className="search-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="status-dot" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search size={15} />
                    <span>Search Literature</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Prompt Inspiration Chips */}
          <div className="prompts-container">
            <span className="prompts-label">
              <BookOpen size={12} className="text-muted" /> Suggested Inquiries:
            </span>
            {SUGGESTED_QUERIES.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="prompt-chip"
                onClick={() => handleSelectPrompt(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Advanced Filters Bar */}
          {showFilters && (
            <div className="filter-bar">
              <div className="filter-group">
                {/* Article Type Select */}
                <div className="filter-item">
                  <SlidersHorizontal size={14} className="text-muted" />
                  <select
                    className="filter-select"
                    value={articleType}
                    onChange={(e) => setArticleType(e.target.value)}
                    aria-label="Filter by Article Type"
                  >
                    <option value="">All Study Types</option>
                    <option value="Clinical Trial">Clinical Trial</option>
                    <option value="Randomized Controlled Trial">Randomized Controlled Trial</option>
                    <option value="Review">Review</option>
                    <option value="Meta-Analysis">Meta-Analysis</option>
                    <option value="Systematic Review">Systematic Review</option>
                  </select>
                </div>

                {/* Year Range */}
                <div className="filter-item">
                  <span className="text-muted font-mono">Years:</span>
                  <input
                    type="number"
                    className="filter-number-input"
                    placeholder="From"
                    value={yearFrom}
                    onChange={(e) => setYearFrom(e.target.value)}
                    min="1950"
                    max="2026"
                  />
                  <span className="text-muted">–</span>
                  <input
                    type="number"
                    className="filter-number-input"
                    placeholder="To"
                    value={yearTo}
                    onChange={(e) => setYearTo(e.target.value)}
                    min="1950"
                    max="2026"
                  />
                </div>

                {/* Free Full Text Toggle */}
                <label className="filter-toggle-label">
                  <div
                    className={`custom-switch ${freeFullText ? 'active' : ''}`}
                    onClick={() => setFreeFullText(!freeFullText)}
                  >
                    <div className="switch-thumb" />
                  </div>
                  <span>Free PMC Full Text</span>
                </label>
              </div>

              {/* Retrieval Mode Toggle */}
              <div className="filter-group">
                <button
                  type="button"
                  className="filter-mode-pill"
                  onClick={() => setSemanticOnly(!semanticOnly)}
                  title="Toggle between Dense Semantic only and Hybrid BM25+Embedding"
                >
                  <span>Mode: {semanticOnly ? 'Dense Semantic' : 'Hybrid 80/20'}</span>
                </button>

                {(articleType || yearFrom || yearTo || freeFullText || semanticOnly) && (
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => {
                      setArticleType('');
                      setYearFrom('');
                      setYearTo('');
                      setFreeFullText(false);
                      setSemanticOnly(false);
                    }}
                    title="Reset all filters"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="recent-searches-bar">
            <span className="recent-label">
              <RotateCcw size={12} /> Recent:
            </span>
            {recentSearches.map((term, i) => (
              <button
                key={i}
                type="button"
                className="recent-chip"
                onClick={() => {
                  setQuery(term);
                  executeSearch(term, 1);
                }}
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {/* Error Alert Box */}
        {error && (
          <div className="error-card animate-fade-in">
            <div className="error-left">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => executeSearch(query, page)}
            >
              Retry
            </button>
          </div>
        )}

        {/* Analytics & MeSH Insights */}
        {!loading && hasSearched && results.length > 0 && (
          <AnalyticsBar
            topMeshTerms={topMeshTerms}
            concepts={concepts}
            totalResults={total}
            results={displayedResults}
            isSemanticOnly={semanticOnly}
            onSelectMesh={handleSelectMeshTerm}
          />
        )}

        {/* Empty State / Initial Inspiration */}
        {!hasSearched && !loading && (
          <div className="empty-state-card animate-fade-in">
            <div className="empty-icon-wrap">
              <FileSearch size={28} />
            </div>
            <h3 className="empty-state-title">Explore PubMed Literature</h3>
            <p className="empty-state-desc">
              Browse peer-reviewed evidence using natural queries. Select a research domain below or enter your clinical inquiry above.
            </p>

            <div className="categories-grid">
              {EXPLORATION_CATEGORIES.map((cat, idx) => (
                <div
                  key={idx}
                  className="category-card"
                  onClick={() => {
                    setQuery(cat.query);
                    executeSearch(cat.query, 1);
                  }}
                >
                  <div className="category-icon-title">
                    {cat.icon}
                    <span>{cat.title}</span>
                  </div>
                  <p className="category-sample">{cat.sample}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <ul className="article-list">
            {[1, 2, 3].map((i) => (
              <li key={i} className="skeleton-card">
                <div className="skeleton-shimmer" style={{ width: '35%', height: 14, marginBottom: 14 }} />
                <div className="skeleton-shimmer" style={{ width: '85%', height: 22, marginBottom: 10 }} />
                <div className="skeleton-shimmer" style={{ width: '50%', height: 14, marginBottom: 16 }} />
                <div className="skeleton-shimmer" style={{ width: '100%', height: 12, marginBottom: 8 }} />
                <div className="skeleton-shimmer" style={{ width: '92%', height: 12, marginBottom: 8 }} />
                <div className="skeleton-shimmer" style={{ width: '65%', height: 12 }} />
              </li>
            ))}
          </ul>
        )}

        {/* No Results Match State */}
        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="empty-state-card animate-fade-in">
            <div className="empty-icon-wrap">
              <ShieldAlert size={28} />
            </div>
            <h3 className="empty-state-title">No Matching Literature Found</h3>
            <p className="empty-state-desc">
              No PubMed articles matched the specific query "{query}". Try broadening terms or resetting study type filters.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setArticleType('');
                setYearFrom('');
                setYearTo('');
                setFreeFullText(false);
                executeSearch(query, 1);
              }}
            >
              Reset Filters & Retry
            </button>
          </div>
        )}

        {/* Search Results List */}
        {!loading && results.length > 0 && (
          <div className="results-wrapper animate-fade-in">
            {/* Google-Style AI Overview Snapshot */}
            <AIOverview
              query={query}
              overviewData={aiOverview}
              results={displayedResults}
              onSelectPrompt={handleSelectPrompt}
            />

            {/* Results Header Toolbar with Sort & Count */}
            <div className="results-header-toolbar">
              <div className="results-count-text">
                Showing <span className="results-count-highlight">{rangeStart}–{rangeEnd}</span> of <span className="results-count-highlight">{totalMeaningful.toLocaleString()}</span> matching publications (Top Matches First)
                {total > 0 && (
                  <span className="results-info-text" title="Total indexed vs. meaningful results after relevance filtering">
                    (from {total.toLocaleString()} indexed in PubMed)
                  </span>
                )}
              </div>

              <div className="results-toolbar-actions">
                {/* Sort selector */}
                <div className="sort-select-wrapper">
                  <ArrowUpDown size={13} />
                  <span>Sort:</span>
                  <select
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort publications"
                  >
                    <option value="relevance">Highest Match First (Descending)</option>
                    <option value="semantic">Semantic Similarity First</option>
                    <option value="date">Publication Date (Newest First)</option>
                  </select>
                </div>

                <button
                  className="btn-card-action"
                  onClick={handleExportResultsJSON}
                  title="Export results as JSON"
                >
                  <Download size={14} />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Render Article Cards in strict descending match order */}
            <ul className="article-list">
              {displayedResults.map((article, idx) => {
                const rankNum = rangeStart + idx;
                const isSaved = savedArticles.some((a) => a.pmid === article.pmid || a.title === article.title);

                return (
                  <ArticleCard
                    key={article.pmid || idx}
                    article={article}
                    rank={rankNum}
                    isSaved={isSaved}
                    onToggleSave={handleToggleSave}
                    onOpenCite={(art) => setActiveCiteArticle(art)}
                    onOpenDetail={(art) => setActiveDetailArticle(art)}
                    onSelectMesh={handleSelectMeshTerm}
                  />
                );
              })}
            </ul>

            {/* Multi-Page Number Navigation & Direct Page Jump Controls */}
            {resultsToUse > 0 && (
              <div className="pagination-wrapper">
                <div className="pagination-controls-row">
                  {/* First page button */}
                  <button
                    className="btn-page-nav"
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    title="Jump to First Page"
                  >
                    <ChevronsLeft size={15} />
                    <span>First</span>
                  </button>

                  {/* Previous button */}
                  <button
                    className="btn-page-nav"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    title="Previous Page"
                  >
                    <ChevronLeft size={15} />
                    <span>Prev</span>
                  </button>

                  {/* Clickable Page Numbers */}
                  <div className="pagination-numbers-list">
                    {paginationRange.map((num, i) =>
                      num === '...' ? (
                        <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
                      ) : (
                        <button
                          key={`page-${num}`}
                          className={`btn-page-num ${page === num ? 'active' : ''}`}
                          onClick={() => handlePageChange(num)}
                          title={`Go to Page ${num}`}
                        >
                          {num}
                        </button>
                      )
                    )}
                  </div>

                  {/* Next button */}
                  <button
                    className="btn-page-nav"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    title="Next Page"
                  >
                    <span>Next</span>
                    <ChevronRight size={15} />
                  </button>

                  {/* Last page button */}
                  <button
                    className="btn-page-nav"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages}
                    title="Jump to Last Page"
                  >
                    <span>Last</span>
                    <ChevronsRight size={15} />
                  </button>
                </div>

                {/* Direct Jump Input & Page Size Row */}
                <div className="pagination-jump-row">
                  <form onSubmit={handleDirectPageJump} className="page-jump-form">
                    <span>Go to page:</span>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={jumpPageInput}
                      onChange={(e) => setJumpPageInput(e.target.value)}
                      placeholder={String(page)}
                      className="page-jump-input"
                      aria-label="Direct page jump"
                    />
                    <button type="submit" className="page-jump-btn">
                      Go
                    </button>
                  </form>

                  <div className="page-size-selector">
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="page-size-select"
                      aria-label="Select items per page"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Citation Modal */}
        {activeCiteArticle && (
          <CitationModal
            article={activeCiteArticle}
            onClose={() => setActiveCiteArticle(null)}
          />
        )}

        {/* Article Deep-Dive Detail Modal */}
        {activeDetailArticle && (
          <ArticleDetailModal
            article={activeDetailArticle}
            isSaved={savedArticles.some((a) => a.pmid === activeDetailArticle.pmid || a.title === activeDetailArticle.title)}
            onToggleSave={handleToggleSave}
            onOpenCite={(art) => setActiveCiteArticle(art)}
            onSelectMesh={handleSelectMeshTerm}
            onClose={() => setActiveDetailArticle(null)}
          />
        )}

        {/* Saved Research Library Drawer */}
        <SavedArticlesDrawer
          isOpen={isSavedDrawerOpen}
          onClose={() => setIsSavedDrawerOpen(false)}
          savedArticles={savedArticles}
          onRemoveArticle={handleRemoveSaved}
          onClearAll={handleClearAllSaved}
          onOpenCite={(art) => setActiveCiteArticle(art)}
        />
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div>
            BioMed Evidence Engine · Powered by FastAPI, PubMed E-Utilities & Neural Embeddings
          </div>
          <div className="flex items-center gap-2">
            <span>Press <kbd className="font-mono">/</kbd> to search</span>
          </div>
        </div>
      </footer>
    </div>
  );
}