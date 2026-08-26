from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.models import Case, Vehicle, VehicleDetection, Camera, Alert, User
from app.engines.trajectory import trajectory_engine

router = APIRouter(prefix="/cases", tags=["Investigation Case Dossiers"])

class CaseCreate(BaseModel):
    title: str
    case_type: str = "vehicle_investigation"
    subject_plate: str
    notes: Optional[str] = None
    priority: str = "medium"

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = None

@router.get("")
def list_cases(
    status_filter: Optional[str] = Query(None, description="Filter by case status: open, in_progress, closed"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all registered investigation case files.
    """
    query = db.query(Case)
    if status_filter:
        query = query.filter(Case.status == status_filter)
    cases = query.order_by(Case.created_at.desc()).all()

    results = []
    for c in cases:
        inv = db.query(User).filter(User.id == c.assigned_investigator_id).first() if c.assigned_investigator_id else None
        results.append({
            "id": c.id,
            "case_number": c.case_number,
            "title": c.title,
            "case_type": c.case_type,
            "subject_plate": c.subject_plate,
            "status": c.status,
            "priority": c.priority,
            "notes": c.notes,
            "assigned_investigator": inv.full_name if inv else "Unassigned",
            "created_at": c.created_at.isoformat()
        })
    return results

@router.post("", status_code=status.HTTP_201_CREATED)
def create_case(
    case_in: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Authorized Investigator", "System Administrator"]))
):
    """
    Create a new investigation case dossier around a subject vehicle.
    RBAC-Gated: Authorized Investigator or System Administrator only.
    """
    norm_plate = case_in.subject_plate.strip().upper()
    case_num = f"CAS-VSP-{datetime.utcnow().strftime('%Y%m')}-{db.query(Case).count() + 101}"

    # Neutral wording standard enforced
    neutral_notes = case_in.notes or "Vehicle associated with ongoing departmental inquiry. Neutral evidence standard applied."

    new_case = Case(
        case_number=case_num,
        title=case_in.title,
        case_type=case_in.case_type,
        subject_plate=norm_plate,
        assigned_investigator_id=current_user.id,
        status="open",
        priority=case_in.priority,
        notes=neutral_notes,
        created_at=datetime.utcnow()
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    return {
        "id": new_case.id,
        "case_number": new_case.case_number,
        "title": new_case.title,
        "subject_plate": new_case.subject_plate,
        "status": new_case.status,
        "assigned_investigator": current_user.full_name,
        "notes": new_case.notes,
        "created_at": new_case.created_at.isoformat()
    }

@router.get("/{case_id_or_number}")
def get_case_dossier(
    case_id_or_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve full multi-camera evidence dossier for an investigation case,
    including verified trajectory reconstruction, alerts history, and last verified location.
    """
    case = None
    if case_id_or_number.isdigit():
        case = db.query(Case).filter(Case.id == int(case_id_or_number)).first()
    if not case:
        case = db.query(Case).filter(Case.case_number == case_id_or_number).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case dossier '{case_id_or_number}' not found"
        )

    inv = db.query(User).filter(User.id == case.assigned_investigator_id).first() if case.assigned_investigator_id else None

    # Retrieve subject vehicle metadata
    vehicle = db.query(Vehicle).filter(Vehicle.primary_plate == case.subject_plate).first()

    # Reconstruct trajectory
    trajectory_data = None
    raw_detections = []
    if vehicle:
        dets = db.query(VehicleDetection).filter(
            VehicleDetection.vehicle_id == vehicle.id
        ).order_by(VehicleDetection.timestamp.asc()).all()

        det_list = []
        for d in dets:
            cam = db.query(Camera).filter(Camera.id == d.camera_id).first()
            det_list.append({
                "camera_id": d.camera_id,
                "camera_name": cam.name if cam else d.camera_id,
                "latitude": cam.latitude if cam else 17.72,
                "longitude": cam.longitude if cam else 83.27,
                "timestamp": d.timestamp,
                "speed_kmh": d.speed_kmh,
                "direction": d.direction,
                "raw_plate_text": d.raw_plate_text,
                "ocr_confidence": d.ocr_confidence,
                "is_low_confidence": d.is_low_confidence
            })

        recon_res = trajectory_engine.reconstruct(
            vehicle_id=vehicle.id,
            primary_plate=vehicle.primary_plate,
            vehicle_type=vehicle.vehicle_type,
            vehicle_color=vehicle.color,
            raw_detections=det_list
        )
        trajectory_data = recon_res.dict()

    # Retrieve alert history
    alerts = []
    if vehicle:
        v_alerts = db.query(Alert).filter(Alert.vehicle_id == vehicle.id).order_by(Alert.timestamp.desc()).all()
        for a in v_alerts:
            cam = db.query(Camera).filter(Camera.id == a.camera_id).first()
            alerts.append({
                "id": a.id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "title": a.title,
                "description": a.description,
                "camera_name": cam.name if cam else a.camera_id,
                "timestamp": a.timestamp.isoformat(),
                "is_resolved": a.is_resolved
            })

    # Honest drop-off message
    last_known_location = "Unknown"
    drop_off_notice = "No subsequent camera detection found — trajectory terminates at last verified node."
    if trajectory_data and trajectory_data.get("points") and len(trajectory_data["points"]) > 0:
        last_pt = trajectory_data["points"][-1]
        last_known_location = f"{last_pt['camera_name']} ({last_pt['camera_id']}) at {last_pt['timestamp']}"

    return {
        "id": case.id,
        "case_number": case.case_number,
        "title": case.title,
        "case_type": case.case_type,
        "status": case.status,
        "priority": case.priority,
        "subject_plate": case.subject_plate,
        "subject_vehicle": {
            "make": vehicle.make if vehicle else "Unknown",
            "model": vehicle.model if vehicle else "Vehicle",
            "type": vehicle.vehicle_type if vehicle else "car",
            "color": vehicle.color if vehicle else "white",
            "is_flagged": vehicle.is_flagged if vehicle else False,
            "neutral_association_label": "Vehicle associated with investigation (No assumption of guilt or certainty of identity)."
        },
        "last_known_location": last_known_location,
        "network_drop_off_status": drop_off_notice,
        "assigned_investigator": inv.full_name if inv else "Unassigned",
        "notes": case.notes,
        "trajectory": trajectory_data,
        "alerts_history": alerts,
        "created_at": case.created_at.isoformat()
    }

@router.put("/{case_id}")
def update_case(
    case_id: int,
    case_update: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Authorized Investigator", "System Administrator"]))
):
    """
    Update notes, priority, or resolution status of an investigation case.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case_update.title is not None:
        case.title = case_update.title
    if case_update.status is not None:
        case.status = case_update.status
    if case_update.notes is not None:
        case.notes = case_update.notes
    if case_update.priority is not None:
        case.priority = case_update.priority

    db.commit()
    db.refresh(case)
    return {"status": "updated", "case_id": case.id, "case_status": case.status}
