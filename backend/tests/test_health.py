from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "City Vision" in data["name"]
    assert data["city"] == "Visakhapatnam"

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "postgres" in data
    assert "redis" in data
    assert data["service"] == "city-vision-backend"
