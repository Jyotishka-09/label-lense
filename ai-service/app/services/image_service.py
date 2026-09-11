"""
app/services/image_service.py

Coordination layer between the FastAPI route and the processing pipeline.

WHY this exists:
  The route (process.py) should not import preprocessing or OCR details directly.
  This thin service lets us swap or extend any stage later without
  touching the route at all.

  Pipeline order:
    1. preprocess_image()   ← OpenCV pipeline (unchanged)
    2. run_ocr()            ← Tesseract OCR on the preprocessed image
    3. extract_fields()     ← regex-based structured field extraction
"""

import uuid
from typing import Optional

import numpy as np

from app.services.preprocessing_service import preprocess_image, PreprocessingResult
from app.ocr import run_ocr, OcrResult
from app.extractor import extract_fields, ExtractionResult
from app.services.extraction_merger import merge_multi_image_extractions


# ── In-memory debug cache ──────────────────────────────────────────────────────
# Stores (original_bytes, processed_image_array) keyed by a short UUID.
# ONLY populated when DEBUG_MODE is enabled.
# Limited to 20 entries to prevent unbounded memory growth during development.
_MAX_DEBUG_ENTRIES = 20
_debug_cache: dict[str, dict] = {}


def process_label_image(
    image_bytes: bytes,
    debug_mode: bool = False,
) -> tuple[PreprocessingResult, OcrResult, ExtractionResult, Optional[str]]:
    """
    Run the full preprocessing → OCR → extraction pipeline on raw image bytes.

    Args:
        image_bytes:  Raw bytes of the uploaded image.
        debug_mode:   When True, store originals + processed image for
                      the /debug/preview endpoint. Never True in production.

    Returns:
        A tuple of:
          - PreprocessingResult  (dimensions, flags, processed array)
          - OcrResult            (success flag, raw OCR text or error)
          - ExtractionResult     (structured fields parsed from OCR text)
          - debug_id             (str UUID if debug_mode=True, else None)

    Raises:
        ValueError   if OpenCV cannot decode the image
        Exception    for any unexpected preprocessing failure
    """
    # Step 1 — OpenCV preprocessing (unchanged)
    result = preprocess_image(image_bytes)

    # Step 2 — Tesseract OCR (primary: CLAHE gray, fallback: binary)
    ocr_result = run_ocr(result)

    # Step 3 — Regex field extraction from OCR text and targeted image badge OCR
    extraction = extract_fields(
        ocr_result.text if ocr_result.success else "",
        image=result.color_image,
        source_name="image_0",
    )

    debug_id: Optional[str] = None
    if debug_mode:
        debug_id = _store_debug_entry(image_bytes, result.processed_image)

    return result, ocr_result, extraction, debug_id


def process_multiple_label_images(
    images_items: list[tuple[str, bytes]],
    debug_mode: bool = False,
) -> tuple[list[dict], OcrResult, ExtractionResult, list[dict], Optional[str]]:
    """
    Run preprocessing and OCR separately on 1–4 product images,
    combine their OCR text, run field extraction, and preserve all
    non-null findings across all images.

    Args:
        images_items: List of (filename, image_bytes) tuples.
        debug_mode:   When True, store first image for /debug/preview.

    Returns:
        tuple containing:
          - files_meta: list of file metadata dictionaries
          - combined_ocr: OcrResult with combined OCR text
          - final_extraction: ExtractionResult containing merged fields from all images
          - ocr_debug_results: list of per-image OCR results for debugging
          - debug_id: str UUID if debug_mode=True, else None
    """
    files_meta = []
    ocr_debug_results = []
    extraction_items = []
    first_processed = None
    first_bytes = None
    debug_id = None

    for idx, (filename, image_bytes) in enumerate(images_items):
        try:
            # 1. OpenCV Preprocessing
            prep_result = preprocess_image(image_bytes)
            if idx == 0:
                first_processed = prep_result.processed_image
                first_bytes = image_bytes

            file_info = {
                "filename": filename,
                "size": len(image_bytes),
                "originalWidth": prep_result.original_width,
                "originalHeight": prep_result.original_height,
                "processedWidth": prep_result.processed_width,
                "processedHeight": prep_result.processed_height,
                "wasResized": prep_result.was_resized,
                "processing": {
                    "grayscale": prep_result.grayscale,
                    "denoising": prep_result.denoising,
                    "contrastEnhancement": prep_result.contrast_enhancement,
                    "thresholding": prep_result.thresholding,
                },
            }
            files_meta.append(file_info)

            # 2. Tesseract OCR on this image
            ocr_res = run_ocr(prep_result)
            role = "front" if idx == 0 else "back_side"
            ocr_entry = {
                "index": idx,
                "role": role,
                "filename": filename,
                "success": ocr_res.success,
                "text": ocr_res.text if ocr_res.success else "",
            }
            if not ocr_res.success:
                ocr_entry["error"] = ocr_res.error
            ocr_debug_results.append(ocr_entry)

            # 3. Individual field extraction with image role awareness (Rules 1 & 2)
            if (ocr_res.success and ocr_res.text) or prep_result.color_image is not None:
                ind_ext = extract_fields(
                    ocr_res.text if ocr_res.success else "",
                    image=prep_result.color_image,
                    source_name=filename,
                )
                extraction_items.append({
                    "index": idx,
                    "role": role,
                    "filename": filename,
                    "extraction": ind_ext,
                    "ocr_text": ocr_res.text if ocr_res.success else "",
                })

        except Exception as img_err:
            # One bad image must not fail the entire scan
            role = "front" if idx == 0 else "back_side"
            ocr_debug_results.append({
                "index": idx,
                "role": role,
                "filename": filename,
                "success": False,
                "error": str(img_err),
                "text": "",
            })
            files_meta.append({
                "filename": filename,
                "size": len(image_bytes),
                "error": str(img_err),
            })

    # Combine OCR text from all successful images
    ocr_texts = [
        r["text"].strip() for r in ocr_debug_results if r.get("success") and r.get("text")
    ]
    combined_text = "\n\n".join(ocr_texts)

    # Combined OCR result
    combined_ocr = OcrResult(
        success=len(ocr_texts) > 0,
        text=combined_text,
        error=None if len(ocr_texts) > 0 else "All uploaded images failed OCR.",
    )

    # Combined extraction used strictly as a low-priority fallback if fields are missing in all individual images
    combined_extraction = extract_fields(combined_text) if combined_text else None

    # Merge fields across images with role-based preference weighting and confidence gating (Rules 1-12)
    final_extraction = merge_multi_image_extractions(
        extraction_items,
        combined_extraction=combined_extraction,
    )

    if debug_mode and first_bytes is not None and first_processed is not None:
        debug_id = _store_debug_entry(first_bytes, first_processed)

    return files_meta, combined_ocr, final_extraction, ocr_debug_results, debug_id


# ── Debug helpers (development only) ──────────────────────────────────────────

def _store_debug_entry(original_bytes: bytes, processed: np.ndarray) -> str:
    """
    Cache the original bytes and processed image under a new UUID.
    Evicts the oldest entry once the cache is full.
    """
    entry_id = str(uuid.uuid4())

    if len(_debug_cache) >= _MAX_DEBUG_ENTRIES:
        # Remove the oldest entry (insertion order is preserved in Python 3.7+)
        oldest_key = next(iter(_debug_cache))
        del _debug_cache[oldest_key]

    _debug_cache[entry_id] = {
        "original_bytes": original_bytes,
        "processed": processed,       # grayscale binary numpy array
    }
    return entry_id


def get_debug_entry(debug_id: str) -> Optional[dict]:
    """
    Retrieve a cached debug entry by ID.
    Returns None if the ID is not found (e.g., expired or never stored).
    """
    return _debug_cache.get(debug_id)
