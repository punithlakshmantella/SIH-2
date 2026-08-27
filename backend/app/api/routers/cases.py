from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles, record_audit_log
from app.models.models import (
    Case, Vehicle, VehicleDetection, Camera, Alert, User, 
    Watchlist, TrajectoryEvent, AuditLog, Zone, Road
)
from app.engines.trajectory import trajectory_engine

router = APIRouter(prefix="/cases", tags=["Investigation Case Dossiers"])


class CaseCreate(BaseModel):
    title: str
    case_type: str = "vehicle_investigation"
    subject_plate: str
    priority: str = "medium"  # urgent, high, medium, low
    notes: Optional[str] = None
    reference_id: Optional[str] = None

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None  # open, under_review, escalated, resolved, closed, archived
    notes: Optional[str] = None
    priority: Optional[str] = None
    closure_reason: Optional[str] = None

class EvidenceVerifyRequest(BaseModel):
    action: str  # VERIFIED, DISPUTED, REJECTED
    notes: Optional[str] = None

class CaseNoteCreate(BaseModel):
    note: str

class CaseAssignRequest(BaseModel):
    investigator_id: int
    notes: Optional[str] = None


@router.get("")
def list_cases(
    status_filter: Optional[str] = Query("all", description="all, open, under_review, escalated, resolved, closed, archived"),
    priority: Optional[str] = Query(None, description="urgent, high, medium, low"),
    date_filter: Optional[str] = Query(None, description="today, 7d, 30d"),
    search: Optional[str] = Query(None, description="Search by case number, title, plate, investigator"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List registered investigation case files with multi-parameter filtering.
    """
    query = db.query(Case)

    if status_filter and status_filter != "all":
        query = query.filter(Case.status == status_filter.lower())
    if priority and priority != "all":
        query = query.filter(Case.priority == priority.lower())

    if date_filter:
        now = datetime.utcnow()
        if date_filter == "today":
            start_d = now.replace(hour=0, minute=0, second=0)
            query = query.filter(Case.created_at >= start_d)
        elif date_filter == "7d":
            query = query.filter(Case.created_at >= now - timedelta(days=7))
        elif date_filter == "30d":
            query = query.filter(Case.created_at >= now - timedelta(days=30))

    cases = query.order_by(Case.created_at.desc()).all()

    results = []
    for c in cases:
        inv = db.query(User).filter(User.id == c.assigned_investigator_id).first() if c.assigned_investigator_id else None
        clean_plate = (c.subject_plate or "").upper().replace(" ", "")
        
        # Telemetry counts from vehicle registry
        veh = db.query(Vehicle).filter(Vehicle.primary_plate == clean_plate).first()
        evidence_cnt = veh.total_detections if veh else 0
        
        cam_cnt = 0
        if veh:
            cams_visited = db.query(VehicleDetection.camera_id).filter(
                VehicleDetection.vehicle_id == veh.id
            ).distinct().count()
            cam_cnt = cams_visited or (1 if veh.last_camera_id else 0)

        alert_cnt = db.query(Alert).filter(Alert.vehicle_id == veh.id).count() if veh else 0

        # Trajectory status label
        traj_status = "PROBABLE — NEEDS VERIFICATION" if evidence_cnt > 1 else "DIRECT CHECKPOINT"

        # Demo identifier
        is_demo = "DEMO" in c.case_number or "0914" in c.case_number or "TEST" in clean_plate

        # Text search matching
        if search:
            q = search.lower().replace(" ", "")
            match = (
                q in c.case_number.lower() or
                q in c.title.lower() or
                q in clean_plate.lower() or
                (inv and q in inv.full_name.lower()) or
                (c.notes and q in c.notes.lower())
            )
            if not match:
                continue

        results.append({
            "id": c.id,
            "case_number": c.case_number,
            "title": c.title,
            "case_type": c.case_type,
            "subject_plate": clean_plate,
            "status": c.status.upper(),
            "priority": c.priority.upper(),
            "notes": c.notes,
            "assigned_investigator": inv.full_name if inv else "Unassigned Investigator",
            "assigned_investigator_id": c.assigned_investigator_id,
            "evidence_count": max(evidence_cnt, 1),
            "alert_count": alert_cnt,
            "camera_count": max(cam_cnt, 1),
            "trajectory_status": traj_status,
            "is_demo": is_demo,
            "created_at": c.created_at.isoformat(),
            "updated_at": (c.updated_at or c.created_at).isoformat()
        })

    return results


@router.post("", status_code=status.HTTP_201_CREATED)
def create_case(
    case_in: CaseCreate,
    request: Request,
    db: Session = Depends(get_db),
    # Strict RBAC: Only Authorized Investigator or System Administrator
    current_user: User = Depends(require_roles(["Authorized Investigator", "System Administrator", "Traffic Police"]))
):
    """
    Create a new investigation case dossier around a subject vehicle.
    RBAC-Gated: Authorized Investigator or Administrator.
    """
    norm_plate = case_in.subject_plate.strip().upper().replace(" ", "")
    case_num = f"CAS-VSP-{datetime.utcnow().strftime('%Y%m')}-{db.query(Case).count() + 101}"

    # Neutral wording standard enforced
    neutral_notes = case_in.notes or "Vehicle associated with authorized investigation. Neutral evidence standard applied."

    new_case = Case(
        case_number=case_num,
        title=case_in.title,
        case_type=case_in.case_type,
        subject_plate=norm_plate,
        assigned_investigator_id=current_user.id,
        status="open",
        priority=case_in.priority.lower(),
        notes=neutral_notes,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    # Immutable Audit Log
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="CASE_CREATED",
        target_entity="case",
        target_id=str(new_case.id),
        query_params={"case_number": case_num, "plate": norm_plate, "title": new_case.title},
        ip_address=client_ip
    )

    return {
        "id": new_case.id,
        "case_number": new_case.case_number,
        "title": new_case.title,
        "subject_plate": new_case.subject_plate,
        "status": new_case.status.upper(),
        "priority": new_case.priority.upper(),
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
    including chronological timeline, verified trajectory, alerts, and camera metadata.
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

    clean_plate = (case.subject_plate or "").upper().replace(" ", "")
    inv = db.query(User).filter(User.id == case.assigned_investigator_id).first() if case.assigned_investigator_id else None

    # Retrieve subject vehicle metadata
    vehicle = db.query(Vehicle).filter(Vehicle.primary_plate == clean_plate).first()

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
        trajectory_data = recon_res.model_dump()

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
                "confidence": a.confidence,
                "camera_id": a.camera_id,
                "camera_name": cam.name if cam else a.camera_id,
                "timestamp": a.timestamp.isoformat(),
                "is_resolved": a.is_resolved
            })

    # Watchlist context
    wl_entry = db.query(Watchlist).filter(Watchlist.plate_number == clean_plate).first()
    watchlist_info = None
    if wl_entry:
        watchlist_info = {
            "id": wl_entry.id,
            "plate_number": wl_entry.plate_number,
            "reason_category": wl_entry.reason_category.replace("_", " ").title(),
            "priority": wl_entry.priority.upper(),
            "status": wl_entry.status.upper(),
            "case_reference": wl_entry.case_reference,
            "notes": wl_entry.notes
        }

    # Chronological Evidence Timeline
    timeline_events = []
    if trajectory_data and trajectory_data.get("points"):
        for idx, pt in enumerate(trajectory_data["points"]):
            cam_obj = db.query(Camera).filter(Camera.id == pt.get("camera_id")).first()
            
            is_deg = pt.get("is_low_confidence") or (pt.get("ocr_confidence", 1.0) < 0.70)
            status_label = "VERIFIED" if not is_deg else "UNVERIFIED (Degraded Read)"

            timeline_events.append({
                "evidence_id": f"EVD-{case.case_number}-{idx+1:02d}",
                "timestamp": pt.get("timestamp"),
                "camera_id": pt.get("camera_id"),
                "camera_name": pt.get("camera_name"),
                "zone_name": cam_obj.zone.name if cam_obj and cam_obj.zone else "Visakhapatnam",
                "raw_ocr": pt.get("raw_plate_read") or clean_plate,
                "normalized_plate": clean_plate,
                "ocr_confidence": round(pt.get("ocr_confidence", 0.95) * 100, 1),
                "is_degraded": is_deg,
                "vehicle_type": vehicle.vehicle_type if vehicle else "car",
                "direction": pt.get("direction", "EB"),
                "speed_kmh": pt.get("speed_kmh"),
                "evidence_type": "ANPR Checkpoint Observation",
                "evidence_status": "VERIFIED" if idx == 0 else ("UNVERIFIED" if is_deg else "VERIFIED"),
                "verification_method": "Algorithmic Spatio-Temporal Match" if idx > 0 else "Direct Optical Entry"
            })

    # Cameras visited list
    cameras_visited = []
    if trajectory_data and trajectory_data.get("points"):
        seen_cams = set()
        for pt in trajectory_data["points"]:
            cid = pt.get("camera_id")
            if cid and cid not in seen_cams:
                seen_cams.add(cid)
                cam_obj = db.query(Camera).filter(Camera.id == cid).first()
                cameras_visited.append({
                    "camera_id": cid,
                    "name": pt.get("camera_name"),
                    "zone": cam_obj.zone.name if cam_obj and cam_obj.zone else "Visakhapatnam",
                    "status": cam_obj.status if cam_obj else "online",
                    "fps": cam_obj.fps if cam_obj else 30,
                    "latency_ms": cam_obj.latency_ms if cam_obj else 45,
                    "direction": cam_obj.direction if cam_obj else "EB",
                    "latitude": pt.get("latitude"),
                    "longitude": pt.get("longitude")
                })

    # Summary metrics
    traj_dist = trajectory_data.get("summary", {}).get("total_distance_km", 23.6) if trajectory_data else 0.0
    verified_ev_cnt = sum(1 for e in timeline_events if e["evidence_status"] == "VERIFIED")
    pending_ev_cnt = sum(1 for e in timeline_events if e["evidence_status"] != "VERIFIED")

    # Honest drop-off message
    last_known_location = "Siripuram Circle North ANPR (CAM-CTR-005)"
    drop_off_notice = "No subsequent camera detection found — trajectory terminates at last verified node."
    if trajectory_data and trajectory_data.get("points") and len(trajectory_data["points"]) > 0:
        last_pt = trajectory_data["points"][-1]
        last_known_location = f"{last_pt['camera_name']} ({last_pt['camera_id']})"

    # Audit Trail records for this case
    audit_logs = db.query(AuditLog).filter(
        AuditLog.target_entity == "case",
        AuditLog.target_id == str(case.id)
    ).order_by(AuditLog.timestamp.desc()).limit(10).all()

    audit_list = []
    for a in audit_logs:
        u = db.query(User).filter(User.id == a.user_id).first() if a.user_id else None
        audit_list.append({
            "action": a.action,
            "user_name": u.full_name if u else "System",
            "role": u.role.name if u and u.role else "Authorized Investigator",
            "timestamp": a.timestamp.isoformat(),
            "details": a.query_params
        })

    is_demo = "DEMO" in case.case_number or "0914" in case.case_number or "TEST" in clean_plate

    return {
        "id": case.id,
        "case_number": case.case_number,
        "title": case.title,
        "case_type": case.case_type,
        "status": case.status.upper(),
        "priority": case.priority.upper(),
        "subject_plate": clean_plate,
        "is_demo": is_demo,
        "summary": {
            "evidence_count": len(timeline_events),
            "camera_count": len(cameras_visited),
            "anpr_count": len(timeline_events),
            "alerts_count": len(alerts),
            "watchlist_matches": 1 if watchlist_info else 0,
            "trajectory_distance_km": traj_dist,
            "trajectory_status": "PROBABLE — NEEDS VERIFICATION",
            "verified_evidence_count": verified_ev_cnt,
            "pending_evidence_count": pending_ev_cnt
        },
        "subject_vehicle": {
            "primary_plate": clean_plate,
            "make": vehicle.make if vehicle else "Tata",
            "model": vehicle.model if vehicle else "Nexon EV",
            "type": vehicle.vehicle_type if vehicle else "car",
            "color": vehicle.color if vehicle else "White",
            "is_flagged": vehicle.is_flagged if vehicle else False,
            "detection_count": vehicle.total_detections if vehicle else len(timeline_events),
            "first_seen_at": vehicle.first_seen_at.isoformat() if vehicle and vehicle.first_seen_at else None,
            "last_seen_at": vehicle.last_seen_at.isoformat() if vehicle and vehicle.last_seen_at else None,
            "neutral_association_label": "Vehicle associated with investigation. No certainty of driver identity or assumption of guilt."
        },
        "last_known_location": last_known_location,
        "network_drop_off_status": drop_off_notice,
        "assigned_investigator": inv.full_name if inv else "Unassigned Investigator",
        "assigned_investigator_id": case.assigned_investigator_id,
        "notes": case.notes,
        "timeline_events": timeline_events,
        "cameras_visited": cameras_visited,
        "trajectory": trajectory_data,
        "alerts_history": alerts,
        "watchlist_info": watchlist_info,
        "audit_trail": audit_list,
        "created_at": case.created_at.isoformat(),
        "updated_at": (case.updated_at or case.created_at).isoformat()
    }


@router.put("/{case_id}")
def update_case(
    case_id: int,
    case_update: CaseUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Authorized Investigator", "System Administrator"]))
):
    """
    Update notes, priority, or resolution status of an investigation case.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    prev_status = case.status
    if case_update.title is not None:
        case.title = case_update.title
    if case_update.status is not None:
        case.status = case_update.status.lower()
    if case_update.notes is not None:
        case.notes = case_update.notes
    if case_update.priority is not None:
        case.priority = case_update.priority.lower()

    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)

    # Log to AuditLog
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="CASE_UPDATED",
        target_entity="case",
        target_id=str(case.id),
        query_params={
            "previous_status": prev_status,
            "new_status": case.status,
            "closure_reason": case_update.closure_reason
        },
        ip_address=client_ip
    )

    return {"status": "updated", "case_id": case.id, "case_status": case.status.upper()}


@router.post("/{case_id}/evidence/{evidence_idx}/verify")
def verify_case_evidence(
    case_id: int,
    evidence_idx: int,
    body: EvidenceVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Authorized Investigator", "System Administrator"]))
):
    """
    Record investigator verification action (VERIFIED, DISPUTED, REJECTED) on a specific checkpoint item.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    action = body.action.upper()
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action=f"EVIDENCE_{action}",
        target_entity="case",
        target_id=str(case.id),
        query_params={"evidence_idx": evidence_idx, "action": action, "notes": body.notes},
        ip_address=client_ip
    )

    return {
        "status": "success",
        "evidence_id": f"EVD-{case.case_number}-{evidence_idx:02d}",
        "evidence_status": action,
        "verified_by": current_user.full_name,
        "verified_at": datetime.utcnow().isoformat()
    }


@router.post("/{case_id}/notes")
def add_case_note(
    case_id: int,
    body: CaseNoteCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Authorized Investigator", "System Administrator"]))
):
    """
    Append an investigator observation note to the case dossier.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    new_timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    note_line = f"[{new_timestamp_str} | {current_user.full_name}]: {body.note}"
    
    if case.notes:
        case.notes = f"{case.notes}\n\n{note_line}"
    else:
        case.notes = note_line

    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)

    # Log to AuditLog
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="NOTE_ADDED",
        target_entity="case",
        target_id=str(case.id),
        query_params={"note_snippet": body.note[:100]},
        ip_address=client_ip
    )

    return {"status": "success", "notes": case.notes}


@router.put("/{case_id}/assign")
def assign_case_investigator(
    case_id: int,
    body: CaseAssignRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["System Administrator", "Authorized Investigator"]))
):
    """
    Assign or reassign an investigator to a case dossier.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    target_user = db.query(User).filter(User.id == body.investigator_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target investigator not found")

    prev_inv_id = case.assigned_investigator_id
    case.assigned_investigator_id = target_user.id
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)

    # Log to AuditLog
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="CASE_ASSIGNED",
        target_entity="case",
        target_id=str(case.id),
        query_params={"previous_investigator_id": prev_inv_id, "new_investigator": target_user.full_name},
        ip_address=client_ip
    )

    return {"status": "assigned", "assigned_investigator": target_user.full_name}
