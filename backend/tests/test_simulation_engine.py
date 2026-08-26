import pytest
import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token():
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin@cityvision.bel.in", "password": "admin123"}
    )
    return res.json()["access_token"]

def test_simulation_lifecycle_and_honest_labeling():
    token = get_auth_token()

    # 1. Check initial status
    res_status = client.get(
        "/api/v1/simulation/status",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_status.status_code == 200
    st = res_status.json()
    assert "label" in st
    assert st["label"] == "DEMO / SYNTHETIC DATA"

    # 2. Start simulation
    res_start = client.post(
        "/api/v1/simulation/start",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_start.status_code == 200
    assert res_start.json()["is_running"] is True

    # Allow a brief moment for emission step
    time.sleep(1.0)

    # 3. Stop simulation
    res_stop = client.post(
        "/api/v1/simulation/stop",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_stop.status_code == 200
    assert res_stop.json()["is_running"] is False
