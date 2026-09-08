# Label Lens — AI Service

Python FastAPI service that accepts uploaded product/label images from the Express backend,
validates them, and runs an OpenCV preprocessing pipeline to prepare them for future OCR.

---

## What this service does

### Why preprocessing before OCR?

Raw product label images arrive in many conditions:

| Problem | Effect on OCR |
|---|---|
| Uneven lighting / shadows | Some characters too dark or too bright to read |
| Low contrast | Text and background look similar to the engine |
| High-frequency noise | Small speckles get interpreted as extra characters |
| Very large resolution | Excess detail slows OCR; can introduce artefacts |
| Coloured background | OCR accuracy drops on colour images vs. grayscale |

Preprocessing converts a noisy real-world photo into a clean, high-contrast, grayscale binary
image — the ideal input for any OCR engine.

---

## Preprocessing pipeline

```
Input bytes (from Express)
        │
        ▼
┌──────────────────┐
│  1. Decode       │  np.frombuffer + cv2.imdecode (in-memory, no temp file)
└──────────────────┘
        │
        ▼
┌──────────────────┐
│  2. Resize       │  Downscale only — INTER_AREA — if w > 2000 or h > 2000
└──────────────────┘  Preserves aspect ratio. Never upscales tiny images.
        │
        ▼
┌──────────────────┐
│  3. Grayscale    │  cv2.COLOR_BGR2GRAY — removes colour, reduces data
└──────────────────┘
        │
        ▼
┌──────────────────┐
│  4. Denoise      │  GaussianBlur(3×3) — smooths salt-and-pepper noise
└──────────────────┘  without blurring thin letter strokes
        │
        ▼
┌──────────────────┐
│  5. Contrast     │  CLAHE — Contrast Limited Adaptive Histogram Equalization
└──────────────────┘  clipLimit=2.0, tileGridSize=(8,8)
                       Handles local shadows / glare on label surfaces
        │
        ▼
┌──────────────────┐
│  6. Threshold    │  Adaptive Gaussian threshold — blockSize=11, C=2
└──────────────────┘  Produces binary (black text / white background) image
        │
        ▼
Preprocessed image (in memory) → metadata returned to Express
```

Each stage is a separate function in `app/services/preprocessing_service.py`.
Individual stages can be tuned, swapped, or disabled without rewriting the pipeline.

---

## Supported image formats

| Format | MIME type |
|---|---|
| JPEG | `image/jpeg` |
| PNG  | `image/png`  |
| WebP | `image/webp` |

Maximum file size: **10 MB**

---

## Maximum image dimensions

| Setting | Value |
|---|---|
| `MAX_WIDTH`  | 2 000 px |
| `MAX_HEIGHT` | 2 000 px |

Images that exceed either dimension are proportionally downscaled.
Tiny images are **not** upscaled — upscaling adds blur without useful information.

These constants are defined at the top of `app/services/preprocessing_service.py`.

---

## Project structure

```
ai-service/
├── main.py                         ← FastAPI entry point
├── requirements.txt
├── .env                            ← local config (not in git)
├── .env.example                    ← copy this to .env
│
└── app/
    ├── __init__.py
    │
    ├── routers/
    │   ├── health.py               ← GET /
    │   └── process.py              ← POST /process, GET /debug/preview/{id}
    │
    ├── services/
    │   ├── image_service.py        ← coordination layer (route → pipeline)
    │   └── preprocessing_service.py ← 6-stage OpenCV pipeline
    │
    └── utils/
        └── validators.py           ← file type, size, presence checks
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Uvicorn listen port |
| `DEBUG_MODE` | `false` | Enable dev-only debug preview endpoint |

---

## How to start

```bash
cd ai-service
cp .env.example .env          # first time only
pip install -r requirements.txt   # first time only

python -m uvicorn main:app --reload --port 8000
```

Interactive API docs: **http://localhost:8000/docs**

---

## How to test POST /process

### Using curl

```bash
curl -X POST http://localhost:8000/process \
     -F "image=@your_label.jpg"
```

### Expected response

```json
{
  "success": true,
  "message": "Image preprocessing completed",
  "file": {
    "filename": "label.jpg",
    "content_type": "image/jpeg",
    "size": 204800,
    "originalWidth": 3024,
    "originalHeight": 4032,
    "processedWidth": 1500,
    "processedHeight": 2000,
    "wasResized": true
  },
  "processing": {
    "grayscale": true,
    "denoising": true,
    "contrastEnhancement": true,
    "thresholding": true
  }
}
```

### Error cases

| Situation | HTTP status | `detail` |
|---|---|---|
| No file | 400 | "No image provided" |
| Empty file | 400 | "Uploaded file is empty" |
| Unsupported type | 415 | "Unsupported image type: '...'" |
| File > 10 MB | 413 | "File too large. Maximum size is 10 MB" |
| Corrupted image | 422 | "OpenCV could not decode the image..." |
| Internal error | 500 | "Image preprocessing failed. Please try again." |

---

## Development: Visual debug preview

To visually compare the original image against the preprocessed result:

**Step 1** — Set `DEBUG_MODE=true` in `ai-service/.env`

**Step 2** — Upload an image via POST /process. The response will include:
```json
{ "debugId": "3f7a1b4c-..." }
```

**Step 3** — Open these URLs in your browser to compare:
```
http://localhost:8000/debug/preview/3f7a1b4c-...?stage=original
http://localhost:8000/debug/preview/3f7a1b4c-...?stage=processed
```

> **Warning:** Set `DEBUG_MODE=false` (the default) in any shared or deployed environment.
> The debug endpoint is completely hidden from API docs when debug mode is off.
> The in-memory cache holds a maximum of 20 entries and is cleared on restart.

---

## What is NOT implemented yet

| Feature | Status |
|---|---|
| OCR (text extraction) | ❌ Not implemented — next step |
| Label field extraction | ❌ Not implemented |
| Legal Metrology compliance rules | ❌ Not implemented |
| MongoDB inspection history | ❌ Not implemented |
| Authentication | ❌ Not implemented |
