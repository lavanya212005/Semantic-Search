import React, { useState } from 'react';
import { X, Copy, Check, Download, BookOpen, FileText } from 'lucide-react';

export default function CitationModal({ article, onClose }) {
  const [format, setFormat] = useState('apa');
  const [copied, setCopied] = useState(false);

  if (!article) return null;

  const {
    title = 'Untitled Article',
    authors = [],
    journal = 'Biomedical Journal',
    publication_date = '2025',
    pmid = '',
    doi = '',
    pubmed_url = ''
  } = article;

  // Format author list
  const authorStr = Array.isArray(authors) ? authors.join(', ') : (authors || 'Unknown Author');
  const firstAuthor = Array.isArray(authors) && authors.length > 0 ? authors[0] : (typeof authors === 'string' && authors ? authors.split(',')[0] : 'Author');
  const year = publication_date ? publication_date.match(/\d{4}/)?.[0] || publication_date : '2025';
  const bibtexKey = `${firstAuthor.replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '') || 'biomed'}${year}_${pmid || 'ref'}`;

  // Formatted citations
  const citations = {
    apa: `${authorStr}. (${year}). ${title}. ${journal}${doi ? `. https://doi.org/${doi}` : ''}${pmid ? ` (PMID: ${pmid})` : ''}`,
    mla: `${authorStr}. "${title}." ${journal}, ${publication_date || year}${doi ? `, doi:${doi}` : ''}.`,
    chicago: `${authorStr}. "${title}." ${journal} (${publication_date || year}).${doi ? ` https://doi.org/${doi}` : ''}`,
    bibtex: `@article{${bibtexKey},
  author    = {${authorStr}},
  title     = {${title}},
  journal   = {${journal}},
  year      = {${year}},
  pmid      = {${pmid}},
  doi       = {${doi || ''}},
  url       = {${pubmed_url || `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}}
}`,
    ris: `TY  - JOUR
TI  - ${title}
AU  - ${authorStr}
JO  - ${journal}
PY  - ${year}
PMID - ${pmid}
DO  - ${doi || ''}
UR  - ${pubmed_url || `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
ER  - `
  };

  const activeCitation = citations[format] || citations.apa;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCitation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownload = () => {
    const ext = format === 'ris' ? 'ris' : format === 'bibtex' ? 'bib' : 'txt';
    const blob = new Blob([activeCitation], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `citation-${pmid || 'article'}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <BookOpen size={20} className="modal-icon text-teal" />
            <h3 className="modal-title">Cite this Article</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-article-preview">
          <h4 className="modal-article-title">{title}</h4>
          <p className="modal-article-meta">{authorStr} · <span className="text-teal font-mono">{journal}</span> ({year})</p>
        </div>

        {/* Format Selector Tabs */}
        <div className="citation-format-tabs">
          {[
            { id: 'apa', label: 'APA (7th)' },
            { id: 'mla', label: 'MLA (9th)' },
            { id: 'chicago', label: 'Chicago' },
            { id: 'bibtex', label: 'BibTeX' },
            { id: 'ris', label: 'RIS / EndNote' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`citation-tab ${format === tab.id ? 'active' : ''}`}
              onClick={() => setFormat(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Citation Box */}
        <div className="citation-box-wrapper">
          <pre className="citation-box font-mono">{activeCitation}</pre>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleDownload}>
            <Download size={15} />
            <span>Download ({format.toUpperCase()})</span>
          </button>
          <button className="btn btn-primary" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Citation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
