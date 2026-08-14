import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional
import httpx
import logging

from app.config import PUBMED_BASE_URL, PUBMED_EMAIL, PUBMED_API_KEY

logger = logging.getLogger(__name__)
from app.utils.helpers import normalize_text

ESARCH_URL = f"{PUBMED_BASE_URL}/esearch.fcgi"
EFETCH_URL = f"{PUBMED_BASE_URL}/efetch.fcgi"


class PubMedService:
    def __init__(self) -> None:
        self.client = httpx.Client(timeout=15.0)

    def search_ids(
        self,
        term: str,
        page: int = 1,
        limit: int = 10,
    ) -> Dict[str, Any]:
        page = max(1, int(page or 1))
        limit = max(1, int(limit or 10))

        params = {
            "db": "pubmed",
            "retmode": "json",
            "term": term,
            "retstart": (page - 1) * limit,
            "retmax": limit,
            "usehistory": "n",
            "tool": "bio_semantic_search",
        }
        if PUBMED_EMAIL:
            params["email"] = PUBMED_EMAIL
        if PUBMED_API_KEY:
            params["api_key"] = PUBMED_API_KEY

        safe_params = {k: v for k, v in params.items() if k != "api_key"}
        logger.info("ESearch request final_pubmed_query=%s params=%s", term, safe_params)

        response = self.client.get(ESARCH_URL, params=params)
        response.raise_for_status()
        payload = response.json()

        esr = payload.get("esearchresult", {}) if isinstance(payload, dict) else {}
        if not isinstance(esr, dict):
            logger.warning("PubMed ESearch response did not include esearchresult: %s", payload)
            return {"count": 0, "ids": []}

        count_raw = esr.get("count", "0")
        try:
            count = int(str(count_raw or "0"))
        except (TypeError, ValueError):
            count = 0

        ids = esr.get("idlist", []) or []
        ids = [str(item) for item in ids]

        logger.info(
            "PubMed ESearch summary: final_pubmed_query=%s total_count=%s pmids_returned=%s",
            term,
            count,
            len(ids),
        )
        return {"count": count, "ids": ids}

    def fetch_articles(self, ids: List[str]) -> List[Dict[str, Any]]:
        if not ids:
            return []
        params = {
            "db": "pubmed",
            "retmode": "xml",
            "id": ",".join(ids),
        }
        if PUBMED_EMAIL:
            params["email"] = PUBMED_EMAIL
        if PUBMED_API_KEY:
            params["api_key"] = PUBMED_API_KEY

        response = self.client.get(EFETCH_URL, params=params)
        response.raise_for_status()
        articles = self.parse_pubmed_xml(response.text)
        logger.info("PubMed EFetch summary: requested_pmid_count=%s fetched_articles=%s", len(ids), len(articles))
        return articles

    def parse_pubmed_xml(self, xml_text: str) -> List[Dict[str, Any]]:
        root = ET.fromstring(xml_text)
        articles = []

        for article in root.findall('.//PubmedArticle'):
            medline = article.find('MedlineCitation')
            article_data = medline.find('Article') if medline is not None else None
            pmid_el = medline.find('PMID') if medline is not None else None
            pmid = pmid_el.text if pmid_el is not None else ""

            title = article_data.find('ArticleTitle').text if article_data is not None and article_data.find('ArticleTitle') is not None else ""
            abstract_text = self._extract_abstract(article_data)
            authors = self._extract_authors(article_data)
            journal = self._extract_journal(article_data)
            publication_date = self._extract_publication_date(article_data)
            article_type = self._extract_article_type(article_data)
            doi = self._extract_doi(article_data)
            mesh_terms = self._extract_mesh_terms(medline)
            publication_types = self._extract_publication_types(article_data)
            free_full_text = self._extract_free_full_text(article)

            articles.append(
                {
                    "pmid": pmid,
                    "title": normalize_text(title),
                    "abstract": normalize_text(abstract_text),
                    "authors": authors,
                    "journal": journal,
                    "publication_date": publication_date,
                    "article_type": article_type,
                    "mesh_terms": mesh_terms,
                    "doi": doi,
                    "publication_types": publication_types,
                    "free_full_text": free_full_text,
                }
            )
        return articles

    def _extract_abstract(self, article_data: Optional[ET.Element]) -> str:
        if article_data is None:
            return ""
        abstract = article_data.find('Abstract')
        if abstract is None:
            return ""
        parts = [normalize_text(''.join(node.itertext())) for node in abstract.findall('AbstractText')]
        return ' '.join([part for part in parts if part])

    def _extract_authors(self, article_data: Optional[ET.Element]) -> List[str]:
        authors = []
        if article_data is None:
            return authors
        author_list = article_data.find('AuthorList')
        if author_list is None:
            return authors
        for author in author_list.findall('Author'):
            last = author.find('LastName')
            fore = author.find('ForeName')
            initials = author.find('Initials')
            name = ''
            if fore is not None and last is not None:
                name = f"{fore.text} {last.text}"
            elif last is not None:
                name = last.text
            elif author.find('CollectiveName') is not None:
                name = author.find('CollectiveName').text or ''
            if name:
                authors.append(name)
        return authors

    def _extract_journal(self, article_data: Optional[ET.Element]) -> str:
        if article_data is None:
            return ""
        journal = article_data.find('Journal')
        if journal is None:
            return ""
        journal_title = journal.find('Title')
        return journal_title.text if journal_title is not None else ""

    def _extract_publication_date(self, article_data: Optional[ET.Element]) -> str:
        if article_data is None:
            return ""
        journal = article_data.find('Journal')
        if journal is None:
            return ""
        pub_date = journal.find('JournalIssue/PubDate')
        if pub_date is None:
            return ""
        year = pub_date.find('Year')
        medline_date = pub_date.find('MedlineDate')
        if year is not None:
            return year.text or ""
        if medline_date is not None:
            return medline_date.text or ""
        return ""

    def _extract_article_type(self, article_data: Optional[ET.Element]) -> str:
        if article_data is None:
            return ""
        article_types = article_data.findall('PublicationTypeList/PublicationType')
        if not article_types:
            return ""
        return article_types[0].text or ""

    def _extract_doi(self, article_data: Optional[ET.Element]) -> str:
        if article_data is None:
            return ""
        el = article_data.find("ELocationID[@EIdType='doi']")
        return el.text if el is not None else ""

    def _extract_mesh_terms(self, medline: Optional[ET.Element]) -> List[str]:
        if medline is None:
            return []
        mesh_list = medline.findall('MeshHeadingList/MeshHeading')
        terms = []
        for mesh in mesh_list:
            descriptor = mesh.find('DescriptorName')
            if descriptor is not None and descriptor.text:
                terms.append(descriptor.text)
        return terms

    def _extract_publication_types(self, article_data: Optional[ET.Element]) -> List[str]:
        if article_data is None:
            return []
        types = [t.text for t in article_data.findall('PublicationTypeList/PublicationType') if t.text]
        return types

    def _extract_free_full_text(self, article: ET.Element) -> bool:
        access_type = article.find('.//PublicationStatus')
        return False
