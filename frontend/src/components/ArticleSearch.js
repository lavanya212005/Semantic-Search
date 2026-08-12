import React, { useMemo, useState } from "react";
import { Search, ArrowUpRight, ChevronDown, ChevronUp, SlidersHorizontal, FileSearch } from "lucide-react";

/* ---------------------------------------------------------
   Design tokens — kept local so the file is drop-in portable
--------------------------------------------------------- */
const ink = "#1B2A33";       // primary text, near-charcoal teal
const inkSoft = "#4A5A61";   // secondary text
const paper = "#EFF2EF";     // page background, cool sage-white
const cardPaper = "#F8F8F4"; // card background, warm index-card white
const line = "#D6D2C4";      // hairline borders, warm stone
const teal = "#2F6E62";      // high relevance / primary accent
const tealDeep = "#1F4A42";
const rust = "#B8562A";      // low-to-moderate accent / stamp ink
const amber = "#9C6B1F";     // moderate relevance

const fontDisplay = "'Iowan Old Style','Palatino Linotype','Book Antiqua',Georgia,serif";
const fontBody = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
const fontMono = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

/* ---------------------------------------------------------
   Relevance tier — drives the stamp color and label
--------------------------------------------------------- */
function getTier(score) {
  if (score == null) return { label: "unscored", color: inkSoft, bg: "#E7E5DD" };
  if (score >= 0.8) return { label: "strong match", color: tealDeep, bg: "#DCE9E4" };
  if (score >= 0.5) return { label: "moderate match", color: amber, bg: "#EFE3CC" };
  return { label: "weak match", color: rust, bg: "#F1DFD3" };
}

/* ---------------------------------------------------------
   ArticleCard — the enhanced version of the original component
   Props: article (object), rank (number, 1-indexed position in results)
--------------------------------------------------------- */
export function ArticleCard({ article, rank }) {
  const [expanded, setExpanded] = useState(false);

  const {
    title,
    authors,
    journal,
    publication_date,
    abstract,
    relevance_score,
    pubmed_url,
  } = article;

  const tier = getTier(relevance_score);
  const scoreDisplay =
    typeof relevance_score === "number" ? relevance_score.toFixed(3) : "N/A";

  const abstractText = abstract || "No abstract available for this record.";
  const isLong = abstractText.length > 260;
  const shownAbstract =
    expanded || !isLong ? abstractText : abstractText.slice(0, 260).trim() + "…";

  return (
    <li
      style={{
        listStyle: "none",
        background: cardPaper,
        border: `0.5px solid ${line}`,
        borderLeft: `3px solid ${tier.color}`,
        borderRadius: "2px",
        padding: "1.1rem 1.25rem 1rem",
        fontFamily: fontBody,
        position: "relative",
      }}
    >
      {/* Top row: rank + journal tab + relevance stamp */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            style={{
              fontFamily: fontMono,
              fontSize: "11px",
              color: inkSoft,
              flexShrink: 0,
            }}
          >
            {rank != null ? `No. ${String(rank).padStart(2, "0")}` : ""}
          </span>
          <span
            style={{
              fontFamily: fontMono,
              fontSize: "11px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: tealDeep,
              background: "#DCE9E4",
              padding: "2px 8px",
              borderRadius: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {journal || "Journal unlisted"}
          </span>
        </div>

        {/* Relevance stamp */}
        <div
          role="img"
          aria-label={`Relevance score ${scoreDisplay}, ${tier.label}`}
          style={{
            fontFamily: fontMono,
            fontSize: "11px",
            color: tier.color,
            border: `1px dashed ${tier.color}`,
            borderRadius: "3px",
            padding: "3px 8px",
            transform: "rotate(-2deg)",
            flexShrink: 0,
            lineHeight: 1.3,
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600 }}>{scoreDisplay}</div>
          <div style={{ fontSize: "9px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {tier.label}
          </div>
        </div>
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily: fontDisplay,
          fontSize: "19px",
          fontWeight: 600,
          color: ink,
          lineHeight: 1.35,
          margin: "0 0 4px",
        }}
      >
        {title || "Untitled record"}
      </h2>

      {/* Authors + date */}
      <p
        style={{
          fontFamily: fontDisplay,
          fontStyle: "italic",
          fontSize: "13.5px",
          color: inkSoft,
          margin: "0 0 10px",
        }}
      >
        {authors || "Unknown authors"}
        {publication_date && (
          <span style={{ fontFamily: fontMono, fontStyle: "normal", fontSize: "12px" }}>
            {" "}
            · {publication_date}
          </span>
        )}
      </p>

      {/* Abstract */}
      <p style={{ fontSize: "14px", color: ink, lineHeight: 1.6, margin: "0 0 8px" }}>
        {shownAbstract}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            fontFamily: fontBody,
            fontSize: "12.5px",
            color: tealDeep,
            background: "transparent",
            border: "none",
            padding: 0,
            marginBottom: "10px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {expanded ? "Show less" : "Read full abstract"}
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      )}

      {/* Footer: link */}
      <div
        className="flex items-center justify-end"
        style={{ borderTop: `0.5px solid ${line}`, paddingTop: "8px", marginTop: "4px" }}
      >
        {pubmed_url ? (
          <a
            href={pubmed_url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: fontBody,
              fontSize: "13px",
              fontWeight: 500,
              color: "#fff",
              background: tealDeep,
              padding: "6px 12px",
              borderRadius: "4px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            View on PubMed
            <ArrowUpRight size={14} />
          </a>
        ) : (
          <span style={{ fontSize: "12px", color: inkSoft, fontStyle: "italic" }}>
            No external record linked
          </span>
        )}
      </div>
    </li>
  );
}

/* ---------------------------------------------------------
   Skeleton loading card
--------------------------------------------------------- */
function SkeletonCard() {
  const bar = { background: "#E3E1D8", borderRadius: "3px" };
  return (
    <li
      style={{
        listStyle: "none",
        background: cardPaper,
        border: `0.5px solid ${line}`,
        borderLeft: `3px solid ${line}`,
        borderRadius: "2px",
        padding: "1.1rem 1.25rem 1rem",
      }}
      aria-hidden="true"
    >
      <div style={{ ...bar, width: "40%", height: "12px", marginBottom: "12px" }} />
      <div style={{ ...bar, width: "80%", height: "18px", marginBottom: "8px" }} />
      <div style={{ ...bar, width: "50%", height: "12px", marginBottom: "14px" }} />
      <div style={{ ...bar, width: "100%", height: "10px", marginBottom: "6px" }} />
      <div style={{ ...bar, width: "95%", height: "10px", marginBottom: "6px" }} />
      <div style={{ ...bar, width: "70%", height: "10px" }} />
    </li>
  );
}

/* ---------------------------------------------------------
   Sample data — clearly-labeled demo records for presentation
--------------------------------------------------------- */
const SAMPLE_ARTICLES = [
  {
    title: "Non-pharmacological pain management strategies in adult primary care: a practice review",
    authors: "Okafor R, Lindqvist M, Sharma P",
    journal: "J Adv Nurs Pract",
    publication_date: "2025-11",
    abstract:
      "This review synthesizes recent practice-based evidence on non-pharmacological interventions for chronic pain management in primary care settings, with attention to protocols suitable for nurse practitioner-led clinics. It examines behavioral, physical, and mind-body approaches, and offers guidance for integrating them alongside conventional prescribing pathways where appropriate.",
    relevance_score: 0.912,
    pubmed_url: "https://pubmed.ncbi.nlm.nih.gov/",
  },
  {
    title: "Scope-of-practice variation and prescribing autonomy among nurse practitioners: a cross-state comparison",
    authors: "Delgado A, Whitfield J",
    journal: "Health Policy Q",
    publication_date: "2025-08",
    abstract:
      "Drawing on regulatory data across multiple jurisdictions, this study compares prescribing authority frameworks for nurse practitioners and their association with patient access outcomes in underserved regions.",
    relevance_score: 0.774,
    pubmed_url: "https://pubmed.ncbi.nlm.nih.gov/",
  },
  {
    title: "Telehealth follow-up adherence in chronic disease management: a cohort analysis",
    authors: "Nguyen T, Petrova I, Osei K, Baxter L",
    journal: "Telemed J E Health",
    publication_date: "2025-05",
    abstract:
      "A twelve-month cohort study evaluating adherence patterns to telehealth follow-up visits among patients with chronic conditions managed by advanced practice providers, identifying key predictors of visit completion.",
    relevance_score: 0.548,
    pubmed_url: "https://pubmed.ncbi.nlm.nih.gov/",
  },
  {
    title: "Patient-reported outcomes following nurse-led versus physician-led hypertension clinics",
    authors: "Fernsby G",
    journal: "",
    publication_date: "2024-12",
    abstract:
      "",
    relevance_score: 0.291,
    pubmed_url: "",
  },
];

/* ---------------------------------------------------------
   Demo shell — search, sort, and state handling
--------------------------------------------------------- */
export default function ArticleSearchDemo() {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    let list = SAMPLE_ARTICLES.filter((a) => {
      const haystack = `${a.title} ${a.authors} ${a.journal}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
    list = [...list].sort((a, b) =>
      sortBy === "relevance"
        ? (b.relevance_score || 0) - (a.relevance_score || 0)
        : new Date(b.publication_date || 0) - new Date(a.publication_date || 0)
    );
    return list;
  }, [query, sortBy]);

  return (
    <div
      style={{
        background: paper,
        fontFamily: fontBody,
        color: ink,
        minHeight: "100%",
        padding: "2rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p
            style={{
              fontFamily: fontMono,
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: rust,
              margin: "0 0 4px",
            }}
          >
            CTS · NPN — literature search
          </p>
          <h1
            style={{
              fontFamily: fontDisplay,
              fontSize: "28px",
              fontWeight: 600,
              margin: 0,
              color: ink,
            }}
          >
            Article relevance index
          </h1>
          <p style={{ fontSize: "13.5px", color: inkSoft, marginTop: "4px" }}>
            Sample results shown for demonstration. Connect a live PubMed query to populate real records.
          </p>
        </div>

        {/* Controls */}
        <div
          className="flex items-center gap-2"
          style={{
            marginBottom: "1.25rem",
            border: `0.5px solid ${line}`,
            background: cardPaper,
            borderRadius: "4px",
            padding: "6px 10px",
          }}
        >
          <Search size={16} color={inkSoft} aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, or journal"
            aria-label="Search articles"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "14px",
              fontFamily: fontBody,
              color: ink,
            }}
          />
          <SlidersHorizontal size={14} color={inkSoft} aria-hidden="true" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort results"
            style={{
              border: "none",
              background: "transparent",
              fontSize: "13px",
              fontFamily: fontBody,
              color: inkSoft,
              cursor: "pointer",
            }}
          >
            <option value="relevance">Sort: relevance</option>
            <option value="date">Sort: date</option>
          </select>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <button
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 900);
            }}
            style={{
              fontSize: "12px",
              fontFamily: fontMono,
              color: inkSoft,
              background: "transparent",
              border: `0.5px solid ${line}`,
              borderRadius: "3px",
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            simulate refresh
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <ul style={{ display: "flex", flexDirection: "column", gap: "14px", margin: 0, padding: 0 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              border: `1px dashed ${line}`,
              borderRadius: "4px",
              color: inkSoft,
            }}
          >
            <FileSearch size={28} style={{ margin: "0 auto 10px" }} aria-hidden="true" />
            <p style={{ fontSize: "14px", margin: 0 }}>
              No records match "{query}". Try a different search term.
            </p>
          </div>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: "14px", margin: 0, padding: 0 }}>
            {filtered.map((article, i) => (
              <ArticleCard key={i} article={article} rank={i + 1} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}