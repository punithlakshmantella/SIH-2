import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.engines.reid import reid_engine
from app.engines.trajectory import trajectory_engine

client = TestClient(app)

def get_auth_token():
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "investigator@cityvision.bel.in", "password": "investigator123"}
    )
    return res.json()["access_token"]

def test_reid_probabilistic_scoring():
    """
    Test VehicleReIDEngine calculates multi-modal score with strict probabilistic wording
    and never claims absolute identity certainty.
    """
    detection = {
        "raw_plate_text": "AP39A?1234",
        "vehicle_type": "car",
        "vehicle_color": "white",
        "latitude": 17.6785,
        "longitude": 83.1610,
        "timestamp": datetime.utcnow()
    }

    candidates = [{
        "id": 1,
        "primary_plate": "AP39AB1234",
        "vehicle_type": "car",
        "vehicle_color": "white",
        "last_detection": {
            "latitude": 17.6710,
            "longitude": 83.1490,
            "timestamp": datetime.utcnow() - timedelta(minutes=10)
        }
    }]

    matches = reid_engine.match(detection, candidates)
    assert len(matches) == 1
    top_match = matches[0]

    # Verify score exceeds threshold (90%+)
    assert top_match.match_score >= 0.88
    assert top_match.is_probable_match is True
    assert top_match.requires_officer_verification is True

    # Verify probabilistic language
    assert "Possible same vehicle" in top_match.probabilistic_label
    assert "Requires officer verification" in top_match.probabilistic_label
    assert "never" not in top_match.probabilistic_label.lower() or "certain" not in top_match.probabilistic_label.lower()

def test_impossible_transition_rejection():
    """
    Test TrajectoryReconstructionEngine flags physically impossible speeds
    (e.g., 85 km apart in 2 minutes -> 2550 km/h) instead of silently accepting.
    """
    t0 = datetime.utcnow() - timedelta(minutes=10)
    t1 = t0 + timedelta(minutes=2)  # Only 2 minutes later

    detections = [
        {
            "camera_id": "CAM-VIS-001",
            "camera_name": "Vizag Beach Road",
            "latitude": 17.7150,
            "longitude": 83.3250,
            "timestamp": t0,
            "speed_kmh": 45.0,
            "direction": "NB",
            "raw_plate_text": "AP39AB1234",
            "ocr_confidence": 0.95,
            "is_low_confidence": False
        },
        {
            "camera_id": "CAM-RUR-999",
            "camera_name": "Far Highway Outpost",
            "latitude": 17.0500,  # ~85 km south of Vizag
            "longitude": 82.8000,
            "timestamp": t1,
            "speed_kmh": 50.0,
            "direction": "SB",
            "raw_plate_text": "AP39AB1234",
            "ocr_confidence": 0.96,
            "is_low_confidence": False
        }
    ]

    result = trajectory_engine.reconstruct(
        vehicle_id=1,
        primary_plate="AP39AB1234",
        vehicle_type="car",
        vehicle_color="white",
        raw_detections=detections
    )

    # Must flag impossible transition
    assert result.has_impossible_transitions is True
    assert len(result.points) == 2
    assert result.points[1].is_impossible_transition is True
    assert result.points[1].implied_speed_kmh > 140.0
    assert "IMPOSSIBLE_TRANSITION" in result.points[1].anomaly_flags
    assert "WARNING" in result.status_summary

def test_demo_vehicle_trajectory_api_end_to_end():
    """
    End-to-end test querying trajectory for AP39AB1234 via REST API.
    Confirms 5-camera path (Rural -> Highway -> Toll [Degraded] -> Town -> City).
    """
    token = get_auth_token()
    response = client.get(
        "/api/v1/vehicles/AP39AB1234/trajectory",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    traj = response.json()

    assert traj["primary_plate"] == "AP39AB1234"
    assert traj["total_points"] >= 5

    # Check camera hit sequence contains flagship corridor
    cams = [p["camera_id"] for p in traj["points"]]
    assert "CAM-RUR-001" in cams
    assert "CAM-TOL-003" in cams
    assert "CAM-CTR-005" in cams

    # Check Toll camera degraded read
    toll_hits = [p for p in traj["points"] if p["camera_id"] == "CAM-TOL-003"]
    assert len(toll_hits) > 0
    assert toll_hits[0]["raw_plate_read"] == "AP39A?1234"
    assert toll_hits[0]["is_low_confidence"] is True

    # Check distance and speed metrics
    assert traj["total_distance_km"] > 10.0
    assert traj["avg_speed_kmh"] > 0.0
    assert traj["has_impossible_transitions"] is False
