# Label Lens 🏷️

**Smart India Hackathon 2026 — Problem Statement SIH26034**

> Software system to check compliance of Packaged Commodities under Legal Metrology (Packaged Commodities) Rules, 2011 by scanning products, images and labels.

---

## Current Architecture

```
React (Vite)
    │  POST /api/inspections/scan   multipart/form-data
    ▼
Express (Node.js)
    │  Validates + saves temp file via Multer
    │  POST /process                multipart/form-data
    ▼
FastAPI (Python)
    │  Validates image (type, size, presence)
    │  Runs OpenCV preprocessing pipeline:
    │    decode → resize → grayscale → denoise → CLAHE → threshold
    ▼
OpenCV (cv2)
    │  Returns preprocessed grayscale binary image (in-memory)
    ▼
Metadata response ← back up the chain to React
```

> **OCR is NOT implemented yet.**  
> **Compliance rules are NOT implemented yet.**  
> **MongoDB is NOT implemented yet.**

---

## Project Structure

```
Label Lens/
├── Frontend/        React + Vite (port 5173)
├── backend/         Node.js + Express (port 5000)
├── ai-service/      Python + FastAPI + OpenCV (port 8000)
└── README.md
```

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | v18+ |
| npm | v9+ |
| Python | v3.10+ |
| Tesseract OCR | v5+ *(required in a future OCR step — not yet)* |

---

## Quick Start

Each service is independent. Open **three separate terminals**.

### 1 — Frontend (React + Vite)

```bash
cd Frontend
cp .env.example .env       # first time only
npm install                # first time only
npm run dev
```

Runs at: **http://localhost:5173**

---

### 2 — Backend (Node.js + Express)

```bash
cd backend
cp .env.example .env       # first time only
npm install                # first time only
npm run dev
```

Runs at: **http://localhost:5000**

Health check: `GET http://localhost:5000/`

---

### 3 — AI Service (Python + FastAPI)

```bash
cd ai-service
cp .env.example .env                           # first time only
python -m pip install -r requirements.txt     # first time only
python -m uvicorn main:app --reload --port 8000
```

Runs at: **http://localhost:8000**

Health check: `GET http://localhost:8000/`

Interactive API docs: **http://localhost:8000/docs**

---

## Environment Variables

### Frontend — `Frontend/.env`

| Variable | Default | Description |
|---|---|---|
| `VITE_BACKEND_URL` | `http://localhost:5000` | Express backend URL |

### Backend — `backend/.env`

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Express listen port |
| `AI_SERVICE_URL` | `http://localhost:8000` | FastAPI service URL |

### AI Service — `ai-service/.env`

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Uvicorn listen port |
| `DEBUG_MODE` | `false` | Enable dev-only visual debug endpoint |
| `TESSERACT_CMD` | *(system default)* | Path to `tesseract.exe` — needed in a future step |

---

## Port Summary

| Service | Port |
|---|---|
| Frontend | 5173 |
| Backend (Express) | 5000 |
| AI Service (FastAPI) | 8000 |

---

## OpenCV Preprocessing Pipeline

The AI service runs this pipeline on every uploaded image before returning a response:

| Stage | Technique | Purpose |
|---|---|---|
| Decode | `cv2.imdecode` | Convert bytes → OpenCV array in memory |
| Resize | `cv2.INTER_AREA` | Downscale images > 2000 px (aspect-ratio preserved) |
| Grayscale | `cv2.COLOR_BGR2GRAY` | Remove colour; reduce data size |
| Denoise | `GaussianBlur(3×3)` | Smooth noise without blurring letter strokes |
| Contrast | CLAHE (clipLimit=2.0) | Local contrast fix for uneven lighting / shadows |
| Threshold | Adaptive Gaussian | Binary image: black text on white background |

See `ai-service/README.md` for full details and the development debug workflow.

---

## Legal Metrology (PC) Rules, 2011 — Mandatory Label Fields

The compliance engine *(implemented in later steps)* will check for:

- Name / generic name of the commodity
- Net quantity (weight, volume, or count)
- Maximum Retail Price (MRP incl. all taxes)
- Name and address of manufacturer / packer / importer
- Country of origin (for imported goods)
- Customer care contact details
- Month and year of manufacture / packing / import
- Best before / expiry date (where applicable)
- FSSAI licence number (for food items)
- BIS ISI mark (for standardised goods)

---

## Development Roadmap

- [x] Step 1 — Project scaffolding & health checks
- [x] Step 2a — Frontend UI layout & Image Selection
- [x] Step 2b — Image upload API (React → Express + Multer)
- [x] Step 2c — Express → FastAPI integration
- [x] Step 3 — Image preprocessing (OpenCV) ← **CURRENT STEP**
- [ ] Step 4 — OCR integration (Tesseract via pytesseract)
- [ ] Step 5 — Label field extraction
- [ ] Step 6 — Compliance rule engine (Legal Metrology)
- [ ] Step 7 — MongoDB inspection history
- [ ] Step 8 — Frontend results & history pages
- [ ] Step 9 — Dashboard

---

> **Current state:**  
> Uploading an image on the `/scan` page sends it through React → Express → FastAPI.  
> FastAPI validates it and runs the full OpenCV preprocessing pipeline.  
> The preprocessed image is held in memory; metadata (dimensions, pipeline flags) is returned to React.  
> No OCR, no compliance checking, no database writes happen yet.
