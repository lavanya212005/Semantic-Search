import React from 'react';
import { Tag, Sparkles, Activity, Layers, Filter } from 'lucide-react';

export default function AnalyticsBar({
  topMeshTerms = [],
  concepts = [],
  totalResults = 0,
  results = [],
  isSemanticOnly = false,
  onSelectMesh
}) {
  if (!results || results.length === 0) return null;

  // Calculate quick stats
  const avgSemantic = results.length > 0
    ? (results.reduce((acc, curr) => acc + (curr.semantic_score ?? curr.relevance_score ?? 0.8), 0) / results.length * 100).toFixed(1)
    : '0';

  const maxMeshCount = topMeshTerms.length > 0 ? Math.max(...topMeshTerms.map(m => m.count || 1)) : 1;

  return (
    <div className="analytics-bar-card animate-fade-in">
      {/* Top Overview Row */}
      <div className="analytics-stat-row">
        <div className="analytics-stat-item">
          <div className="analytics-stat-icon-wrap bg-teal-subtle">
            <Sparkles size={16} className="text-teal" />
          </div>
          <div>
            <div className="analytics-stat-label">Neural Similarity</div>
            <div className="analytics-stat-value text-teal">{avgSemantic}% <span className="stat-unit">avg match</span></div>
          </div>
        </div>

        <div className="analytics-stat-item">
          <div className="analytics-stat-icon-wrap bg-sky-subtle">
            <Activity size={16} className="text-sky" />
          </div>
          <div>
            <div className="analytics-stat-label">PubMed Index Pool</div>
            <div className="analytics-stat-value text-primary">{totalResults.toLocaleString()} <span className="stat-unit">records</span></div>
          </div>
        </div>

        <div className="analytics-stat-item">
          <div className="analytics-stat-icon-wrap bg-indigo-subtle">
            <Layers size={16} className="text-indigo" />
          </div>
          <div>
            <div className="analytics-stat-label">Retrieval Architecture</div>
            <div className="analytics-stat-value text-indigo font-mono">
              {isSemanticOnly ? 'Pure Dense Embeddings' : 'Hybrid Dense + BM25'}
            </div>
          </div>
        </div>
      </div>

      {/* Extracted Clinical Concepts */}
      {concepts && concepts.length > 0 && (
        <div className="analytics-concepts-row">
          <div className="analytics-section-title">
            <Sparkles size={13} className="text-teal" />
            <span>Extracted Clinical Entities:</span>
          </div>
          <div className="concepts-list">
            {concepts.map((concept, idx) => (
              <span key={idx} className="concept-chip">
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top MeSH Distribution Cloud */}
      {topMeshTerms && topMeshTerms.length > 0 && (
        <div className="analytics-mesh-row">
          <div className="analytics-section-title">
            <Tag size={13} className="text-sky" />
            <span>Top Medical Subject Headings (MeSH Taxonomy):</span>
          </div>
          <div className="mesh-cloud">
            {topMeshTerms.slice(0, 8).map((item, idx) => {
              const term = typeof item === 'string' ? item : item.term;
              const count = typeof item === 'object' ? item.count : null;
              const relativeWeight = count ? Math.min(100, Math.max(30, (count / maxMeshCount) * 100)) : 50;

              return (
                <button
                  key={idx}
                  className="mesh-interactive-pill"
                  onClick={() => onSelectMesh && onSelectMesh(term)}
                  title={`Refine search with MeSH: ${term}`}
                >
                  <span className="mesh-pill-text">{term}</span>
                  {count != null && (
                    <span className="mesh-pill-count" style={{ opacity: Math.max(0.6, relativeWeight / 100) }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
