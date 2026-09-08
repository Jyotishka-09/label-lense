"""
app/image_processor.py

OpenCV image pre-processing logic for the Label Lens OCR pipeline.
Re-exports preprocessing functions and classes from app.services.preprocessing_service.
"""

from app.services.preprocessing_service import (
    PreprocessingResult,
    preprocess_image,
    decode_image,
    resize_if_needed,
    convert_to_grayscale,
    denoise,
    enhance_contrast,
    apply_thresholding,
    MAX_WIDTH,
    MAX_HEIGHT,
)

__all__ = [
    "PreprocessingResult",
    "preprocess_image",
    "decode_image",
    "resize_if_needed",
    "convert_to_grayscale",
    "denoise",
    "enhance_contrast",
    "apply_thresholding",
    "MAX_WIDTH",
    "MAX_HEIGHT",
]

