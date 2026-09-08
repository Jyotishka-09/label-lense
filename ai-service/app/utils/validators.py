"""
app/utils/validators.py
Helper functions for validating uploaded image files before processing.
"""

from fastapi import UploadFile, HTTPException

# Maximum allowed file size: 10 MB
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

# MIME types we accept
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


async def validate_image_upload(file: UploadFile) -> bytes:
    """
    Validates an uploaded image file and returns its raw bytes.

    Checks:
    - A file was provided
    - The MIME type is one of: image/jpeg, image/png, image/webp
    - The file size is within the 10 MB limit

    Returns the raw bytes of the file so they can be passed to processing.
    Raises HTTPException with a clear JSON message on any validation failure.
    """
    if file is None or not file.filename:
        raise HTTPException(status_code=400, detail="No image provided")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type: '{file.content_type}'. "
                   "Allowed: JPG, PNG, WEBP",
        )

    # Read all bytes into memory for validation and processing
    image_bytes = await file.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum size is 10 MB",
        )

    return image_bytes
