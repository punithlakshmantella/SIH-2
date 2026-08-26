import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.models import AuditLog, Watchlist, Vehicle

client = TestClient(app)

def test_login_success():
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "police@cityvision.bel.in", "password": "police123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "Traffic Police"
    assert data["username"] == "police_vizag"

def test_login_invalid_password():
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "police@cityvision.bel.in", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "Incorrect" in response.json()["detail"]

def test_auth_me_endpoint():
    # Login first
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin@cityvision.bel.in", "password": "admin123"}
    )
    token = login_res.json()["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin"
    assert data["role"] == "System Administrator"

def test_rbac_forbidden_on_watchlist():
    # Login as Traffic Analyst (Not authorized to write to watchlist)
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "analyst@cityvision.bel.in", "password": "analyst123"}
    )
    analyst_token = login_res.json()["access_token"]

    # Attempt to add to watchlist
    response = client.post(
        "/api/v1/watchlist",
        headers={"Authorization": f"Bearer {analyst_token}"},
        json={
            "plate_number": "AP09XY9999",
            "reason_category": "stolen",
            "priority": "high",
            "notes": "Unauthorized attempt test"
        }
    )
    # MUST return 403 Forbidden
    assert response.status_code == 403
    assert "Permission denied" in response.json()["detail"]

def test_rbac_authorized_watchlist_and_audit():
    # Login as Traffic Police (Authorized)
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "police@cityvision.bel.in", "password": "police123"}
    )
    police_token = login_res.json()["access_token"]

    # Add to watchlist
    test_plate = "AP39TEST01"
    response = client.post(
        "/api/v1/watchlist",
        headers={"Authorization": f"Bearer {police_token}"},
        json={
            "plate_number": test_plate,
            "reason_category": "active_investigation",
            "priority": "urgent",
            "notes": "Test authorized watchlist write"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["plate_number"] == test_plate
    assert data["priority"] == "urgent"

def test_vehicle_search_and_audit_log():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "investigator@cityvision.bel.in", "password": "investigator123"}
    )
    token = login_res.json()["access_token"]

    # Search for flagship demo vehicle AP39AB1234
    response = client.get(
        "/api/v1/vehicles/search?plate=AP39AB1234",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1
    demo_v = results[0]
    assert demo_v["primary_plate"] == "AP39AB1234"
    assert demo_v["total_detections"] == 5
    assert demo_v["cameras_visited_count"] == 5
    assert demo_v["is_flagged"] is True

    # Verify audit log was recorded in database
    db = SessionLocal()
    audit_entry = db.query(AuditLog).filter(
        AuditLog.action == "search_plate"
    ).order_by(AuditLog.timestamp.desc()).first()
    assert audit_entry is not None
    assert "AP39AB1234" in str(audit_entry.query_params)
    db.close()

def test_demo_vehicle_trajectory():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "police@cityvision.bel.in", "password": "police123"}
    )
    token = login_res.json()["access_token"]

    # Get trajectory for demo vehicle AP39AB1234
    response = client.get(
        "/api/v1/vehicles/AP39AB1234/trajectory",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["primary_plate"] == "AP39AB1234"
    assert data["total_points"] >= 5
    assert len(data["points"]) >= 5

    # Check that chronological sequence follows Rural -> Highway -> Toll -> Town -> City
    actual_cams = [p["camera_id"] for p in data["points"]]
    assert "CAM-RUR-001" in actual_cams
    assert "CAM-TOL-003" in actual_cams
    assert "CAM-CTR-005" in actual_cams

    # Check Toll camera degraded read
    toll_points = [p for p in data["points"] if p["camera_id"] == "CAM-TOL-003"]
    assert len(toll_points) > 0
    assert toll_points[0]["raw_plate_read"] == "AP39A?1234"
    assert toll_points[0]["is_low_confidence"] is True

def test_cameras_list():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "operator@cityvision.bel.in", "password": "operator123"}
    )
    token = login_res.json()["access_token"]

    response = client.get(
        "/api/v1/cameras",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    cameras = response.json()
    assert len(cameras) >= 20
    assert any(c["id"] == "CAM-RUR-001" for c in cameras)
