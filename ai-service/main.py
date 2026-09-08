"""
main.py
Entry point for the Label Lens FastAPI AI service.

Current implementation:
  - Health check            GET /
  - Image preprocessing     POST /process
  - Dev debug viewer        GET /debug/preview/{id}  (DEBUG_MODE=true only)

Future steps will add:
  - OCR (pytesseract)
  - Label field extraction
  - Legal Metrology compliance rules
"""

from dotenv import load_dotenv
load_dotenv()  # Load .env before anything that reads os.getenv

import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)

from fastapi import FastAPI
from app.routers import health
from app.routers import process

# ── App creation ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="Label Lens — AI Service",
    description=(
        "OpenCV image preprocessing for product/label images. "
        "OCR and compliance rule engine will be added in future steps."
    ),
    version="1.1.0",
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(process.router)
