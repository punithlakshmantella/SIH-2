from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import User
from app.engines.anpr.base import ANPRResult
from app.engines.anpr import anpr_engine

router = APIRouter(prefix="/anpr", tags=["ANPR & OCR Engine"])

possible_paths = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data", "sample_footage")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "sample_footage")),
    os.path.abspath(os.path.join(os.getcwd(), "data", "sample_footage")),
    os.path.abspath(os.path.join(os.getcwd(), "..", "data", "sample_footage"))
]
SAMPLE_FOOTAGE_DIR = next((p for p in possible_paths if os.path.exists(p)), possible_paths[0])

@router.get("/samples")
def list_sample_footage(
    current_user: User = Depends(get_current_user)
):
    """
    List bundled sample footage plate images (clean reference vs degraded adverse conditions).
    """
    if not os.path.exists(SAMPLE_FOOTAGE_DIR):
        return {"samples": []}

    samples_meta = [
        {
            "filename": "clean_ap39ab1234.jpg",
            "title": "Clean Reference — AP39AB1234 (Tata Nexon EV)",
            "condition": "clean",
            "description": "Standard daylight, direct frontal angle, high contrast, IND hologram",
            "expected_behavior": "High confidence OCR read (>95%)",
            "url": "/data/sample_footage/clean_ap39ab1234.jpg"
        },
        {
            "filename": "clean_ts09ef5678.jpg",
            "title": "Clean Reference — TS09EF5678 (Hyundai Creta)",
            "condition": "clean",
            "description": "Clear daylight shot, sharp characters, standard font",
            "expected_behavior": "High confidence OCR read (>95%)",
            "url": "/data/sample_footage/clean_ts09ef5678.jpg"
        },
        {
            "filename": "clean_ka01mn9012.jpg",
            "title": "Clean Reference — KA01MN9012 (Toyota Innova)",
            "condition": "clean",
            "description": "Optimal lighting, clean bumper frame",
            "expected_behavior": "High confidence OCR read (>95%)",
            "url": "/data/sample_footage/clean_ka01mn9012.jpg"
        },
        {
            "filename": "degraded_toll_ap39ab1234.jpg",
            "title": "Degraded Toll Camera — AP39A?1234 (Demo Scenario)",
            "condition": "degraded",
            "description": "Night shot at Aganampudi Toll Plaza, floodlight glare, motion blur on middle character",
            "expected_behavior": "Visibly lower confidence (~61%), flagged as 'LOW CONFIDENCE' with '?' character",
            "url": "/data/sample_footage/degraded_toll_ap39ab1234.jpg"
        },
        {
            "filename": "degraded_lowlight_ts09ub4432.jpg",
            "title": "Degraded Low-Light — TS09UB4432",
            "condition": "degraded",
            "description": "Low-light night underpass capture with high optical noise",
            "expected_behavior": "Reduced confidence read with low-light notice",
            "url": "/data/sample_footage/degraded_lowlight_ts09ub4432.jpg"
        },
        {
            "filename": "degraded_motionblur_ka01mn7712.jpg",
            "title": "Degraded Motion Blur — KA01MN7712",
            "condition": "degraded",
            "description": "Severe horizontal speed blur across license plate glyphs",
            "expected_behavior": "Low confidence read, partial character ambiguity",
            "url": "/data/sample_footage/degraded_motionblur_ka01mn7712.jpg"
        },
        {
            "filename": "degraded_dirtyplate_ap31tx9901.jpg",
            "title": "Degraded Mud/Dirty Plate — AP31TX9901",
            "condition": "degraded",
            "description": "Mud splatter and particulate occlusion across registration numbers",
            "expected_behavior": "Confidence drops, flagged for operator verification",
            "url": "/data/sample_footage/degraded_dirtyplate_ap31tx9901.jpg"
        }
    ]

    return {"samples": samples_meta}

@router.post("/inference", response_model=ANPRResult)
async def run_anpr_inference(
    sample_filename: Optional[str] = Form(None, description="Filename from bundled sample footage"),
    file: Optional[UploadFile] = File(None, description="Uploaded image file (JPG/PNG)"),
    current_user: User = Depends(get_current_user)
):
    """
    Run genuine end-to-end ANPR/OCR inference on an uploaded image or bundled sample footage.
    Returns real plate localization, OpenCV preprocessing history, normalized text, and true optical confidence.
    """
    if file:
        # User uploaded image
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded image file is empty"
            )
        result = anpr_engine.detect_and_read(image_bytes, source_name=file.filename or "uploaded_image.jpg")
        return result

    elif sample_filename:
        # Pick from bundled sample footage
        target_path = os.path.join(SAMPLE_FOOTAGE_DIR, sample_filename)
        if not os.path.exists(target_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sample footage image '{sample_filename}' not found in bundled dataset"
            )
        with open(target_path, "rb") as f:
            img_bytes = f.read()
        result = anpr_engine.detect_and_read(img_bytes, source_name=sample_filename)
        return result

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'file' (upload) or 'sample_filename' must be provided"
        )
