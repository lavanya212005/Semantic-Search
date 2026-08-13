from app.services.pubmed_service import PubMedService
from app.utils.helpers import build_pubmed_term

svc = PubMedService()
term = build_pubmed_term("heart attack")
print('term:', term)
try:
    res = svc.search_ids(term, page=1, limit=10)
    print('count:', res.get('count'))
    print('ids:', res.get('ids'))
except Exception as e:
    print('error:', repr(e))
