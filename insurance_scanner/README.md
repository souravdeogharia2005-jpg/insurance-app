# InsureScan — Offline Insurance Underwriting Scanner

> Zero external APIs. Zero internet after setup. Runs 100% locally.

## What It Does
- Watches `scan_input/` for new images of filled insurance proposal forms
- Preprocesses (CLAHE, deskew, binarise) → runs EasyOCR (CPU) → extracts all fields with ML + regex
- Calculates EMR risk score and full premium breakdown
- Saves JSON + human-readable report to `scan_output/`
- Exposes `POST /api/scan` so the React web app can upload images directly

---

## Quick Start

### 1. Install Python 3.9+

### 2. Install dependencies
```bash
cd insurance_scanner
pip install -r requirements.txt
```

> **Note**: EasyOCR downloads its models (~300 MB) on first run.  
> After that, no internet is needed.

### 3. Run the scanner
```bash
python app.py
```

On first run it will:
1. Generate 500 synthetic training samples
2. Train the field extractor for **50 epochs** (prints progress)
3. Save the model to `models/`
4. Start watching `scan_input/` for images
5. Start the Flask API on **http://localhost:5050**

### 4. Drop an image
Copy any scanned insurance form image (.jpg/.png/.webp) into `scan_input/`.  
Results appear in `scan_output/` within seconds.

---

## Web Integration (React Frontend)

Make sure `python app.py` is running locally, then:
- Open the React app and go to the **Scan** tab
- Upload an image — it calls `http://localhost:5050/api/scan`
- Results (EMR, premium, extracted fields) appear instantly

---

## API Reference

### `POST /api/scan`
Upload a form image and receive structured underwriting results.

**Request**: `multipart/form-data` with field `image` (jpg/png/webp)

**Response JSON**:
```json
{
  "filename":           "form.jpg",
  "timestamp":          "2025-01-01T12:00:00",
  "extracted_fields":   { "name": "...", "height_cm": 170, ... },
  "bmi":                24.2,
  "emr_score":          115,
  "emr_breakdown":      ["Base EMR → 100", "BMI 24.2 → +5", ...],
  "life_class":         "Class III",
  "life_factor":        3,
  "life_loading_pct":   "75%",
  "cir_class":          "Class II",
  "cir_factor":         2,
  "cir_loading_pct":    "60%",
  "life_premium_rs":    12500.00,
  "cir_premium_rs":     4800.00,
  "accident_premium_rs": 1000.00,
  "total_premium_rs":   18300.00,
  "cover_warning":      null,
  "unclear_fields":     [],
  "ocr_confidence_avg": 0.87
}
```

### `GET /api/health`
Returns `{"status":"ok","model_loaded":true}`.

---

## Folder Structure
```
insurance_scanner/
├── app.py               ← Main: Flask API + file watcher (run this)
├── train.py             ← Standalone train script (optional)
├── ocr_engine.py        ← EasyOCR preprocessing pipeline
├── field_extractor.py   ← ML + regex field extraction (50 epochs training)
├── checkbox_detector.py ← OpenCV checkbox detection
├── emr_calculator.py    ← EMR calculation (all hardcoded)
├── premium_calculator.py← Premium calculation (all hardcoded)
├── models/              ← Saved sklearn models (auto-created)
├── scan_input/          ← Drop images here
├── scan_output/         ← Results appear here
├── scanner.log          ← Log file
└── requirements.txt
```

---

## Re-train from Scratch
```bash
python train.py
```
Prompts before overwriting existing model.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `easyocr` slow on first run | It's downloading models (~300MB). One-time only. |
| Low OCR accuracy | Ensure image is >1200px wide, good lighting |
| Port 5050 in use | Edit `app.py` line `app.run(port=5050, ...)` |
| React can't connect | Make sure `python app.py` is running, check firewall |
