import React, { useState } from 'react';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Quote,
  Sparkles,
  Layers,
  Tag,
  Maximize2
} from 'lucide-react';

export default function ArticleCard({
  article,
  rank,
  isSaved,
  onToggleSave,
  onOpenCite,
  onOpenDetail,
  onSelectMesh
}) {
  const [expanded, setExpanded] = useState(false);

  const {
    pmid,
    title = 'Untitled Article',
    authors = [],
    journal = 'Journal Unlisted',
    publication_date = '',
    article_type = '',
    abstract = '',
    mesh_terms = [],
    doi = '',
    pubmed_url = '',
    relevance_score,
    semantic_score,
    keyword_score
  } = article;

  // Compute percentage scores
  const relScore = relevance_score ?? 0.85;
  const semScore = semantic_score ?? relScore;
  const keyScore = keyword_score ?? 0.5;

  const relPercent = Math.round(relScore * 100);
  const semPercent = Math.round(semScore * 100);
  const keyPercent = Math.round(keyScore * 100);

  const getTier = (score) => {
    if (score >= 0.75) return { label: 'High Match', colorClass: 'tier-strong', badgeClass: 'badge-emerald' };
    if (score >= 0.45) return { label: 'Moderate Match', colorClass: 'tier-moderate', badgeClass: 'badge-amber' };
    return { label: 'Low Match', colorClass: 'tier-weak', badgeClass: 'badge-rose' };
  };

  const tier = getTier(relScore);

  // Author formatting
  const authorList = Array.isArray(authors) ? authors : (authors ? authors.split(',').map(a => a.trim()) : []);
  const authorDisplay = authorList.length > 0
    ? (authorList.length > 3 ? `${authorList.slice(0, 3).join(', ')} et al.` : authorList.join(', '))
    : 'Unknown Authors';

  // Abstract text
  const abstractText = abstract || 'No abstract text available in the PubMed indexing record.';
  const isLongAbstract = abstractText.length > 250;
  const shownAbstract = expanded || !isLongAbstract
    ? abstractText
    : abstractText.slice(0, 250).trim() + '…';

  const pubmedLink = pubmed_url || (pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '');
  const doiLink = doi ? (doi.startsWith('http') ? doi : `https://doi.org/${doi}`) : null;

  return (
    <li className={`article-card-container ${tier.colorClass}`}>
      {/* Top Header Row */}
      <div className="card-top-row">
        <div className="card-meta-left">
          {rank != null && (
            <span className="card-rank-badge font-mono">
              #{String(rank).padStart(2, '0')}
            </span>
          )}
          {journal && (
            <span className="card-journal-tag" title={journal}>
              {journal}
            </span>
          )}
          {article_type && (
            <span className="card-type-tag">
              {article_type}
            </span>
          )}
          {publication_date && (
            <span className="card-date-tag font-mono">
              {publication_date}
            </span>
          )}
        </div>

        {/* Relevance Score Gauge with Hover Tooltip */}
        <div className="score-meter-wrap" title={`Hybrid Score: ${relPercent}% | Dense Semantic: ${semPercent}% | BM25 Exact: ${keyPercent}%`}>
          <div className={`score-meter-pill ${tier.badgeClass}`}>
            <Sparkles size={12} />
            <span className="score-number font-mono">{relPercent}%</span>
            <span className="score-label">{tier.label}</span>
          </div>

          {/* Detailed mini tooltip bar */}
          <div className="score-hover-tooltip">
            <div className="tooltip-row">
              <span>Dense Embedding:</span>
              <span className="font-mono text-teal font-bold">{semPercent}%</span>
            </div>
            <div className="tooltip-row">
              <span>Keyword BM25:</span>
              <span className="font-mono text-sky font-bold">{keyPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Article Title */}
      <h3
        className="card-title"
        onClick={() => onOpenDetail && onOpenDetail(article)}
        title="Click to view full article details"
      >
        {title}
      </h3>

      {/* Authors */}
      <p className="card-authors">
        {authorDisplay}
        {pmid && <span className="card-pmid-sub font-mono"> · PMID: {pmid}</span>}
      </p>

      {/* Abstract Content */}
      <p className="card-abstract">
        {shownAbstract}
      </p>

      {isLongAbstract && (
        <button
          className="card-expand-btn"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <span>{expanded ? 'Show summary' : 'Read full abstract'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}

      {/* MeSH tags preview */}
      {mesh_terms && mesh_terms.length > 0 && (
        <div className="card-mesh-tags-row">
          <Tag size={12} className="text-muted" />
          <div className="card-mesh-list">
            {mesh_terms.slice(0, 4).map((mesh, i) => (
              <button
                key={i}
                className="card-mesh-pill"
                onClick={() => onSelectMesh && onSelectMesh(mesh)}
                title={`Filter by MeSH: ${mesh}`}
              >
                {mesh}
              </button>
            ))}
            {mesh_terms.length > 4 && (
              <span className="card-mesh-more">
                +{mesh_terms.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Card Action Footer */}
      <div className="card-footer">
        <div className="card-actions-left">
          <button
            className="btn-card-action"
            onClick={() => onOpenDetail && onOpenDetail(article)}
            title="Inspect full details and diagnostics"
          >
            <Maximize2 size={14} />
            <span>Details</span>
          </button>
          <button
            className="btn-card-action"
            onClick={() => onOpenCite && onOpenCite(article)}
            title="Generate citations (APA, BibTeX, RIS)"
          >
            <Quote size={14} />
            <span>Cite</span>
          </button>
          <button
            className={`btn-card-action ${isSaved ? 'btn-saved-active' : ''}`}
            onClick={() => onToggleSave && onToggleSave(article)}
            title={isSaved ? 'Remove from saved library' : 'Save article to library'}
          >
            {isSaved ? <BookmarkCheck size={14} className="text-teal" /> : <Bookmark size={14} />}
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        <div className="card-actions-right">
          {doiLink && (
            <a
              href={doiLink}
              target="_blank"
              rel="noreferrer"
              className="btn-card-link-subtle"
              title="Open DOI resolver"
            >
              <span>DOI</span>
              <ExternalLink size={12} />
            </a>
          )}
          {pubmedLink && (
            <a
              href={pubmedLink}
              target="_blank"
              rel="noreferrer"
              className="btn-card-pubmed"
              title="View original record on PubMed"
            >
              <span>PubMed</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
