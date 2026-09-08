"""
app/services/extraction_merger.py

Image-aware multi-image extraction merger for the Label Lens AI service.

PURPOSE:
  When 1-4 images are uploaded for a product (e.g. Front, Back, Side):
    - Treats image 0 as the FRONT label.
    - Treats image 1..N as BACK/SIDE labels.
    - Prefers product_name from the FRONT label.
    - Prefers manufacturer/packer, MRP, manufacturing date, expiry/use-by,
      and consumer-care from BACK/SIDE labels.
    - Allows net quantity from either front or back.
    - Merges detected fields into ONE final ExtractionResult.
    - Discards random OCR noise; never invents missing values (leaves unextracted fields as None).
    - Preserves the existing response structure.
    - Never hardcodes any product or company names.
"""

import re
from typing import Optional, Any
from app.extractor import ExtractionResult


def score_product_name(val: Optional[str], role: str) -> float:
    """
    Score product name candidate.
    Prefers FRONT image. Rejects obvious OCR noise and statutory text.
    """
    if not val or not str(val).strip():
        return 0.0
    text = str(val).strip()
    if len(text) < 3 or len(text) > 90:
        return 0.0

    # Must contain substantial letters
    letters = sum(1 for c in text if c.isalpha())
    total = len(text)
    if letters / total < 0.55:
        return 0.0

    # Reject if contains illegal characters or contact patterns
    if re.search(r"[@\\|^~_{}\[\]<>]", text):
        return 0.0

    score = 10.0 + letters
    words = text.split()
    if 1 <= len(words) <= 6:
        score += 15.0
    if text.isupper() or text.istitle():
        score += 10.0

    # Rule 3: Prefer product_name from FRONT image
    if role == "front":
        score += 50.0

    return score


def score_manufacturer(val: Optional[str], role: str) -> float:
    """
    Score manufacturer/packer candidate.
    Prefers BACK/SIDE image. Requires statutory company indicators or clean corporate name.
    """
    if not val or not str(val).strip():
        return 0.0
    text = str(val).strip()
    if len(text) < 6 or len(text) > 200:
        return 0.0

    letters = sum(1 for c in text if c.isalpha())
    if letters / len(text) < 0.50:
        return 0.0

    score = 10.0 + min(len(text), 50)
    # Statutory company keywords
    if re.search(
        r"\b(?:pvt|ltd|limited|private|mfg|manufactur|packer|packed|marketed|holdings|works|foods|beverages|corp|llp)\b",
        text,
        re.IGNORECASE,
    ):
        score += 30.0
    if re.search(
        r"\b(?:plot|sector|road|phase|nagar|industrial|area|p\.?o\.?|box|india)\b",
        text,
        re.IGNORECASE,
    ):
        score += 15.0

    # Rule 4: Prefer manufacturer/packer from BACK/SIDE images
    if role == "back_side":
        score += 50.0

    return score


def score_net_quantity(val: Optional[str], role: str) -> float:
    """
    Score net quantity candidate.
    Equal baseline for front and back (Rule 5).
    Favors standard metric expressions (e.g. 510 g, 110 g).
    """
    if not val or not str(val).strip():
        return 0.0
    text = str(val).strip()
    score = 20.0

    # Standard metric unit check
    if re.search(r"\b\d+(?:\.\d+)?\s*(?:g|kg|ml|l|gm|litres?|liters?)\b", text, re.IGNORECASE):
        score += 30.0

    # Bonus if includes complete breakdown e.g. "110 g (100g + 10g Extra)"
    if "(" in text and ")" in text:
        score += 15.0

    # Penalize suspicious single-digit quantities when longer ones exist
    m = re.search(r"^\d+", text)
    if m and len(m.group(0)) >= 2:
        score += 10.0

    return score


def score_mrp(val: Any, role: str) -> float:
    """
    Score MRP candidate.
    Prefers BACK/SIDE image.
    Validates numeric plausibility.
    """
    if val is None:
        return 0.0
    try:
        num = float(val)
    except (ValueError, TypeError):
        return 0.0

    if num <= 0 or num > 99_999:
        return 0.0

    score = 20.0
    # Common price points
    if num in [5, 10, 20, 25, 30, 40, 50, 60, 75, 99, 100, 149, 150, 199, 249, 299, 349, 399, 499]:
        score += 25.0
    elif num.is_integer() or round(num, 2) == num:
        score += 15.0

    # Rule 4: Prefer MRP from BACK/SIDE images
    if role == "back_side":
        score += 30.0

    return score


def score_date(val: Optional[str], role: str) -> float:
    """
    Score date candidate (MFD or Expiry).
    Prefers BACK/SIDE image.
    """
    if not val or not str(val).strip():
        return 0.0
    text = str(val).strip()
    if len(text) < 4:
        return 0.0

    score = 20.0
    if re.search(r"\b20[2-3][0-9]\b", text):
        score += 25.0
    if re.search(r"\b(?:months?|years?|days?)\s+from\b", text, re.IGNORECASE):
        score += 25.0

    # Rule 4: Prefer dates from BACK/SIDE images
    if role == "back_side":
        score += 50.0

    return score


def score_consumer_care(val: Optional[str], role: str) -> float:
    """
    Score consumer care candidate.
    Prefers BACK/SIDE image.
    """
    if not val or not str(val).strip():
        return 0.0
    text = str(val).strip()
    score = 15.0

    if "@" in text and "." in text:
        score += 40.0
    if re.search(r"\b(?:1800|\d{10,11})\b", text):
        score += 35.0

    # Rule 4: Prefer consumer-care from BACK/SIDE images
    if role == "back_side":
        score += 30.0

    return score


def score_country_of_origin(val: Optional[str], role: str) -> float:
    """
    Score country of origin candidate.
    Equal baseline for front and back.
    """
    if not val or not str(val).strip():
        return 0.0
    text = str(val).strip()
    score = 20.0
    if re.search(r"\b(?:india|usa|japan|germany|china|thailand|uk)\b", text, re.IGNORECASE):
        score += 30.0
    return score


SCORER_REGISTRY = {
    "product_name": score_product_name,
    "manufacturer_or_packer": score_manufacturer,
    "net_quantity": score_net_quantity,
    "mrp": score_mrp,
    "manufacturing_or_packing_date": score_date,
    "best_before_or_use_by": score_date,
    "consumer_care": score_consumer_care,
    "country_of_origin": score_country_of_origin,
}


def merge_multi_image_extractions(
    items: list[dict],
    combined_extraction: Optional[ExtractionResult] = None,
) -> ExtractionResult:
    """
    Merge extraction results across 1-4 images intelligently.

    Args:
        items: List of dictionaries for each image containing:
               - 'index': 0, 1, ...
               - 'role': 'front' (index 0) or 'back_side' (index >= 1)
               - 'extraction': ExtractionResult for that image
               - 'ocr_text': OCR string for that image
        combined_extraction: Optional ExtractionResult from the combined OCR text (fallback).

    Returns:
        One merged ExtractionResult adhering to all 12 multi-image extraction rules.
    """
    if not items:
        return combined_extraction or ExtractionResult()

    if len(items) == 1:
        # Single image upload: return its extraction directly
        return items[0]["extraction"]

    merged_fields: dict[str, Any] = {}

    for field_name, scorer_fn in SCORER_REGISTRY.items():
        candidates: list[tuple[float, Any]] = []

        for item in items:
            role = item.get("role", "back_side")
            ext = item.get("extraction")
            if not ext:
                continue
            val = getattr(ext, field_name, None)
            if val is not None and str(val).strip() != "":
                sc = scorer_fn(val, role)
                if sc > 0:
                    candidates.append((sc, val))

        # Fallback to combined_extraction ONLY if field was not detected in any individual image
        if not candidates and combined_extraction:
            comb_val = getattr(combined_extraction, field_name, None)
            if comb_val is not None and str(comb_val).strip() != "":
                sc = scorer_fn(comb_val, "fallback")
                if sc > 0:
                    candidates.append((sc, comb_val))

        if candidates:
            # Rule 10: choose the most reliable/confident value (highest score)
            candidates.sort(key=lambda x: x[0], reverse=True)
            merged_fields[field_name] = candidates[0][1]
        else:
            # Rule 7: Never invent missing values (remain None)
            merged_fields[field_name] = None

    return ExtractionResult(**merged_fields)
