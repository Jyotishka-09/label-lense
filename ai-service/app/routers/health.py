"""
app/routers/health.py
Health-check endpoint for the FastAPI AI service.
"""

from datetime import datetime, timezone
from fastapi import APIRouter

router = APIRouter()


@router.get("/", summary="Health check", tags=["Health"])
def health_check():
    """
    Returns a simple JSON confirming the AI service is running.
    No image processing or OCR is triggered here.
    """
    return {
        "status": "ok",
        "service": "Label Lens — FastAPI AI Service",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
