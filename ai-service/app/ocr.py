"""
app/ocr.py

Real Tesseract OCR on a preprocessed OpenCV image with multi-variant robustness.

Responsibilities:
  - Accept a PreprocessingResult from preprocessing_service
  - Generate multiple OCR preprocessing variants for difficult/curved/low-contrast packaging:
      1. CLAHE-enhanced grayscale (existing primary pass)
      2. Plain grayscale
      3. Enlarged / upscaled image (1.5x - 2.0x)
      4. Sharpened image (unsharp mask / Laplacian kernel)
      5. Otsu thresholded image
      6. Adaptive thresholded image
  - Run Tesseract OCR on the useful variants with optimal page-segmentation modes (PSM 3, 4, 6)
  - Score, select, and combine the best text while preserving real text from the image
  - Return an OcrResult with success flag and text (or error message)

Requirements:
  - pytesseract must be pip-installed (wrapper)
  - Tesseract executable must be installed on the OS
  - On Windows, set TESSERACT_CMD env var to point to the .exe
"""

import os
import re
import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional

import cv2
import numpy as np

if TYPE_CHECKING:
    from app.services.preprocessing_service import PreprocessingResult

logger = logging.getLogger(__name__)

# ── Optional imports ──────────────────────────────────────────────────────────
# Guard both imports so the service still starts even when
# pytesseract or Tesseract itself is unavailable.

try:
    from PIL import Image as PilImage
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False
    logger.warning("Pillow is not installed. OCR will be unavailable.")

try:
    import pytesseract
    _PYTESSERACT_AVAILABLE = True
except ImportError:
    _PYTESSERACT_AVAILABLE = False
    logger.warning("pytesseract is not installed. OCR will be unavailable.")


try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Windows executable path override ─────────────────────────────────────────
# Read TESSERACT_CMD from .env or check default Windows installation path
_TESSERACT_CMD = os.getenv("TESSERACT_CMD", "").strip()
if not _TESSERACT_CMD and os.path.exists(r"C:\Program Files\Tesseract-OCR\tesseract.exe"):
    _TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

if _PYTESSERACT_AVAILABLE and _TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = _TESSERACT_CMD
    logger.info("Tesseract executable set to: %s", _TESSERACT_CMD)


# ── Public result type ────────────────────────────────────────────────────────

@dataclass
class OcrResult:
    """
    Carries the outcome of an OCR run.

    Attributes:
        success: True if Tesseract ran without error.
        text:    Extracted text (may be empty if the image contains no text).
        error:   Human-readable reason when success is False. None otherwise.
    """
    success: bool
    text: str
    error: str | None = None


# ── Internal helpers ──────────────────────────────────────────────────────────

def _numpy_to_pil(arr: np.ndarray) -> "PilImage.Image":
    """Convert a 2-D uint8 numpy array to a Pillow grayscale image."""
    return PilImage.fromarray(arr)


def _tesseract_string(pil_img: "PilImage.Image", psm: int) -> str:
    """
    Run pytesseract on a Pillow image with a given page-segmentation mode.
    Returns the stripped text, or raises pytesseract exceptions.
    """
    return pytesseract.image_to_string(
        pil_img,
        lang="eng",
        config=f"--oem 3 --psm {psm}",
    ).strip()


_LABEL_KEYWORDS = re.compile(
    r"\b(?:mrp|m\.?r\.?p|net\s*(?:wt|weight|qty|quantity)|mfd|mfg|manufactur|"
    r"packed|packer|marketed|batch|lot|expir|expiry|use\s*by|best\s*before|"
    r"fssai|lic|ingredient|nutrition|protein|carb|fat|energy|sodium|"
    r"consumer|customer|care|helpline|storage|veg|vegetarian|pvt|ltd|limited|"
    r"flavour|flavor|style|crunchy|crispy|salt|sugar|oil|biscuits?|cookies?|"
    r"extra|taxes|incl|original)\b",
    re.IGNORECASE,
)


def _score_ocr_text(text: str) -> float:
    """
    Score the quality of OCR output based on real words, keywords, and alphanumeric density.
    """
    if not text:
        return 0.0
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return 0.0

    words = re.findall(r"[A-Za-z]{3,}", text)
    real_words = [w for w in words if len(set(w.lower())) > 1]
    kw_hits = len(_LABEL_KEYWORDS.findall(text))
    alnum = sum(1 for c in text if c.isalnum())
    noise = sum(1 for c in text if c in r"|\/<>[]{}^~*_")
    clean_ratio = alnum / max(len(text), 1)

    score = len(real_words) * 2.0 + kw_hits * 10.0 + clean_ratio * 20.0 - noise * 1.5
    return max(score, 0.0)


def _clean_ocr_line(line: str) -> str:
    """Strip leading/trailing noise symbols, quotes, and stray border artifacts."""
    line = re.sub(r"^[^\w\s\(\)₹\$]+", "", line)
    line = re.sub(r"[^\w\s\(\)₹\$]+$", "", line)
    line = re.sub(r"^[A-Za-z0-9]{1,2}\s*[\|\]\)\-]\s*", "", line)
    line = re.sub(r"\s*[\|\[\]]\s*[A-Za-z0-9]{1,2}\s*$", "", line)
    line = line.replace("\ufffd", " ")
    return re.sub(r"\s+", " ", line).strip()


def _norm_tokens(line: str) -> set[str]:
    """Extract lowercase alphanumeric tokens of length >= 2 for overlap checking."""
    return set(re.findall(r"[a-z0-9]{2,}", line.lower()))


def _is_valid_ocr_line(line: str) -> bool:
    """Filter out lines that are purely symbol noise or have insufficient characters."""
    if len(line) < 3 or len(line) > 120:
        return False
    alnum = sum(1 for c in line if c.isalnum())
    is_price_candidate = bool(
        re.search(r"(?:[₹\u20b9\u20a8]|\brs\.?|\binr\b|[FfzZxXtT=~&%£\?\\\/<])\s*\d{1,5}", line, re.IGNORECASE)
        or re.search(r"\b\d{1,5}\s*/\-", line)
    )
    if is_price_candidate and alnum >= 2:
        return True
    if alnum < 3 or alnum / len(line) < 0.35:
        return False
    if sum(1 for c in line if c in r"|\/<>[]{}^~*_#") / len(line) > 0.30:
        return False

    words_4 = [w for w in re.findall(r"[A-Za-z]{4,}", line) if len(set(w.lower())) > 1]
    words_3 = [w for w in re.findall(r"[A-Za-z]{3,}", line) if len(set(w.lower())) > 1]
    has_real_words = len(words_4) >= 1 or len(words_3) >= 2
    has_digits = bool(re.search(r"\d", line))
    has_kw = bool(_LABEL_KEYWORDS.search(line))

    return has_real_words or has_digits or has_kw


def _combine_and_select_ocr(variant_results: list[tuple[str, str]]) -> str:
    """
    Select the best-scoring variant as base text and merge unique high-value lines
    from other variants without inventing or duplicating content.
    """
    if not variant_results:
        return ""

    scored = [(_score_ocr_text(t), name, t) for name, t in variant_results if t.strip()]
    if not scored:
        return ""

    # Sort descending by score
    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best_name, base_text = scored[0]

    merged_lines: list[str] = []
    seen_token_sets: list[set[str]] = []

    for raw_l in base_text.splitlines():
        l = _clean_ocr_line(raw_l)
        if _is_valid_ocr_line(l):
            tokens = _norm_tokens(l)
            merged_lines.append(l)
            seen_token_sets.append(tokens)

    # Merge unique lines from other variants
    for score, name, text in scored[1:]:
        for raw_line in text.splitlines():
            line = _clean_ocr_line(raw_line)
            if not _is_valid_ocr_line(line):
                continue

            tokens = _norm_tokens(line)
            if not tokens:
                continue

            # Check overlap with existing lines
            redundant = False
            for idx, existing_tokens in enumerate(seen_token_sets):
                if not existing_tokens:
                    continue
                overlap = len(tokens & existing_tokens)
                # If tokens are completely contained in an existing line, redundant:
                if tokens.issubset(existing_tokens):
                    redundant = True
                    break
                # If existing line's tokens are completely contained in new line, upgrade:
                if existing_tokens.issubset(tokens) and len(tokens) > len(existing_tokens):
                    merged_lines[idx] = line
                    seen_token_sets[idx] = tokens
                    redundant = True
                    break
                # If high overlap ratio (> 75%), skip
                if overlap / max(len(tokens), 1) > 0.75:
                    redundant = True
                    break

            if redundant:
                continue

            merged_lines.append(line)
            seen_token_sets.append(tokens)

    return "\n".join(merged_lines)


# ── Public function ───────────────────────────────────────────────────────────

def run_ocr(preprocessing_result: "PreprocessingResult") -> OcrResult:
    """
    Run multi-variant Tesseract OCR on the OpenCV preprocessing output.

    Variants evaluated:
      1. CLAHE-enhanced grayscale (PSM 3 & PSM 6)
      2. Full color RGB (PSM 11 sparse & PSM 6 uniform block)
      3. Inverted grayscale (PSM 6 & PSM 11) for light text on dark backgrounds
      4. Upscaled CLAHE inverted (PSM 6)
      5. Sharpened image (unsharp mask filter, PSM 6)
      6. Inverted Otsu threshold (PSM 6)
      7. Plain grayscale (PSM 4 single-column)
      8. Adaptive thresholded image (PSM 6)

    Combines and selects the highest-scoring text while merging unique lines
    across variants to maximize readability on food/packaged goods labels.

    Args:
        preprocessing_result: The PreprocessingResult returned by preprocess_image().

    Returns:
        OcrResult with success=True and the extracted text on success,
        or success=False and a descriptive error message if OCR cannot run.
    """
    # ── Guard: dependencies present? ─────────────────────────────────────────
    if not _PIL_AVAILABLE:
        return OcrResult(
            success=False,
            text="",
            error="Pillow is not installed. Install it with: pip install Pillow",
        )

    if not _PYTESSERACT_AVAILABLE:
        return OcrResult(
            success=False,
            text="",
            error="pytesseract is not installed. Install it with: pip install pytesseract",
        )

    # ── Guard: Tesseract executable reachable? ────────────────────────────────
    try:
        pytesseract.get_tesseract_version()
    except pytesseract.TesseractNotFoundError:
        cmd_hint = _TESSERACT_CMD or "tesseract"
        return OcrResult(
            success=False,
            text="",
            error=(
                f"Tesseract executable not found (looked for '{cmd_hint}'). "
                "Install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki "
                "and either add it to PATH or set TESSERACT_CMD in your .env file."
            ),
        )
    except Exception as exc:
        return OcrResult(
            success=False,
            text="",
            error=f"Unexpected error checking Tesseract version: {exc}",
        )

    # ── Extract and generate preprocessing variants ───────────────────────────
    enhanced_gray = preprocessing_result.enhanced_image
    base_gray = getattr(preprocessing_result, "base_gray", None)
    if base_gray is None:
        base_gray = enhanced_gray
    binary_adaptive = preprocessing_result.processed_image
    color_img = getattr(preprocessing_result, "color_image", None)

    # Compute upscaled image (1.4x - 1.6x, capped at 2200px to maintain speed)
    h, w = enhanced_gray.shape[:2]
    scale = min(1.5, 2200.0 / max(h, w))
    if scale > 1.1:
        gray_up = cv2.resize(base_gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        clahe_up = cv2.resize(enhanced_gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    else:
        gray_up = base_gray
        clahe_up = enhanced_gray

    # Polarity inverted variants (crucial for white text on dark/colored packaging)
    gray_up_inv = cv2.bitwise_not(gray_up)
    clahe_up_inv = cv2.bitwise_not(clahe_up)

    # Sharpened variant
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
    sharpened = cv2.filter2D(clahe_up, -1, kernel)

    # Otsu inverted variant
    _, otsu_inv = cv2.threshold(clahe_up_inv, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Adaptive threshold variant
    adapt = cv2.adaptiveThreshold(
        gray_up, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 6
    )

    # RGB color image (for color packaging where Tesseract's native multi-channel works best)
    rgb_img = cv2.cvtColor(color_img, cv2.COLOR_BGR2RGB) if color_img is not None else None

    variant_runs = [
        ("clahe_gray_psm3", enhanced_gray, 3),
        ("clahe_up_psm6", clahe_up, 6),
        ("gray_up_inv_psm6", gray_up_inv, 6),
        ("gray_up_inv_psm11", gray_up_inv, 11),
        ("clahe_up_inv_psm6", clahe_up_inv, 6),
        ("otsu_up_inv_psm6", otsu_inv, 6),
        ("sharpened_psm6", sharpened, 6),
        ("plain_gray_psm4", base_gray, 4),
        ("adaptive_psm6", adapt, 6),
    ]

    # Middle statutory band variant for curved container labels (e.g. jars/bottles)
    mfr_crop = base_gray[int(h * 0.33):int(h * 0.50), int(w * 0.10):int(w * 0.50)]
    if mfr_crop.shape[0] > 30 and mfr_crop.shape[1] > 30:
        mfr_up = cv2.resize(mfr_crop, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        variant_runs.append(("mfr_crop_psm6", mfr_up, 6))

    # Center brand band for front-of-pack snack/biscuit/pouch products
    brand_crop = base_gray[int(h * 0.08):int(h * 0.60), int(w * 0.15):int(w * 0.85)]
    if brand_crop.shape[0] > 50 and brand_crop.shape[1] > 50:
        brand_up = cv2.resize(brand_crop, None, fx=1.6, fy=1.6, interpolation=cv2.INTER_CUBIC)
        variant_runs.append(("brand_crop_psm6", brand_up, 6))

    if rgb_img is not None:
        variant_runs.insert(2, ("rgb_psm11", rgb_img, 11))
        variant_runs.insert(3, ("rgb_psm6", rgb_img, 6))

    variant_results = []
    last_error = None

    for name, v_img, psm in variant_runs:
        try:
            pil_img = _numpy_to_pil(v_img)
            txt = _tesseract_string(pil_img, psm=psm)
            if txt:
                variant_results.append((name, txt))
        except Exception as exc:
            last_error = str(exc)
            logger.debug("Variant %s (psm=%d) error: %s", name, psm, exc)

    # ── Combine and select best OCR text ──────────────────────────────────────
    combined_text = _combine_and_select_ocr(variant_results)

    if not combined_text and not variant_results:
        # Fallback to binary image with psm 6 if all variants were empty
        try:
            pil_binary = _numpy_to_pil(binary_adaptive)
            combined_text = _tesseract_string(pil_binary, psm=6)
        except Exception as exc:
            return OcrResult(success=False, text="", error=f"Tesseract OCR error: {exc}")

    if not combined_text and last_error:
        return OcrResult(success=False, text="", error=last_error)

    logger.info("Multi-variant OCR completed. Total characters: %d", len(combined_text))
    return OcrResult(success=True, text=combined_text)
