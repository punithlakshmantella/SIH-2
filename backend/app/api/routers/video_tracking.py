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
from app.models.models import User, Vehicle, VehicleDetection, Camera
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
                        
                        # Fuzzy match instead of exact match
                        if is_match(detected_plate, target_plate_clean, threshold=2) or target_plate_clean in detected_plate:
                            # Deduplication check
                            if last_detection_time is None or (frame_offset_seconds - last_detection_time > DEDUP_WINDOW_SECONDS):
                                
                                detection = VehicleDetection(
                                    camera_id=camera_id,
                                    vehicle_id=vehicle_id,
                                    raw_plate_text=result.raw_text,
                                    normalized_plate_text=detected_plate,
                                    ocr_confidence=result.ocr_confidence,
                                    vehicle_type=result.vehicle_type,
                                    vehicle_color=result.vehicle_color,
                                    timestamp=datetime.utcnow(),
                                    frame_offset_seconds=frame_offset_seconds
                                )
                                db.add(detection)
                                
                                # Update vehicle location
                                vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
                                if vehicle:
                                    vehicle.last_seen_at = datetime.utcnow()
                                    vehicle.last_camera_id = camera_id
                                    vehicle.total_detections += 1
                                
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
    if len(videos) != len(camera_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mismatched inputs: Received {len(videos)} videos but {len(camera_ids)} camera IDs."
        )

    target_plate_clean = target_plate.strip().upper().replace(" ", "")
    
    # Initialize vehicle if not present
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
