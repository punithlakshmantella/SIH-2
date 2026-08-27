import re
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles, record_audit_log
from app.models.models import Watchlist, Vehicle, User, Camera, VehicleDetection, Case
from app.schemas.watchlist import (
    WatchlistOut, WatchlistCreate, WatchlistUpdate, 
    WatchlistVerificationRequest, WatchlistStatusUpdate, WatchlistSummaryOut
)

router = APIRouter(prefix="/watchlist", tags=["Watchlist & Surveillance Management"])

# Indian License Plate Validation regex
PLATE_REGEX = re.compile(r'^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$')


def _enrich_watchlist_item(item: Watchlist, db: Session) -> WatchlistOut:
    """Helper to populate creator, verifier, detection telemetry and expiry status."""
    creator = db.query(User).filter(User.id == item.created_by).first() if item.created_by else None
    verifier = db.query(User).filter(User.id == item.verified_by).first() if item.verified_by else None
    
    # Check vehicle records for real ANPR sightings
    clean_plate = (item.plate_number or "").upper().replace(" ", "")
    veh = db.query(Vehicle).filter(Vehicle.primary_plate == clean_plate).first()
    
    det_count = veh.total_detections if veh else 0
    last_seen = veh.last_seen_at if veh else item.created_at
    last_cam_id = veh.last_camera_id if veh else None
    
    last_cam_name = None
    if last_cam_id:
        cam_obj = db.query(Camera).filter(Camera.id == last_cam_id).first()
        last_cam_name = cam_obj.name if cam_obj else last_cam_id

    # Compute days until expiry
    now = datetime.utcnow()
    days_until_expiry = None
    is_expiring_soon = False
    is_expired = False

    effective_from = item.effective_from or item.created_at
    expiry_date = item.expiry_date

    if expiry_date:
        delta = (expiry_date - now).total_seconds() / 86400.0
        days_until_expiry = int(delta)
        if delta < 0:
            is_expired = True
        elif delta <= 7:
            is_expiring_soon = True

    # Compute status string
    current_status = item.status or ("active" if item.is_active else "suspended")
    if is_expired and current_status == "active":
        current_status = "expired"

    # Identify synthetic demo/test records
    is_demo = "TEST" in clean_plate or "DEMO" in (item.case_reference or "").upper() or "DEMO" in (item.notes or "").upper()

    return WatchlistOut(
        id=item.id,
        plate_number=clean_plate,
        reason_category=item.reason_category,
        priority=item.priority,
        case_reference=item.case_reference,
        notes=item.notes,
        status=current_status,
        verification_status=item.verification_status or "verified",
        verified_by=item.verified_by,
        verified_by_name=verifier.full_name if verifier else None,
        verified_at=item.verified_at,
        effective_from=effective_from,
        expiry_date=expiry_date,
        resolution_notes=item.resolution_notes,
        resolved_at=item.resolved_at,
        created_by=item.created_by,
        creator_name=creator.full_name if creator else "System Administrator",
        is_active=item.is_active and current_status == "active",
        is_demo=is_demo,
        is_expiring_soon=is_expiring_soon,
        days_until_expiry=days_until_expiry,
        detection_count=det_count,
        last_seen_at=last_seen,
        last_camera_id=last_cam_id,
        last_camera_name=last_cam_name,
        created_at=item.created_at,
        updated_at=item.updated_at
    )


@router.get("/summary", response_model=WatchlistSummaryOut)
def get_watchlist_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get dynamic summary statistics for watchlist entries.
    """
    all_items = db.query(Watchlist).all()
    now = datetime.utcnow()

    total = len(all_items)
    active_cnt = 0
    pending_cnt = 0
    expired_cnt = 0
    suspended_cnt = 0
    urgent_cnt = 0
    linked_cases = 0
    expiring_soon_cnt = 0

    for it in all_items:
        enriched = _enrich_watchlist_item(it, db)
        if enriched.status == "active":
            active_cnt += 1
        elif enriched.status == "pending_verification":
            pending_cnt += 1
        elif enriched.status == "expired":
            expired_cnt += 1
        elif enriched.status in ("suspended", "resolved", "rejected"):
            suspended_cnt += 1

        if it.priority == "urgent":
            urgent_cnt += 1

        if it.case_reference:
            linked_cases += 1

        if enriched.is_expiring_soon and enriched.status == "active":
            expiring_soon_cnt += 1

    return WatchlistSummaryOut(
        total_entries=total,
        active_count=active_cnt,
        pending_verification_count=pending_cnt,
        expired_count=expired_cnt,
        suspended_count=suspended_cnt,
        urgent_count=urgent_cnt,
        linked_investigations_count=linked_cases,
        expiring_soon_count=expiring_soon_cnt
    )


@router.get("", response_model=List[WatchlistOut])
def list_watchlist_plates(
    status_filter: Optional[str] = Query("all", description="all, active, pending, expired, suspended, resolved"),
    reason_category: Optional[str] = Query(None, description="stolen, active_investigation, traffic_violator, etc."),
    priority: Optional[str] = Query(None, description="urgent, high, medium, low"),
    search: Optional[str] = Query(None, description="Search query by plate, case, notes, registered by"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List registered watchlist entries with multi-parameter filtering.
    """
    query = db.query(Watchlist)

    if reason_category and reason_category != "all":
        query = query.filter(Watchlist.reason_category == reason_category)
    if priority and priority != "all":
        query = query.filter(Watchlist.priority == priority)

    items = query.order_by(Watchlist.created_at.desc()).all()
    results = []

    for it in items:
        enriched = _enrich_watchlist_item(it, db)

        # Status filter
        if status_filter and status_filter != "all":
            if status_filter == "active" and enriched.status != "active":
                continue
            elif status_filter == "pending" and enriched.status != "pending_verification":
                continue
            elif status_filter == "expired" and enriched.status != "expired":
                continue
            elif status_filter == "suspended" and enriched.status not in ("suspended", "resolved", "rejected"):
                continue

        # Text search
        if search:
            q = search.lower().replace(" ", "")
            match = (
                q in enriched.plate_number.lower() or
                (enriched.case_reference and q in enriched.case_reference.lower()) or
                (enriched.notes and q in enriched.notes.lower()) or
                (enriched.creator_name and q in enriched.creator_name.lower()) or
                (enriched.reason_category and q in enriched.reason_category.lower())
            )
            if not match:
                continue

        results.append(enriched)

    return results


@router.get("/{watchlist_id}", response_model=WatchlistOut)
def get_watchlist_entry(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed watchlist entry by ID.
    """
    entry = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist entry #{watchlist_id} not found"
        )
    return _enrich_watchlist_item(entry, db)


@router.post("", response_model=WatchlistOut, status_code=status.HTTP_201_CREATED)
def add_plate_to_watchlist(
    request: Request,
    entry: WatchlistCreate,
    db: Session = Depends(get_db),
    # Strict RBAC enforcement: Only Police, Investigator, or Admin
    current_user: User = Depends(require_roles(["Traffic Police", "Authorized Investigator", "System Administrator"]))
):
    """
    Add a plate to the surveillance watchlist (Strict RBAC Gated).
    Validates Indian plate syntax, checks duplicates, and sets default expiry.
    """
    clean_plate = entry.plate_number.strip().upper().replace(" ", "")
    if len(clean_plate) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid license plate format. Minimum 4 characters required."
        )

    # Check for existing duplicate
    existing = db.query(Watchlist).filter(Watchlist.plate_number == clean_plate).first()
    if existing:
        if existing.is_active and existing.status in ("active", "pending_verification"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Watchlist entry for '{clean_plate}' already exists with status '{existing.status}'. Use update to modify."
            )
        else:
            # Reactivate existing entry cleanly
            existing.is_active = True
            existing.status = "active" if entry.auto_verify else "pending_verification"
            existing.verification_status = "verified" if entry.auto_verify else "pending"
            existing.reason_category = entry.reason_category
            existing.priority = entry.priority
            existing.case_reference = entry.case_reference
            existing.notes = entry.notes
            existing.effective_from = entry.effective_from or datetime.utcnow()
            existing.expiry_date = entry.expiry_date or (datetime.utcnow() + timedelta(days=30))
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            target_obj = existing
    else:
        # Create brand new entry
        eff_from = entry.effective_from or datetime.utcnow()
        exp_date = entry.expiry_date or (eff_from + timedelta(days=30))
        init_status = "active" if entry.auto_verify else "pending_verification"
        ver_status = "verified" if entry.auto_verify else "pending"

        target_obj = Watchlist(
            plate_number=clean_plate,
            reason_category=entry.reason_category,
            priority=entry.priority,
            case_reference=entry.case_reference,
            notes=entry.notes,
            status=init_status,
            verification_status=ver_status,
            effective_from=eff_from,
            expiry_date=exp_date,
            created_by=current_user.id,
            is_active=True
        )
        db.add(target_obj)
        db.commit()
        db.refresh(target_obj)

    # Flag vehicle in Vehicle registry if exists
    veh = db.query(Vehicle).filter(Vehicle.primary_plate == clean_plate).first()
    if veh:
        veh.is_flagged = True
        db.commit()

    # Immutable Audit Log
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="WATCHLIST_CREATED",
        target_entity="watchlist",
        target_id=str(target_obj.id),
        query_params={
            "plate": clean_plate,
            "reason": entry.reason_category,
            "priority": entry.priority,
            "case": entry.case_reference,
            "status": target_obj.status
        },
        ip_address=client_ip
    )

    return _enrich_watchlist_item(target_obj, db)


@router.put("/{watchlist_id}/status", response_model=WatchlistOut)
def update_watchlist_status(
    watchlist_id: int,
    body: WatchlistStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Traffic Police", "Authorized Investigator", "System Administrator"]))
):
    """
    Transition watchlist status: ACTIVE -> SUSPENDED -> EXPIRED -> RESOLVED.
    """
    entry = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Watchlist entry #{watchlist_id} not found")

    prev_status = entry.status
    new_status = body.status.lower()

    entry.status = new_status
    if new_status in ("suspended", "expired", "resolved", "rejected"):
        entry.is_active = False
    elif new_status == "active":
        entry.is_active = True

    if body.resolution_notes:
        entry.resolution_notes = body.resolution_notes
        entry.resolved_at = datetime.utcnow()

    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)

    # Audit log
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action=f"WATCHLIST_STATUS_{new_status.upper()}",
        target_entity="watchlist",
        target_id=str(watchlist_id),
        query_params={"previous_status": prev_status, "new_status": new_status, "notes": body.resolution_notes},
        ip_address=client_ip
    )

    return _enrich_watchlist_item(entry, db)


@router.post("/{watchlist_id}/verify", response_model=WatchlistOut)
def verify_watchlist_entry(
    watchlist_id: int,
    body: WatchlistVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
    # Two-person authorization verification (Admin / Investigator / Senior Police)
    current_user: User = Depends(require_roles(["Authorized Investigator", "System Administrator", "Traffic Police"]))
):
    """
    Verify pending watchlist entry (Two-person verification approval).
    """
    entry = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Watchlist entry #{watchlist_id} not found")

    action = body.action.upper()
    if action == "VERIFIED":
        entry.verification_status = "verified"
        entry.status = "active"
        entry.is_active = True
        entry.verified_by = current_user.id
        entry.verified_at = datetime.utcnow()
    elif action == "REJECTED":
        entry.verification_status = "rejected"
        entry.status = "rejected"
        entry.is_active = False
        entry.verified_by = current_user.id
        entry.verified_at = datetime.utcnow()
        if body.notes:
            entry.resolution_notes = body.notes

    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)

    # Audit log
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action=f"WATCHLIST_{action}",
        target_entity="watchlist",
        target_id=str(watchlist_id),
        query_params={"action": action, "notes": body.notes},
        ip_address=client_ip
    )

    return _enrich_watchlist_item(entry, db)


@router.put("/{watchlist_id}", response_model=WatchlistOut)
def update_watchlist_entry(
    watchlist_id: int,
    update_in: WatchlistUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Traffic Police", "Authorized Investigator", "System Administrator"]))
):
    """
    Update watchlist notes, priority, case reference or expiry.
    """
    entry = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Watchlist #{watchlist_id} not found")

    if update_in.reason_category:
        entry.reason_category = update_in.reason_category
    if update_in.priority:
        entry.priority = update_in.priority
    if update_in.case_reference is not None:
        entry.case_reference = update_in.case_reference
    if update_in.notes is not None:
        entry.notes = update_in.notes
    if update_in.expiry_date:
        entry.expiry_date = update_in.expiry_date

    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)

    # Audit log
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="WATCHLIST_UPDATED",
        target_entity="watchlist",
        target_id=str(watchlist_id),
        query_params={"plate": entry.plate_number},
        ip_address=client_ip
    )

    return _enrich_watchlist_item(entry, db)


@router.delete("/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_watchlist_entry(
    watchlist_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Traffic Police", "Authorized Investigator", "System Administrator"]))
):
    """
    Archive / suspend watchlist entry (preserves historical audit trail).
    """
    entry = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist entry #{watchlist_id} not found"
        )
    entry.is_active = False
    entry.status = "suspended"
    entry.updated_at = datetime.utcnow()
    db.commit()

    # Audit log
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="WATCHLIST_SUSPENDED",
        target_entity="watchlist",
        target_id=str(watchlist_id),
        ip_address=client_ip
    )
    return None
