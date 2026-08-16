import React from 'react';
import { X, Bookmark, Trash2, Download, ExternalLink, Quote, FileSpreadsheet, Code, BookOpen } from 'lucide-react';

export default function SavedArticlesDrawer({
  isOpen,
  onClose,
  savedArticles,
  onRemoveArticle,
  onClearAll,
  onOpenCite
}) {
  if (!isOpen) return null;

  // Export functions
  const exportAsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(savedArticles, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `saved_biomed_articles_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportAsCSV = () => {
    const headers = ['PMID', 'Title', 'Authors', 'Journal', 'Publication Date', 'DOI', 'Relevance Score', 'PubMed URL'];
    const rows = savedArticles.map((a) => [
      `"${a.pmid || ''}"`,
      `"${(a.title || '').replace(/"/g, '""')}"`,
      `"${(Array.isArray(a.authors) ? a.authors.join('; ') : a.authors || '').replace(/"/g, '""')}"`,
      `"${(a.journal || '').replace(/"/g, '""')}"`,
      `"${a.publication_date || ''}"`,
      `"${a.doi || ''}"`,
      `"${a.relevance_score ?? ''}"`,
      `"${a.pubmed_url || (a.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/` : '')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `saved_biomed_articles_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportAsBibTeX = () => {
    const entries = savedArticles.map((a) => {
      const authorStr = Array.isArray(a.authors) ? a.authors.join(' and ') : (a.authors || 'Unknown');
      const firstAuthor = Array.isArray(a.authors) && a.authors.length > 0 ? a.authors[0] : 'author';
      const year = a.publication_date ? a.publication_date.match(/\d{4}/)?.[0] || '2025' : '2025';
      const key = `${firstAuthor.replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '') || 'paper'}${year}_${a.pmid || 'id'}`;
      return `@article{${key},
  author    = {${authorStr}},
  title     = {${a.title || 'Untitled'}},
  journal   = {${a.journal || 'Journal'}},
  year      = {${year}},
  pmid      = {${a.pmid || ''}},
  doi       = {${a.doi || ''}},
  url       = {${a.pubmed_url || `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`}}
}`;
    }).join('\n\n');

    const blob = new Blob([entries], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `saved_biomed_citations_${Date.now()}.bib`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="flex items-center gap-2">
            <div className="drawer-icon-wrap">
              <Bookmark size={18} className="text-teal" />
            </div>
            <div>
              <h3 className="drawer-title">Research Library</h3>
              <p className="drawer-subtitle">
                {savedArticles.length} {savedArticles.length === 1 ? 'article' : 'articles'} bookmarked
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close library">
            <X size={18} />
          </button>
        </div>

        {/* Action Toolbar */}
        {savedArticles.length > 0 && (
          <div className="drawer-toolbar">
            <div className="drawer-export-group">
              <span className="export-label">Export:</span>
              <button className="btn-chip" onClick={exportAsBibTeX} title="Export as BibTeX">
                <Code size={13} />
                <span>BibTeX</span>
              </button>
              <button className="btn-chip" onClick={exportAsCSV} title="Export as CSV Spreadsheet">
                <FileSpreadsheet size={13} />
                <span>CSV</span>
              </button>
              <button className="btn-chip" onClick={exportAsJSON} title="Export as JSON">
                <Download size={13} />
                <span>JSON</span>
              </button>
            </div>
            <button className="btn-text-danger" onClick={onClearAll} title="Clear all saved articles">
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          </div>
        )}

        {/* Drawer Body */}
        <div className="drawer-body">
          {savedArticles.length === 0 ? (
            <div className="drawer-empty-state">
              <div className="drawer-empty-icon">
                <Bookmark size={32} />
              </div>
              <h4>Your Library is Empty</h4>
              <p>
                Bookmark research articles while exploring search results to build your reading list and batch export citations.
              </p>
            </div>
          ) : (
            <ul className="drawer-articles-list">
              {savedArticles.map((article, idx) => {
                const authorStr = Array.isArray(article.authors)
                  ? article.authors.slice(0, 2).join(', ') + (article.authors.length > 2 ? ' et al.' : '')
                  : (article.authors || 'Unknown author');

                const pubmedLink = article.pubmed_url || (article.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/` : '');

                return (
                  <li key={article.pmid || idx} className="drawer-article-card">
                    <div className="drawer-card-header">
                      <span className="badge badge-indigo font-mono">
                        PMID: {article.pmid || 'N/A'}
                      </span>
                      {article.journal && (
                        <span className="drawer-journal-pill">
                          {article.journal}
                        </span>
                      )}
                    </div>

                    <h4 className="drawer-article-title">{article.title}</h4>
                    <p className="drawer-article-meta">
                      {authorStr} · <span className="font-mono">{article.publication_date || ''}</span>
                    </p>

                    <div className="drawer-card-actions">
                      <button
                        className="btn-link-action text-teal"
                        onClick={() => onOpenCite(article)}
                      >
                        <Quote size={13} />
                        <span>Cite</span>
                      </button>

                      {pubmedLink && (
                        <a
                          href={pubmedLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-link-action text-sky"
                        >
                          <ExternalLink size={13} />
                          <span>PubMed</span>
                        </a>
                      )}

                      <button
                        className="btn-link-action text-danger"
                        onClick={() => onRemoveArticle(article.pmid)}
                        title="Remove from saved"
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
