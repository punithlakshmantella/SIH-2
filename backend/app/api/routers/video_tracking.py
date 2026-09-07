import os
import cv2
import uuid
import tempfile
import asyncio
from datetime import datetime
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from Levenshtein import distance as lev_distance

from app.db.session import get_db, engine
from app.core.dependencies import get_current_user
from app.models.models import User, Vehicle, VehicleDetection, Camera, Watchlist, Alert
from app.engines.anpr import anpr_engine

router = APIRouter(prefix="/video-tracking", tags=["Video Tracking"])

# Simple in-memory job store for prototype (id -> status/results)
jobs: Dict[str, Dict[str, Any]] = {}

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def is_match(detected_plate: str, target_plate: str, threshold: int = 2) -> bool:
    """Fuzzy matching for license plates using Levenshtein distance."""
    return lev_distance(detected_plate.upper(), target_plate.upper()) <= threshold

def process_single_video(
    temp_video_path: str, 
    camera_id: str, 
    target_plate_clean: str, 
    vehicle_id: int
) -> List[Dict[str, Any]]:
    """
    Processes a single video file to detect the target vehicle.
    Runs in a worker thread.
    """
    db = SessionLocal()
    local_detections = []
    
    try:
        cap = cv2.VideoCapture(temp_video_path)
        if not cap.isOpened():
            return local_detections
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 30.0
            
        frame_count = 0
        frame_interval = int(fps) # Sample 1 frame per second
        
        # Deduplication tracker (to prevent back-to-back duplicate detections)
        last_detection_time = None
        DEDUP_WINDOW_SECONDS = 10
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            if frame_count % frame_interval == 0:
                # Calculate frame timestamp offset in seconds
                frame_offset_seconds = frame_count / fps
                
                success, buffer = cv2.imencode('.jpg', frame)
                if success:
                    img_bytes = buffer.tobytes()
                    try:
                        result = anpr_engine.detect_and_read(
                            img_bytes,
                            source_name=f"{camera_id}_frame_{frame_count}.jpg",
                            enable_clahe=True,
                            enable_denoise=True,
                            enable_deskew=True,
                            enable_contrast=True
                        )
                        
                        detected_plate = result.normalized_plate.strip().upper().replace(" ", "")
                        
                        # Fuzzy match or match all if wildcard
                        matches = (
                            not target_plate_clean 
                            or target_plate_clean in ["*", "ALL"] 
                            or is_match(detected_plate, target_plate_clean, threshold=2) 
                            or target_plate_clean in detected_plate
                        )
                        
                        if matches and detected_plate:
                            # Deduplication check
                            if last_detection_time is None or (frame_offset_seconds - last_detection_time > DEDUP_WINDOW_SECONDS):
                                
                                # Resolve vehicle
                                curr_v = db.query(Vehicle).filter(Vehicle.primary_plate == detected_plate).first()
                                if not curr_v:
                                    curr_v = Vehicle(
                                        primary_plate=detected_plate,
                                        first_seen_at=datetime.utcnow(),
                                        last_seen_at=datetime.utcnow()
                                    )
                                    db.add(curr_v)
                                    db.flush()
                                
                                detection = VehicleDetection(
                                    camera_id=camera_id,
                                    vehicle_id=curr_v.id,
                                    raw_plate_text=result.raw_text,
                                    normalized_plate_text=detected_plate,
                                    ocr_confidence=result.ocr_confidence,
                                    vehicle_type=result.vehicle_type,
                                    vehicle_color=result.vehicle_color,
                                    timestamp=datetime.utcnow(),
                                    frame_offset_seconds=frame_offset_seconds
                                )
                                db.add(detection)
                                db.flush()
                                
                                # Watchlist Match Hook
                                watchlist_entry = db.query(Watchlist).filter(
                                    Watchlist.plate_number == detected_plate,
                                    Watchlist.is_active == True
                                ).first()
                                
                                if watchlist_entry:
                                    alert = Alert(
                                        vehicle_id=curr_v.id,
                                        detection_id=detection.id,
                                        camera_id=camera_id,
                                        alert_type="watchlist_match",
                                        severity="high",
                                        title="Watchlisted Vehicle Detected (Video Tracking)",
                                        description=f"Vehicle {detected_plate} matched via Video Tracking on camera {camera_id}. Reason: {watchlist_entry.reason_category}",
                                        is_resolved=False
                                    )
                                    db.add(alert)

                                # Update vehicle location
                                curr_v.last_seen_at = datetime.utcnow()
                                curr_v.last_camera_id = camera_id
                                curr_v.total_detections += 1
                                
                                db.commit()
                                db.refresh(detection)
                                
                                local_detections.append({
                                    "detection_id": detection.id,
                                    "camera_id": camera_id,
                                    "plate": detected_plate,
                                    "confidence": result.ocr_confidence,
                                    "frame_offset": round(frame_offset_seconds, 2)
                                })
                                
                                last_detection_time = frame_offset_seconds
                            
                    except Exception:
                        pass

            frame_count += 1
            
        cap.release()
    finally:
        db.close()
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)
            
    return local_detections

def run_background_job(
    job_id: str, 
    video_paths: List[str], 
    camera_ids: List[str], 
    target_plate_clean: str,
    vehicle_id: int
):
    """
    Executes the video processing tasks in parallel.
    """
    try:
        jobs[job_id]["status"] = "processing"
        all_detections = []
        
        # Limit thread pool to avoid massive RAM spikes on OpenCV
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = []
            for temp_path, cam_id in zip(video_paths, camera_ids):
                futures.append(
                    executor.submit(
                        process_single_video, 
                        temp_path, 
                        cam_id, 
                        target_plate_clean, 
                        vehicle_id
                    )
                )
                
            for future in futures:
                all_detections.extend(future.result())
                
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["results"] = all_detections
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)

@router.post("/track")
async def track_vehicle_in_videos(
    background_tasks: BackgroundTasks,
    target_plate: str = Form(..., description="The license plate number to track"),
    videos: List[UploadFile] = File(..., description="List of video files (10 or more)"),
    camera_ids: List[str] = Form(..., description="Camera IDs corresponding to the videos in order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process multiple videos to find a specific vehicle by license plate and update its location.
    Runs asynchronously in the background using a ThreadPoolExecutor to handle processing quickly.
    """
    # Normalize camera_ids in case passed as comma-separated or single list
    resolved_camera_ids: List[str] = []
    for cid in camera_ids:
        if "," in cid:
            resolved_camera_ids.extend([c.strip() for c in cid.split(",") if c.strip()])
        elif cid.strip():
            resolved_camera_ids.append(cid.strip())

    if len(videos) != len(resolved_camera_ids):
        # If user supplied 1 camera_id for multiple videos, broadcast it
        if len(resolved_camera_ids) == 1 and len(videos) > 1:
            resolved_camera_ids = resolved_camera_ids * len(videos)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mismatched inputs: Received {len(videos)} video(s) but {len(resolved_camera_ids)} camera ID(s)."
            )

    target_plate_clean = target_plate.strip().upper().replace(" ", "")
    
    # Initialize vehicle if specific plate provided
    vehicle_id = 1
    if target_plate_clean and target_plate_clean not in ["*", "ALL"]:
        vehicle = db.query(Vehicle).filter(Vehicle.primary_plate == target_plate_clean).first()
        if not vehicle:
            vehicle = Vehicle(
                primary_plate=target_plate_clean,
                first_seen_at=datetime.utcnow(),
                last_seen_at=datetime.utcnow()
            )
            db.add(vehicle)
            db.commit()
            db.refresh(vehicle)
        vehicle_id = vehicle.id
        
    # Save files to temp on disk for background processing
    video_paths = []
    for video in videos:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            content = await video.read()
            tmp.write(content)
            video_paths.append(tmp.name)

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "pending",
        "target_plate": target_plate_clean,
        "results": [],
        "error": None
    }
    
    background_tasks.add_task(
        run_background_job, 
        job_id, 
        video_paths, 
        camera_ids, 
        target_plate_clean, 
        vehicle.id
    )

    return {
        "job_id": job_id,
        "status": "processing",
        "message": f"Processing {len(videos)} videos in the background.",
        "target_plate": target_plate_clean
    }

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str, current_user: User = Depends(get_current_user)):
    """
    Check the status and results of a background video processing job.
    """
    if job_id not in jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
        
    return jobs[job_id]
