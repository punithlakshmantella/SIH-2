import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token():
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "analyst@cityvision.bel.in", "password": "analyst123"}
    )
    return res.json()["access_token"]

def test_analytics_overview_endpoint():
    token = get_auth_token()
    res = client.get(
        "/api/v1/analytics/overview",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()

    assert "summary" in data
    assert "hourly_trends" in data
    assert "vehicle_type_distribution" in data
    assert "direction_distribution" in data
    assert "zone_utilization" in data

    assert data["summary"]["total_volume"] > 0
    assert data["summary"]["avg_speed_kmh"] > 0.0

def test_origin_destination_flows_endpoint():
    token = get_auth_token()
    res = client.get(
        "/api/v1/analytics/origin-destination",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    flows = res.json()
    assert isinstance(flows, list)
    assert len(flows) > 0

    first_flow = flows[0]
    assert "origin_camera_id" in first_flow
    assert "dest_camera_id" in first_flow
    assert "vehicle_count" in first_flow
    assert "avg_travel_time_sec" in first_flow
    assert "avg_speed_kmh" in first_flow

def test_congestion_heatmap_endpoint():
    token = get_auth_token()
    res = client.get(
        "/api/v1/analytics/congestion",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "heatmap_points" in data
    assert "affected_corridors" in data
    assert len(data["heatmap_points"]) > 0

def test_prototype_congestion_prediction_endpoint():
    token = get_auth_token()
    res = client.get(
        "/api/v1/analytics/congestion/predict?road_id=1&horizon_minutes=30",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    pred = res.json()

    assert pred["road_id"] == 1
    assert pred["horizon_minutes"] == 30
    assert "current_density_pct" in pred
    assert "predicted_density_pct" in pred
    assert "risk_level" in pred
    assert "forecast_series" in pred
    assert len(pred["forecast_series"]) > 0

    # Verify prototype disclaimer integrity
    assert pred["is_prototype"] is True
    assert "PROTOTYPE" in pred["disclaimer"]
