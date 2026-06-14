import pytest
from fastapi.testclient import TestClient

# Test that doesn't require DB
def test_root():
    # Mock the app import to avoid DB connection
    from unittest.mock import patch
    with patch('server.AsyncIOMotorClient'):
        from server import app
        client = TestClient(app)
        response = client.get("/api/")
        assert response.status_code == 200
        assert response.json() == {"message": "Hello World"}

def test_rules_translate():
    from unittest.mock import patch
    with patch('server.AsyncIOMotorClient'):
        from server import app
        client = TestClient(app)
        payload = {"text": "if emergency then priority"}
        response = client.post("/api/rules/translate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "ok" in data
        # Assuming translation works, check if rule is returned
        if data["ok"]:
            assert "rule" in data

def test_co2_classify_bom():
    from unittest.mock import patch
    with patch('server.AsyncIOMotorClient'):
        from server import app
        client = TestClient(app)
        response = client.post("/api/co2/classify", json={"valor": 30.0})
        assert response.status_code == 200
        data = response.json()
        assert data["valor"] == 30.0
        assert data["classificacao"] == "Bom"

def test_co2_classify_aceitavel():
    from unittest.mock import patch
    with patch('server.AsyncIOMotorClient'):
        from server import app
        client = TestClient(app)
        response = client.post("/api/co2/classify", json={"valor": 120.0})
        assert response.status_code == 200
        assert response.json()["classificacao"] == "Aceitável"

def test_co2_classify_elevado():
    from unittest.mock import patch
    with patch('server.AsyncIOMotorClient'):
        from server import app
        client = TestClient(app)
        response = client.post("/api/co2/classify", json={"valor": 300.0})
        assert response.status_code == 200
        assert response.json()["classificacao"] == "Elevado"

def test_co2_classify_limite_bom():
    """Valor exatamente no limite superior de Bom (50 kg)"""
    from unittest.mock import patch
    with patch('server.AsyncIOMotorClient'):
        from server import app
        client = TestClient(app)
        response = client.post("/api/co2/classify", json={"valor": 50.0})
        assert response.status_code == 200
        assert response.json()["classificacao"] == "Bom"

def test_co2_classify_limite_aceitavel():
    """Valor exatamente no limite superior de Aceitável (200 kg)"""
    from unittest.mock import patch
    with patch('server.AsyncIOMotorClient'):
        from server import app
        client = TestClient(app)
        response = client.post("/api/co2/classify", json={"valor": 200.0})
        assert response.status_code == 200
        assert response.json()["classificacao"] == "Aceitável"

def test_co2_classify_zero():
    from unittest.mock import patch
    with patch('server.AsyncIOMotorClient'):
        from server import app
        client = TestClient(app)
        response = client.post("/api/co2/classify", json={"valor": 0.0})
        assert response.status_code == 200
        assert response.json()["classificacao"] == "Bom"

def test_co2_classify_payload_invalido():
    from unittest.mock import patch
    with patch('server.AsyncIOMotorClient'):
        from server import app
        client = TestClient(app)
        response = client.post("/api/co2/classify", json={"valor": "nao_e_numero"})
        assert response.status_code == 422

# Skip DB-dependent tests since MongoDB is not running
@pytest.mark.skip(reason="MongoDB not available in test environment")
def test_status_create():
    pass

@pytest.mark.skip(reason="MongoDB not available in test environment")
def test_metrics_save():
    pass

@pytest.mark.skip(reason="MongoDB not available in test environment")
def test_campaigns_save():
    pass