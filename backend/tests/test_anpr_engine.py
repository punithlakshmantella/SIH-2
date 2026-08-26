import pytest
import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token():
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "police@cityvision.bel.in", "password": "police123"}
    )
    return res.json()["access_token"]

def test_list_sample_footage():
    token = get_auth_token()
    response = client.get(
        "/api/v1/anpr/samples",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "samples" in data
    assert len(data["samples"]) >= 7
    
    filenames = [s["filename"] for s in data["samples"]]
    assert "clean_ap39ab1234.jpg" in filenames
    assert "degraded_toll_ap39ab1234.jpg" in filenames

def test_clean_sample_high_confidence():
    token = get_auth_token()
    
    # 1. First Run
    res1 = client.post(
        "/api/v1/anpr/inference",
        data={"sample_filename": "clean_ap39ab1234.jpg"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["normalized_plate"] == "AP39AB1234"
    assert data1["confidence"] >= 0.94
    assert data1["is_low_confidence"] is False
    assert data1["confidence_label"] == "HIGH CONFIDENCE"
    assert "grayscale_conversion" in data1["preprocessing_applied"]

    # 2. Second Run (Verifying consistency, not random numbers)
    res2 = client.post(
        "/api/v1/anpr/inference",
        data={"sample_filename": "clean_ap39ab1234.jpg"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data1["normalized_plate"] == data2["normalized_plate"]
    assert data1["confidence"] == data2["confidence"]

def test_degraded_toll_sample_low_confidence():
    token = get_auth_token()

    # Inference on degraded toll sample (Demo Scenario)
    res = client.post(
        "/api/v1/anpr/inference",
        data={"sample_filename": "degraded_toll_ap39ab1234.jpg"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    # Must visibly drop confidence and flag character
    assert data["normalized_plate"] == "AP39A?1234"
    assert data["confidence"] <= 0.68
    assert data["is_low_confidence"] is True
    assert data["confidence_label"] == "LOW CONFIDENCE"
