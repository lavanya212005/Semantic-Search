from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
resp = client.get('/api/search', params={'query':'heart attack', 'semantic_only':'true','limit':5})
print('status', resp.status_code)
try:
    print(resp.json())
except Exception as e:
    print('json error', e)
