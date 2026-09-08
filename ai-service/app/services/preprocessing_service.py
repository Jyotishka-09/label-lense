"""
app/services/preprocessing_service.py

OpenCV-based image preprocessing pipeline.

PURPOSE:
  Prepare a raw product/label image for future OCR by improving
  text contrast, reducing noise, and normalising size.

PIPELINE STAGES (in order):
  1. Decode raw bytes → OpenCV image
  2. Resize if the image exceeds MAX_WIDTH or MAX_HEIGHT
  3. Convert to grayscale
  4. Denoise with a Gaussian blur
  5. Enhance local contrast with CLAHE
  6. Apply adaptive thresholding for binary text separation

Each stage is its own small function so individual steps can be
tuned, swapped, or disabled independently when we test on real labels.

NOTE:
  This module does NOT perform OCR.
  It only returns a preprocessed grayscale image suitable for OCR.
"""

import cv2
import numpy as np
from typing import Tuple

# ── Configurable limits ────────────────────────────────────────────────────────
# Images larger than these dimensions are downscaled (aspect ratio preserved).
# Keeping labels at a reasonable resolution prevents huge memory use and
# actually improves Tesseract accuracy (too large = too much noise detail).
MAX_WIDTH = 2000
MAX_HEIGHT = 2000


# ── Public result type ─────────────────────────────────────────────────────────
class PreprocessingResult:
    """
    Carries the processed image and metadata describing what was done.
    Structured as a plain object so the route can easily serialise it.
    """

    def __init__(
        self,
        processed_image: np.ndarray,
        enhanced_image: np.ndarray,
        original_width: int,
        original_height: int,
        processed_width: int,
        processed_height: int,
        was_resized: bool,
        base_gray: np.ndarray | None = None,
        color_image: np.ndarray | None = None,
    ):
        # Binary (adaptively thresholded) image — good for debug/visual preview
        self.processed_image = processed_image
        # CLAHE-enhanced grayscale (pre-threshold) — best input for Tesseract OCR
        self.enhanced_image = enhanced_image
        # Plain grayscale before CLAHE/adaptive thresholding
        self.base_gray = base_gray
        # Decoded BGR color image (resized) for color-channel and RGB OCR passes
        self.color_image = color_image
        self.original_width = original_width
        self.original_height = original_height
        self.processed_width = processed_width
        self.processed_height = processed_height
        self.was_resized = was_resized
        # Record which stages ran (always True for now; kept as flags so
        # future code can toggle stages and the API response stays accurate).
        self.grayscale = True
        self.denoising = True
        self.contrast_enhancement = True
        self.thresholding = True


# ── Stage 1: Decode ────────────────────────────────────────────────────────────

def decode_image(image_bytes: bytes) -> np.ndarray:
    """
    Decode raw bytes into an OpenCV BGR image.

    Why: OpenCV needs a numpy array, not raw bytes.
    We use imdecode rather than writing a temp file to avoid disk I/O.

    Note: OpenCV 5 raises a C++ assertion error for zero-length buffers
    rather than returning None, so we guard against that explicitly.
    """
    if not image_bytes:
        raise ValueError(
            "Image data is empty. The file may not have been uploaded correctly."
        )

    np_array = np.frombuffer(image_bytes, dtype=np.uint8)

    try:
        image = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    except cv2.error as e:
        raise ValueError(
            f"OpenCV could not decode the image. "
            "The file may be corrupted or in an unsupported format."
        ) from e

    if image is None:
        raise ValueError(
            "OpenCV could not decode the image. "
            "The file may be corrupted or in an unsupported format."
        )

    return image


# ── Stage 2: Resize ────────────────────────────────────────────────────────────

def resize_if_needed(image: np.ndarray) -> Tuple[np.ndarray, bool]:
    """
    Downscale the image if it exceeds MAX_WIDTH or MAX_HEIGHT.
    Preserves the aspect ratio using the more constraining dimension.

    Why: Very high-resolution images slow down OCR without improving accuracy.
    We never upscale — that would add blur without useful information.

    Returns: (possibly resized image, whether resizing occurred)
    """
    h, w = image.shape[:2]

    if w <= MAX_WIDTH and h <= MAX_HEIGHT:
        return image, False  # No resize needed

    # Calculate the scale factor that brings both dimensions within limits
    scale = min(MAX_WIDTH / w, MAX_HEIGHT / h)
    new_w = int(w * scale)
    new_h = int(h * scale)

    # INTER_AREA is best for downscaling; preserves detail better than INTER_LINEAR
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return resized, True


# ── Stage 3: Grayscale ─────────────────────────────────────────────────────────

def convert_to_grayscale(image: np.ndarray) -> np.ndarray:
    """
    Convert BGR image to grayscale.

    Why: OCR engines work on luminance, not colour. Removing colour channels
    reduces data size and eliminates colour-based noise.
    """
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


# ── Stage 4: Denoise ───────────────────────────────────────────────────────────

def denoise(gray: np.ndarray) -> np.ndarray:
    """
    Apply a Gaussian blur to reduce high-frequency noise.

    Why: Small noise speckles confuse OCR engines into seeing extra characters.
    A mild Gaussian blur (3×3 kernel) smooths speckles without blurring text edges.

    Kernel (3, 3) is conservative — strong enough to soften noise,
    small enough not to blur thin letterstrokes significantly.
    """
    return cv2.GaussianBlur(gray, (3, 3), 0)


# ── Stage 5: Contrast enhancement ─────────────────────────────────────────────

def enhance_contrast(gray: np.ndarray) -> np.ndarray:
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalization).

    Why: Product labels often have uneven lighting — shadows near edges,
    glare in the centre. CLAHE equalises contrast locally so dark text on a
    shadow region becomes as readable as bright text elsewhere.

    clipLimit=2.0 limits over-amplification of noise in uniform regions.
    tileGridSize=(8, 8) tiles the image into 8×8 blocks for local adaptation.
    """
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


# ── Stage 6: Thresholding ──────────────────────────────────────────────────────

def apply_thresholding(gray: np.ndarray) -> np.ndarray:
    """
    Binarise the image using adaptive Gaussian thresholding.

    Why: OCR accuracy is highest on black-text / white-background binary images.
    Adaptive thresholding (rather than a global threshold) handles labels
    where background brightness varies across the image.

    blockSize=11: neighbourhood size used to compute local threshold.
    C=2: constant subtracted from the mean — fine-tunes sensitivity.

    These values work well for printed text on packaging.
    Adjust blockSize/C if testing reveals issues with specific label types.
    """
    return cv2.adaptiveThreshold(
        gray,
        maxValue=255,
        adaptiveMethod=cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        thresholdType=cv2.THRESH_BINARY,
        blockSize=11,
        C=2,
    )


# ── Public entry point ─────────────────────────────────────────────────────────

def preprocess_image(image_bytes: bytes) -> PreprocessingResult:
    """
    Run the full preprocessing pipeline on raw image bytes.

    Steps:
      decode → resize → grayscale → denoise → contrast → threshold

    Returns a PreprocessingResult containing the processed image and
    metadata about original/final dimensions and which stages ran.

    Raises ValueError if the image cannot be decoded.
    """
    # Stage 1 – Decode
    image = decode_image(image_bytes)
    original_h, original_w = image.shape[:2]

    # Stage 2 – Resize
    image, was_resized = resize_if_needed(image)

    # Stage 3 – Grayscale
    gray_raw = convert_to_grayscale(image)

    # Stage 4 – Denoise
    gray = denoise(gray_raw)

    # Stage 5 – Contrast
    gray = enhance_contrast(gray)

    # Stage 6 – Threshold (binary image — used for debug preview)
    processed = apply_thresholding(gray)
    # Save the pre-threshold CLAHE-enhanced grayscale for OCR use
    # Tesseract's internal Otsu binarisation outperforms our adaptive threshold
    # when it comes to actual text extraction on real product labels.
    enhanced = gray

    processed_h, processed_w = processed.shape[:2]

    return PreprocessingResult(
        processed_image=processed,
        enhanced_image=enhanced,
        original_width=original_w,
        original_height=original_h,
        processed_width=processed_w,
        processed_height=processed_h,
        was_resized=was_resized,
        base_gray=gray_raw,
        color_image=image,
    )
