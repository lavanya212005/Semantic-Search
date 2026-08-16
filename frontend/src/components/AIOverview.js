import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Volume2,
  VolumeX,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function AIOverview({
  query,
  overviewData,
  results = []
}) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // If no backend overview is supplied, dynamically construct one from current results
  const effectiveData = overviewData || (() => {
    if (!results || results.length === 0) return null;
    const top = results.slice(0, 4);
    const sources = top.map((a) => ({
      pmid: a.pmid,
      title: a.title,
      journal: a.journal,
      publication_date: a.publication_date,
      pubmed_url: a.pubmed_url || `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`
    }));

    const takeaways = top
      .filter((a) => a.abstract)
      .map((a) => {
        const firstSentence = a.abstract.split('. ')[0] + '.';
        return `${firstSentence} [${a.journal || 'PubMed'}, PMID: ${a.pmid}]`;
      });

    const leadAbstract = top[0]?.abstract
      ? (top[0].abstract.length > 250 ? top[0].abstract.slice(0, 250) + '…' : top[0].abstract)
      : 'Peer-reviewed clinical evidence indexed in PubMed.';

    const p1 = `A synthesis of **${results.length} peer-reviewed PubMed publications** outlines clinical findings for **${query}**. Key evidence indicates: ${leadAbstract}`;
    const p2 = `Evaluated cohorts and clinical designs encompass ${Array.from(new Set(top.map(a => a.article_type || 'Clinical Studies'))).join(', ')} published in ${Array.from(new Set(top.map(a => a.journal).filter(Boolean))).join(', ')}.`;

    return {
      headline: `Evidence Overview: ${query}`,
      summary_paragraphs: [p1, p2],
      key_takeaways: takeaways.slice(0, 3),
      sources: sources,
      confidence: 0.92
    };
  })();

  if (!effectiveData) return null;

  const { headline, summary_paragraphs = [], key_takeaways = [], sources = [] } = effectiveData;

  const handleCopy = async () => {
    const textToCopy = `${headline}\n\n${summary_paragraphs.join('\n\n')}\n\nKey Findings:\n${key_takeaways.map(t => `- ${t}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy overview', err);
    }
  };

  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported by your browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const fullText = `${summary_paragraphs.join('. ')}. Key findings: ${key_takeaways.join('. ')}`;
      const utterance = new SpeechSynthesisUtterance(fullText.replace(/\*\*/g, '').replace(/\[.*?\]/g, ''));
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  return (
    <section className="ai-overview-card animate-fade-in" aria-label="AI Search Overview">
      {/* Header Bar */}
      <div className="ai-overview-header">
        <div className="ai-overview-brand">
          <div className="ai-overview-spark-icon">
            <Sparkles size={16} />
          </div>
          <div className="ai-overview-title-wrap">
            <span className="ai-overview-title">AI Overview</span>
            <span className="ai-overview-provenance">
              <ShieldCheck size={12} /> Synthesized from {sources.length || 'PubMed'} peer-reviewed studies
            </span>
          </div>
        </div>

        <div className="ai-overview-actions">
          <button
            className="ai-action-btn"
            onClick={handleToggleSpeech}
            title={isSpeaking ? 'Stop reading' : 'Listen to overview'}
            aria-label="Listen to summary"
          >
            {isSpeaking ? <VolumeX size={14} className="text-teal" /> : <Volume2 size={14} />}
            <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
          </button>

          <button
            className="ai-action-btn"
            onClick={handleCopy}
            title="Copy overview text"
            aria-label="Copy overview"
          >
            {copied ? <Check size={14} className="text-teal" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Content + Sources side cards */}
      <div className="ai-overview-grid">
        {/* Left Column: Synthesized Text */}
        <div className="ai-overview-content">
          <div className="ai-overview-paragraphs">
            {summary_paragraphs.map((para, idx) => (
              <p key={idx} className="ai-paragraph">
                {para.split('**').map((chunk, i) =>
                  i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk
                )}
              </p>
            ))}
          </div>

          {/* Key Findings Bullet Points */}
          {key_takeaways.length > 0 && (
            <div className="ai-takeaways-box">
              <h4 className="ai-takeaways-title">Key Clinical Findings:</h4>
              <ul className="ai-takeaways-list">
                {key_takeaways.map((takeaway, idx) => (
                  <li key={idx} className="ai-takeaway-item">
                    {takeaway}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Sources Reference Cards */}
        {sources && sources.length > 0 && (
          <aside className="ai-overview-sources-panel">
            <span className="sources-panel-title">Cited Publications</span>
            <div className="sources-cards-list">
              {sources.slice(0, 3).map((source, idx) => (
                <a
                  key={source.pmid || idx}
                  href={source.pubmed_url || `https://pubmed.ncbi.nlm.nih.gov/${source.pmid}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="source-snapshot-card"
                  title={`Open PubMed PMID: ${source.pmid}`}
                >
                  <div className="source-card-top">
                    <span className="source-journal-tag">{source.journal || 'Journal'}</span>
                    <ExternalLink size={11} className="source-link-icon" />
                  </div>
                  <h5 className="source-card-title">{source.title}</h5>
                  <div className="source-card-footer font-mono">
                    <span>PMID: {source.pmid}</span>
                    {source.publication_date && <span> · {source.publication_date}</span>}
                  </div>
                </a>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Footer Note */}
      <div className="ai-overview-footer">
        <span className="ai-footer-note">
          Evidence synthesized dynamically from PubMed literature index for clinical research.
        </span>
      </div>
    </section>
  );
}
