"""
app/routers/process.py

FastAPI routes:
  POST /process          — receive, validate, preprocess, and OCR a label image
  GET  /debug/preview/{id} — DEV ONLY: return original or processed image

The POST endpoint runs real Tesseract OCR after OpenCV preprocessing.
The GET debug endpoint is only active when DEBUG_MODE=true in the environment.
"""

import os
import logging
import cv2
import numpy as np
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
import io

from app.utils.validators import validate_image_upload
from app.services.image_service import (
    process_label_image,
    process_multiple_label_images,
    get_debug_entry,
)
from app.rules import evaluate_compliance

router = APIRouter()

logger = logging.getLogger("label_lens.process")

# Read once at startup — avoids repeated os.getenv calls per request
_DEBUG_MODE: bool = os.getenv("DEBUG_MODE", "false").lower() == "true"


# ── POST /process ──────────────────────────────────────────────────────────────

@router.post("/process", summary="Preprocess and analyze 1–4 label images", tags=["Processing"])
async def process_image(
    request: Request,
    image: Optional[UploadFile] = File(default=None),
    images: Optional[List[UploadFile]] = File(default=None),
):
    """
    Receives 1–4 product images (e.g. FRONT and BACK) from the Express backend,
    preprocesses and runs Tesseract OCR separately on each image, combines the OCR
    text, runs field extraction once on the combined text, and evaluates compliance.

    Preserves the standard single-image response schema while adding multi-image
    details (files list and per-image ocr_results for debugging).
    """

    # Correlation ID passed from Express gateway (for tracing stale-data bugs)
    request_id = request.headers.get("X-Request-Id", "????????").upper()

    # ── 1. Collect all uploaded files ──────────────────────────────────────────
    form = await request.form()

    files_to_process: list[UploadFile] = []

    # Check for 'images' first, then 'image', then any UploadFile
    items_images = [v for k, v in form.multi_items() if k == "images" and isinstance(v, UploadFile) and v.filename]
    if items_images:
        files_to_process = items_images
    else:
        items_image = [v for k, v in form.multi_items() if k == "image" and isinstance(v, UploadFile) and v.filename]
        if items_image:
            files_to_process = items_image
        else:
            files_to_process = [v for k, v in form.multi_items() if isinstance(v, UploadFile) and v.filename]

    if not files_to_process:
        if images:
            files_to_process = [f for f in images if f and f.filename]
        elif image and image.filename:
            files_to_process = [image]

    if not files_to_process:
        logger.warning("[FastAPI][%s] No image provided in request.", request_id)
        raise HTTPException(status_code=400, detail="No image provided")

    # Limit to maximum 4 images
    files_to_process = files_to_process[:4]

    logger.info(
        "[FastAPI][%s] Received %d file(s): %s",
        request_id,
        len(files_to_process),
        ", ".join(f"{f.filename}" for f in files_to_process),
    )

    # ── 2. Validate files and read bytes ──────────────────────────────────────
    valid_images: list[tuple[str, bytes]] = []
    for f in files_to_process:
        try:
            b = await validate_image_upload(f)
            valid_images.append((f.filename or "image.png", b))
        except HTTPException as val_err:
            if len(files_to_process) == 1:
                raise val_err
            # If multiple images were provided, skip the invalid one (Requirement 11)

    if not valid_images:
        logger.error("[FastAPI][%s] No valid images could be read.", request_id)
        raise HTTPException(status_code=400, detail="No valid images could be read for processing.")

    logger.info(
        "[FastAPI][%s] Processing %d valid image(s): %s",
        request_id,
        len(valid_images),
        ", ".join(f"{name} ({len(b)} bytes)" for name, b in valid_images),
    )

    # ── 3. Run multi-image preprocessing → OCR → combined extraction ─────────
    try:
        files_meta, combined_ocr, extraction, ocr_results, debug_id = process_multiple_label_images(
            valid_images, debug_mode=_DEBUG_MODE
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Image processing pipeline failed: {str(e)}",
        )

    # ── 4. Build response body ───────────────────────────────────────────────
    primary_meta = files_meta[0] if files_meta else {}
    primary_processing = primary_meta.get("processing", {
        "grayscale": True,
        "denoising": True,
        "contrastEnhancement": True,
        "thresholding": True,
    })

    response_body: dict = {
        "success": True,
        "message": f"{len(valid_images)} image(s) processed successfully",
        "file": {
            "filename": primary_meta.get("filename", valid_images[0][0]),
            "size": primary_meta.get("size", len(valid_images[0][1])),
            "originalWidth": primary_meta.get("originalWidth", 0),
            "originalHeight": primary_meta.get("originalHeight", 0),
            "processedWidth": primary_meta.get("processedWidth", 0),
            "processedHeight": primary_meta.get("processedHeight", 0),
            "wasResized": primary_meta.get("wasResized", False),
        },
        "files": files_meta,
        "processing": primary_processing,
        "ocr": {
            "success": combined_ocr.success,
            "text": combined_ocr.text,
        },
        "ocr_results": ocr_results,
        "extracted": extraction.to_dict(),
    }

    if not combined_ocr.success:
        response_body["ocr"]["error"] = combined_ocr.error

    # ── 5. Append compliance evaluation ──────────────────────────────────────
    compliance_result = evaluate_compliance(extraction)
    response_body["compliance"] = compliance_result.to_dict()

    extracted_product_name = extraction.product_name or "(not detected)"
    logger.info(
        "[FastAPI][%s] Done — product_name: \"%s\", overall_status: %s",
        request_id,
        extracted_product_name,
        compliance_result.to_dict().get("overall_status", "?"),
    )

    if debug_id is not None:
        response_body["debugId"] = debug_id

    return JSONResponse(content=response_body)


# ── GET /debug/preview/{debug_id} ─────────────────────────────────────────────

@router.get(
    "/debug/preview/{debug_id}",
    summary="[DEV ONLY] View original or processed image",
    tags=["Debug"],
    include_in_schema=_DEBUG_MODE,   # Hidden from Swagger docs in production
)
async def debug_preview(
    debug_id: str,
    stage: str = Query(
        default="processed",
        description="Which version to view: 'original' or 'processed'",
    ),
):
    """
    Development-only endpoint to visually compare the original image
    against the preprocessed result.

    This endpoint is ONLY active when DEBUG_MODE=true.
    It is completely absent from production deployments.

    Usage:
      GET /debug/preview/<debugId>?stage=original
      GET /debug/preview/<debugId>?stage=processed
    """
    if not _DEBUG_MODE:
        raise HTTPException(
            status_code=404,
            detail="Endpoint not found.",  # Don't reveal it exists
        )

    entry = get_debug_entry(debug_id)
    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="Debug entry not found. It may have expired or never existed.",
        )

    if stage == "original":
        # Return original bytes directly (already JPEG or PNG)
        media_type = "image/jpeg"  # Express always sends JPEG/PNG/WEBP
        return StreamingResponse(io.BytesIO(entry["original_bytes"]), media_type=media_type)

    elif stage == "processed":
        # Encode the grayscale numpy array as PNG for lossless display
        processed: np.ndarray = entry["processed"]
        success, encoded = cv2.imencode(".png", processed)
        if not success:
            raise HTTPException(status_code=500, detail="Could not encode processed image.")
        return StreamingResponse(io.BytesIO(encoded.tobytes()), media_type="image/png")

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid stage. Use 'original' or 'processed'.",
        )
