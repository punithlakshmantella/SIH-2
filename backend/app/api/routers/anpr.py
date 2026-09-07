from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
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
            "condition_badge": "CLEAN",
            "ground_truth": "AP39AB1234",
            "description": "Standard daylight, direct frontal angle, high contrast, IND hologram",
            "expected_behavior": "High confidence OCR read (>95%)",
            "url": "/api/v1/anpr/sample-image/clean_ap39ab1234.jpg"
        },
        {
            "filename": "clean_ts09ef5678.jpg",
            "title": "Clean Reference — TS09EF5678 (Hyundai Creta)",
            "condition": "clean",
            "condition_badge": "CLEAN",
            "ground_truth": "TS09EF5678",
            "description": "Clear daylight shot, sharp characters, standard font",
            "expected_behavior": "High confidence OCR read (>95%)",
            "url": "/api/v1/anpr/sample-image/clean_ts09ef5678.jpg"
        },
        {
            "filename": "clean_ka01mn9012.jpg",
            "title": "Clean Reference — KA01MN9012 (Toyota Innova)",
            "condition": "clean",
            "condition_badge": "CLEAN",
            "ground_truth": "KA01MN9012",
            "description": "Optimal lighting, clean bumper frame",
            "expected_behavior": "High confidence OCR read (>95%)",
            "url": "/api/v1/anpr/sample-image/clean_ka01mn9012.jpg"
        },
        {
            "filename": "degraded_toll_ap39ab1234.jpg",
            "title": "Degraded Toll Camera — AP39A?1234 (Toll Night)",
            "condition": "degraded",
            "condition_badge": "GLARE + NIGHT",
            "ground_truth": "AP39AB1234",
            "description": "Night shot at Aganampudi Toll Plaza, floodlight glare, motion blur on middle character",
            "expected_behavior": "Visibly lower confidence (~61%), flagged as 'LOW CONFIDENCE' with '?' character",
            "url": "/api/v1/anpr/sample-image/degraded_toll_ap39ab1234.jpg"
        },
        {
            "filename": "degraded_lowlight_ts09ub4432.jpg",
            "title": "Degraded Low-Light — TS09UB4432",
            "condition": "degraded",
            "condition_badge": "NIGHT / LOW LIGHT",
            "ground_truth": "TS09UB4432",
            "description": "Low-light night underpass capture with high optical noise",
            "expected_behavior": "Reduced confidence read with low-light notice",
            "url": "/api/v1/anpr/sample-image/degraded_lowlight_ts09ub4432.jpg"
        },
        {
            "filename": "degraded_motionblur_ka01mn7712.jpg",
            "title": "Degraded Motion Blur — KA01MN7712",
            "condition": "degraded",
            "condition_badge": "MOTION BLUR",
            "ground_truth": "KA01MN7712",
            "description": "Severe horizontal speed blur across license plate glyphs",
            "expected_behavior": "Low confidence read, partial character ambiguity",
            "url": "/api/v1/anpr/sample-image/degraded_motionblur_ka01mn7712.jpg"
        },
        {
            "filename": "degraded_dirtyplate_ap31tx9901.jpg",
            "title": "Degraded Mud/Dirty Plate — AP31TX9901",
            "condition": "degraded",
            "condition_badge": "DIRTY PLATE",
            "ground_truth": "AP31TX9901",
            "description": "Mud splatter and particulate occlusion across registration numbers",
            "expected_behavior": "Confidence drops, flagged for operator verification",
            "url": "/api/v1/anpr/sample-image/degraded_dirtyplate_ap31tx9901.jpg"
        },
        # Real-World Datacluster Indian Plates Dataset
        {
            "filename": "dc_license_plates_3HE1J0YIRGRDENVO.jpg",
            "title": "Dataset: Tamil Nadu Sedan — TN58D5353",
            "condition": "dataset",
            "condition_badge": "TAMIL NADU",
            "ground_truth": "TN58D5353",
            "description": "Real-world passenger car from Madurai, Tamil Nadu (Datacluster dataset)",
            "expected_behavior": "High confidence standard read (>95%)",
            "url": "/api/v1/anpr/sample-image/dc_license_plates_3HE1J0YIRGRDENVO.jpg"
        },
        {
            "filename": "dc_auto_image_000024_fqvRhfiO6i.jpg",
            "title": "Dataset: Auto Rickshaw — UP84AE9889",
            "condition": "dataset",
            "condition_badge": "UP AUTO",
            "ground_truth": "UP84AE9889",
            "description": "Commercial three-wheeler auto rickshaw from Uttar Pradesh",
            "expected_behavior": "Three-wheeler plate localization and OCR",
            "url": "/api/v1/anpr/sample-image/dc_auto_image_000024_fqvRhfiO6i.jpg"
        },
        {
            "filename": "dc_bus_image_000033_XUH0eV452t.jpg",
            "title": "Dataset: Transit Bus — GJ01DY6855",
            "condition": "dataset",
            "condition_badge": "GUJARAT BUS",
            "ground_truth": "GJ01DY6855",
            "description": "State transport transit bus from Ahmedabad, Gujarat",
            "expected_behavior": "Commercial yellow/white fleet classification",
            "url": "/api/v1/anpr/sample-image/dc_bus_image_000033_XUH0eV452t.jpg"
        },
        {
            "filename": "dc_license_plates_0RBAQHKIXQMDFYZD.jpg",
            "title": "Dataset: West Bengal — WB42AX7446",
            "condition": "dataset",
            "condition_badge": "WEST BENGAL",
            "ground_truth": "WB42AX7446",
            "description": "Standard high-contrast registration plate from West Bengal",
            "expected_behavior": "Valid RTO format verification",
            "url": "/api/v1/anpr/sample-image/dc_license_plates_0RBAQHKIXQMDFYZD.jpg"
        },
        {
            "filename": "dc_license_plates_0RRPJCID3RRLSFTI.jpg",
            "title": "Dataset: Madhya Pradesh — MP07L7524",
            "condition": "dataset",
            "condition_badge": "MADHYA PRADESH",
            "ground_truth": "MP07L7524",
            "description": "Passenger vehicle from Gwalior, Madhya Pradesh",
            "expected_behavior": "Optimal OCR character segmentation",
            "url": "/api/v1/anpr/sample-image/dc_license_plates_0RRPJCID3RRLSFTI.jpg"
        },
        {
            "filename": "dc_license_plates_2DZ4YT4ZJ9XJZSO0.jpg",
            "title": "Dataset: Rajasthan — RJ11GB1829",
            "condition": "dataset",
            "condition_badge": "RAJASTHAN",
            "ground_truth": "RJ11GB1829",
            "description": "Multi-axle commercial vehicle from Dholpur, Rajasthan",
            "expected_behavior": "Accurate state RTO validation",
            "url": "/api/v1/anpr/sample-image/dc_license_plates_2DZ4YT4ZJ9XJZSO0.jpg"
        },
        {
            "filename": "dc_license_plates_3GKHBM5PWHYXHMTE.jpg",
            "title": "Dataset: Kerala — KL41L7001",
            "condition": "dataset",
            "condition_badge": "KERALA",
            "ground_truth": "KL41L7001",
            "description": "Private passenger car from Aluva, Kerala",
            "expected_behavior": "High sharpness score & format validation",
            "url": "/api/v1/anpr/sample-image/dc_license_plates_3GKHBM5PWHYXHMTE.jpg"
        },
        {
            "filename": "dc_license_plates_VZUYOAPZ8633ZQTN.jpg",
            "title": "Dataset: Delhi NCT — DL3CD1210",
            "condition": "dataset",
            "condition_badge": "DELHI NCT",
            "ground_truth": "DL3CD1210",
            "description": "Metropolitan vehicle from National Capital Territory of Delhi",
            "expected_behavior": "High confidence OCR read (>96%)",
            "url": "/api/v1/anpr/sample-image/dc_license_plates_VZUYOAPZ8633ZQTN.jpg"
        }
    ]

    return {"samples": samples_meta}

@router.get("/sample-image/{filename}")
def get_sample_image(filename: str):
    """
    Serve bundled sample footage image directly.
    """
    target_path = os.path.join(SAMPLE_FOOTAGE_DIR, filename)
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Sample image not found")
    return FileResponse(target_path, media_type="image/jpeg")

@router.post("/inference", response_model=ANPRResult)
async def run_anpr_inference(
    sample_filename: Optional[str] = Form(None, description="Filename from bundled sample footage"),
    file: Optional[UploadFile] = File(None, description="Uploaded image file (JPG/PNG)"),
    enable_clahe: bool = Form(True),
    enable_denoise: bool = Form(True),
    enable_deskew: bool = Form(True),
    enable_contrast: bool = Form(True),
    current_user: User = Depends(get_current_user)
):
    """
    Run genuine end-to-end ANPR/OCR inference on an uploaded image or bundled sample footage.
    Returns real plate localization, OpenCV preprocessing history, normalized text, and true optical confidence.
    """
    if file:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded image file is empty"
            )
        result = anpr_engine.detect_and_read(
            image_bytes, 
            source_name=file.filename or "uploaded_image.jpg",
            enable_clahe=enable_clahe,
            enable_denoise=enable_denoise,
            enable_deskew=enable_deskew,
            enable_contrast=enable_contrast
        )
        return result

    elif sample_filename:
        target_path = os.path.join(SAMPLE_FOOTAGE_DIR, sample_filename)
        if not os.path.exists(target_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sample footage image '{sample_filename}' not found in bundled dataset"
            )
        with open(target_path, "rb") as f:
            img_bytes = f.read()
        result = anpr_engine.detect_and_read(
            img_bytes, 
            source_name=sample_filename,
            enable_clahe=enable_clahe,
            enable_denoise=enable_denoise,
            enable_deskew=enable_deskew,
            enable_contrast=enable_contrast
        )
        return result

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'file' (upload) or 'sample_filename' must be provided"
        )
