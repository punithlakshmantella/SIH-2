from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles, record_audit_log
from app.models.models import Watchlist, Vehicle, User
from app.schemas.watchlist import WatchlistOut, WatchlistCreate

router = APIRouter(prefix="/watchlist", tags=["Watchlist & Blacklist Management"])

@router.get("", response_model=List[WatchlistOut])
def list_watchlist_plates(
    is_active: Optional[bool] = Query(True, description="Filter active watchlist entries"),
    reason_category: Optional[str] = Query(None, description="stolen, active_investigation, etc."),
    priority: Optional[str] = Query(None, description="low, medium, high, urgent"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List registered watchlist / blacklist license plates.
    """
    query = db.query(Watchlist)
    if is_active is not None:
        query = query.filter(Watchlist.is_active == is_active)
    if reason_category:
        query = query.filter(Watchlist.reason_category == reason_category)
    if priority:
        query = query.filter(Watchlist.priority == priority)

    items = query.order_by(Watchlist.created_at.desc()).all()
    results = []
    for item in items:
        creator = db.query(User).filter(User.id == item.created_by).first() if item.created_by else None
        results.append(WatchlistOut(
            id=item.id,
            plate_number=item.plate_number,
            reason_category=item.reason_category,
            priority=item.priority,
            notes=item.notes,
            created_by=item.created_by,
            creator_name=creator.full_name if creator else "System",
            is_active=item.is_active,
            created_at=item.created_at,
            updated_at=item.updated_at
        ))
    return results

@router.post("", response_model=WatchlistOut, status_code=status.HTTP_201_CREATED)
def add_plate_to_watchlist(
    request: Request,
    entry: WatchlistCreate,
    db: Session = Depends(get_db),
    # Strict RBAC enforcement: Only Police, Investigator, or Admin can add to watchlist
    current_user: User = Depends(require_roles(["Traffic Police", "Authorized Investigator", "System Administrator"]))
):
    """
    Add a plate to the surveillance watchlist (RBAC Gated: Police, Investigator, Admin).
    """
    clean_plate = entry.plate_number.strip().upper().replace(" ", "")
    existing = db.query(Watchlist).filter(Watchlist.plate_number == clean_plate).first()
    
    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Plate '{clean_plate}' is already actively listed on the watchlist"
            )
        else:
            # Reactivate
            existing.is_active = True
            existing.reason_category = entry.reason_category
            existing.priority = entry.priority
            existing.notes = entry.notes
            existing.created_by = current_user.id
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            target_obj = existing
    else:
        target_obj = Watchlist(
            plate_number=clean_plate,
            reason_category=entry.reason_category,
            priority=entry.priority,
            notes=entry.notes,
            created_by=current_user.id,
            is_active=True
        )
        db.add(target_obj)
        db.commit()
        db.refresh(target_obj)

    # Flag vehicle in vehicles table if exists
    veh = db.query(Vehicle).filter(Vehicle.primary_plate == clean_plate).first()
    if veh:
        veh.is_flagged = True
        db.commit()

    # Log audit event
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="update_watchlist",
        target_entity="watchlist",
        target_id=str(target_obj.id),
        query_params={"plate": clean_plate, "reason": entry.reason_category, "priority": entry.priority},
        ip_address=client_ip
    )

    return WatchlistOut(
        id=target_obj.id,
        plate_number=target_obj.plate_number,
        reason_category=target_obj.reason_category,
        priority=target_obj.priority,
        notes=target_obj.notes,
        created_by=target_obj.created_by,
        creator_name=current_user.full_name,
        is_active=target_obj.is_active,
        created_at=target_obj.created_at,
        updated_at=target_obj.updated_at
    )

@router.delete("/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_watchlist(
    watchlist_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Traffic Police", "Authorized Investigator", "System Administrator"]))
):
    """
    Remove / deactivate plate from watchlist (RBAC Gated).
    """
    entry = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist entry #{watchlist_id} not found"
        )
    entry.is_active = False
    entry.updated_at = datetime.utcnow()
    db.commit()

    # Log audit event
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=current_user.id,
        action="delete_watchlist",
        target_entity="watchlist",
        target_id=str(watchlist_id),
        ip_address=client_ip
    )
    return None
