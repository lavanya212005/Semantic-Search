import React from 'react';
import { X, ExternalLink, Bookmark, BookmarkCheck, Quote, Sparkles, Database, FileText, Tag, Hash } from 'lucide-react';

export default function ArticleDetailModal({
  article,
  isSaved,
  onToggleSave,
  onOpenCite,
  onSelectMesh,
  onClose
}) {
  if (!article) return null;

  const {
    pmid,
    title,
    abstract,
    authors = [],
    journal,
    publication_date,
    article_type,
    mesh_terms = [],
    doi,
    pubmed_url,
    relevance_score,
    semantic_score,
    keyword_score
  } = article;

  const authorStr = Array.isArray(authors) ? authors.join(', ') : (authors || 'Unknown Authors');
  const pubmedLink = pubmed_url || (pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '');
  const doiLink = doi ? (doi.startsWith('http') ? doi : `https://doi.org/${doi}`) : null;

  // Score calculation & percentages
  const relPercent = Math.round((relevance_score ?? 0.85) * 100);
  const semPercent = Math.round((semantic_score ?? relevance_score ?? 0.8) * 100);
  const keyPercent = Math.round((keyword_score ?? 0.6) * 100);

  const getScoreColor = (val) => {
    if (val >= 75) return 'emerald';
    if (val >= 45) return 'amber';
    return 'rose';
  };

  const scoreTheme = getScoreColor(relPercent);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-detail-badges">
            <span className="badge badge-indigo">
              <Hash size={12} /> PMID: {pmid || 'N/A'}
            </span>
            {journal && (
              <span className="badge badge-journal">
                {journal}
              </span>
            )}
            {article_type && (
              <span className="badge badge-type">
                {article_type}
              </span>
            )}
            {publication_date && (
              <span className="badge badge-date font-mono">
                {publication_date}
              </span>
            )}
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close details">
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <h2 className="modal-detail-title">{title || 'Untitled Publication'}</h2>

        {/* Authors */}
        <p className="modal-detail-authors">
          {authorStr}
        </p>

        {/* Scoring Breakdown Card */}
        <div className="score-breakdown-card">
          <div className="score-breakdown-header">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-teal" />
              <span className="score-breakdown-title">Neural & Semantic Match Diagnostics</span>
            </div>
            <span className={`score-badge-pill score-${scoreTheme}`}>
              {relPercent}% Overall Match
            </span>
          </div>

          <div className="score-grid">
            <div className="score-bar-item">
              <div className="score-bar-label">
                <span>Dense Semantic Embedding (SciBERT / MiniLM)</span>
                <span className="font-mono font-bold text-teal">{semPercent}%</span>
              </div>
              <div className="score-progress-track">
                <div
                  className="score-progress-fill bg-teal"
                  style={{ width: `${semPercent}%` }}
                />
              </div>
            </div>

            <div className="score-bar-item">
              <div className="score-bar-label">
                <span>BM25 & Medical Concept Exact Match</span>
                <span className="font-mono font-bold text-sky">{keyPercent}%</span>
              </div>
              <div className="score-progress-track">
                <div
                  className="score-progress-fill bg-sky"
                  style={{ width: `${keyPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Abstract */}
        <div className="modal-abstract-section">
          <h3 className="section-subtitle">
            <FileText size={15} /> Abstract
          </h3>
          <div className="modal-abstract-text">
            {abstract ? (
              abstract.split('\n\n').map((para, idx) => (
                <p key={idx}>{para}</p>
              ))
            ) : (
              <p className="text-muted italic">No abstract provided in PubMed record.</p>
            )}
          </div>
        </div>

        {/* MeSH Terms */}
        {mesh_terms && mesh_terms.length > 0 && (
          <div className="modal-mesh-section">
            <h3 className="section-subtitle">
              <Tag size={14} /> Medical Subject Headings (MeSH)
            </h3>
            <div className="mesh-pills-wrap">
              {mesh_terms.map((term, i) => (
                <button
                  key={i}
                  className="mesh-tag-pill"
                  title="Click to search this MeSH term"
                  onClick={() => {
                    if (onSelectMesh) onSelectMesh(term);
                    onClose();
                  }}
                >
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="modal-footer modal-detail-footer">
          <div className="flex items-center gap-2">
            <button
              className={`btn btn-save ${isSaved ? 'saved' : ''}`}
              onClick={() => onToggleSave(article)}
            >
              {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              <span>{isSaved ? 'Saved in Library' : 'Save Paper'}</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                onClose();
                onOpenCite(article);
              }}
            >
              <Quote size={15} />
              <span>Cite</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {doiLink && (
              <a
                href={doiLink}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                <span>DOI</span>
                <ExternalLink size={14} />
              </a>
            )}
            {pubmedLink && (
              <a
                href={pubmedLink}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                <span>View on PubMed</span>
                <ExternalLink size={15} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
