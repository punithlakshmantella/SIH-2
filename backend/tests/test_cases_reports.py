import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_token(user: str = "investigator@cityvision.bel.in", pwd: str = "investigator123"):
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": user, "password": pwd}
    )
    return res.json()["access_token"]

def test_case_creation_rbac():
    investigator_token = get_token("investigator@cityvision.bel.in", "investigator123")
    operator_token = get_token("operator@cityvision.bel.in", "operator123")

    # 1. Operator role gets 403 Forbidden
    res_forbid = client.post(
        "/api/v1/cases",
        headers={"Authorization": f"Bearer {operator_token}"},
        json={"title": "Unauthorized case", "subject_plate": "AP39AB1234"}
    )
    assert res_forbid.status_code == 403

    # 2. Investigator role creates case successfully
    res_ok = client.post(
        "/api/v1/cases",
        headers={"Authorization": f"Bearer {investigator_token}"},
        json={
            "title": "Operation Harbor Trace",
            "subject_plate": "AP39AB1234",
            "priority": "urgent",
            "notes": "Vehicle associated with investigation. Neutral evidence standard applied."
        }
    )
    assert res_ok.status_code == 201
    case_data = res_ok.json()
    assert "case_number" in case_data

    # 3. Retrieve full dossier
    case_id = case_data["id"]
    res_dossier = client.get(
        f"/api/v1/cases/{case_id}",
        headers={"Authorization": f"Bearer {investigator_token}"}
    )
    assert res_dossier.status_code == 200
    dossier = res_dossier.json()

    assert dossier["subject_plate"] == "AP39AB1234"
    assert "trajectory" in dossier
    assert "alerts_history" in dossier
    assert "neutral_association_label" in dossier["subject_vehicle"]
    assert "network_drop_off_status" in dossier

def test_reports_csv_exports():
    token = get_token()

    for report_path in [
        "/api/v1/reports/traffic-volume.csv",
        "/api/v1/reports/alerts.csv",
        "/api/v1/reports/origin-destination.csv",
        "/api/v1/reports/camera-health.csv"
    ]:
        res = client.get(report_path, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert "text/csv" in res.headers["content-type"]
        assert len(res.text) > 0
