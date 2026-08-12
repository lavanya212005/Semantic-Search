import React from 'react';

const ArticleCard = ({ article }) => {
  return (
    <li className="article-card">
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
  );
};

export default ArticleCard;
