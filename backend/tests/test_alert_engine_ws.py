import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_token(role_user: str = "police@cityvision.bel.in", pwd: str = "police123"):
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": role_user, "password": pwd}
    )
    return res.json()["access_token"]

def test_watchlist_rbac_enforcement():
    """
    Test that only authorized roles (Police, Investigator, Admin) can add watchlist targets.
    Analyst role must receive HTTP 403 Forbidden.
    """
    analyst_token = get_token("analyst@cityvision.bel.in", "analyst123")
    police_token = get_token("police@cityvision.bel.in", "police123")

    # 1. Analyst tries to create watchlist entry -> 403 Forbidden
    res_forbidden = client.post(
        "/api/v1/watchlist",
        headers={"Authorization": f"Bearer {analyst_token}"},
        json={
            "plate_number": "AP31TEST01",
            "reason_category": "stolen",
            "priority": "high"
        }
    )
    assert res_forbidden.status_code == 403

    # 2. Police creates watchlist entry -> 200/201 OK
    res_ok = client.post(
        "/api/v1/watchlist",
        headers={"Authorization": f"Bearer {police_token}"},
        json={
            "plate_number": "AP31WL9999",
            "reason_category": "stolen",
            "priority": "urgent",
            "notes": "Stolen vehicle test hotlist"
        }
    )
    assert res_ok.status_code in (200, 201)

def test_alert_engine_watchlist_and_speed_triggers():
    """
    Ingest detection matching watchlisted plate AP31WL9999 at high speed (110 km/h in 60 km/h zone).
    Confirms Alert Engine automatically creates both watchlist_match and overspeeding alerts.
    """
    token = get_token("police@cityvision.bel.in", "police123")

    # Ingest detection
    res_det = client.post(
        "/api/v1/detections",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "camera_id": "CAM-CTR-005",
            "raw_plate_text": "AP31WL9999",
            "ocr_confidence": 0.96,
            "vehicle_type": "car",
            "vehicle_color": "black",
            "speed_kmh": 115.0,  # 115 km/h in Siripuram 50 km/h zone
            "direction": "NB",
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    assert res_det.status_code == 201

    # Check that alert was generated
    res_alerts = client.get(
        "/api/v1/alerts",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_alerts.status_code == 200
    alerts = res_alerts.json()

    # Find the watchlist alert for AP31WL9999
    match_alert = next((a for a in alerts if "AP31WL9999" in a["title"] and a["alert_type"] == "watchlist_match"), None)
    assert match_alert is not None
    assert match_alert["severity"] == "critical"

    # Find the overspeeding alert for AP31WL9999
    speed_alert = next((a for a in alerts if "AP31WL9999" in a["title"] and a["alert_type"] == "overspeeding"), None)
    assert speed_alert is not None
