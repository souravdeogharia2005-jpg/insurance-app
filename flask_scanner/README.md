# 🛡️ AegisAI Insurance Scanner — Flask Backend

A **100% free, offline** Python Flask backend that:
- Scans handwritten + printed insurance proposal forms using **EasyOCR**
- Extracts all fields using regex/keyword matching (no AI APIs)
- Calculates EMR risk score using hardcoded actuarial rules
- Returns final Life, CIR, and Accident premiums in one JSON response

---

## 📋 Requirements

- **Python 3.10, 3.11, or 3.12** (recommended — NOT 3.14 yet, PyTorch not compatible)
- Windows / macOS / Linux
- ~2 GB free disk space (for EasyOCR model download on first run)

> ⚠️ **Important:** If you have Python 3.14 from the Microsoft Store, install Python 3.11 from [python.org](https://www.python.org/downloads/) instead. EasyOCR requires PyTorch which doesn't support Python 3.14 yet.

---

## ⚡ Setup (Step by Step)

### Step 1 — Download Python 3.11
Go to https://www.python.org/downloads/release/python-3119/ and download the **Windows installer (64-bit)**. During install, tick **"Add Python to PATH"**.

### Step 2 — Open a Terminal in this folder
Right-click inside the `flask_scanner` folder → **Open in Terminal** (or PowerShell).

### Step 3 — Create a virtual environment
```bash
python -m venv venv
```

### Step 4 — Activate it
**Windows:**
```bash
venv\Scripts\activate
```
**Mac/Linux:**
```bash
source venv/bin/activate
```
You should see `(venv)` at the start of the prompt.

### Step 5 — Install dependencies
```bash
pip install -r requirements.txt
```
This installs Flask, EasyOCR, PyTorch, Pillow, NumPy. Takes 3–10 minutes depending on internet speed.

### Step 6 — Run the server
```bash
python app.py
```

On **first run**, EasyOCR will download its language model (~500 MB). This is a one-time download.

You should see:
```
============================================================
  🛡️  AegisAI Insurance Scanner — Python Flask Backend
============================================================
  Local:      http://localhost:5000
  Network:    http://192.168.x.x:5000
  Scan API:   POST http://localhost:5000/scan
  Health:     GET  http://localhost:5000/health
============================================================
```

---

## 🧪 Test It

**Health check:**
```bash
curl http://localhost:5000/health
```
Expected: `{"status": "ok"}`

**Scan a form image:**
```bash
curl -X POST http://localhost:5000/scan \
  -F "image=@/path/to/form.jpg"
```

---

## 📡 API Reference

### `GET /health`
Returns `{"status": "ok"}` — used by frontend to check if server is alive.

### `POST /scan`
**Request:** `multipart/form-data` with key `image` (JPEG/PNG file)

**Response:**
```json
{
  "success": true,
  "extracted_fields": {
    "name": "Rahul Sharma",
    "gender": "Male",
    "dob": "15/06/1990",
    "profession": "Engineer",
    "height_cm": 172,
    "weight_kg": 75,
    "yearly_income": 600000,
    "source_income": "Salary",
    "base_cover": 50,
    "cir_cover": 25,
    "accident_cover": 25,
    "family_history": "both_surviving_above_65",
    "health_conditions": { "thyroid": 2 },
    "personal_habits": { "smoking": "occasionally" },
    "occupation_type": "general"
  },
  "bmi": 25.4,
  "emr_score": 10.0,
  "emr_breakdown": [
    "BMI 25.4: +5",
    "Family history (both_surviving_above_65): -10",
    "Thyroid (sev 2): +5",
    "Smoking (occasionally): +5"
  ],
  "premium": {
    "age": 34,
    "life_class": "Standard",
    "life_factor": 0,
    "life_loading_pct": 0,
    "cir_class": "Standard",
    "cir_factor": 0,
    "cir_loading_pct": 0,
    "life_premium_rs": 7500,
    "cir_premium_rs": 7500,
    "accident_premium_rs": 2500,
    "total_premium_rs": 17500,
    "cover_warning": null
  },
  "raw_ocr_lines": [
    {"text": "Insurance Proposal Form", "confidence": 0.998},
    ...
  ]
}
```

---

## 🔗 Connecting to Node.js Frontend

In your Node.js `server.js`, the `/api/scan` route already proxies to this Flask server at `http://127.0.0.1:5000/scan`. So:

1. Start this Flask server: `python app.py`
2. Start your Node server: `npm start` (in the `server/` folder)
3. Open your React app — scanning will work automatically!

---

## 📦 What's Installed

| Package | Purpose |
|---------|---------|
| `flask` | Web server |
| `flask-cors` | Allow cross-origin requests from React/mobile app |
| `easyocr` | OCR for handwritten + printed text (PyTorch-based) |
| `Pillow` | Image loading + preprocessing (contrast, sharpen) |
| `numpy` | Convert image to array for EasyOCR |

---

## ❓ Troubleshooting

**"Python not found"** → Make sure Python is in PATH, or use the full path like `C:\Python311\python.exe`

**"No module named easyocr"** → Make sure your venv is activated before running `pip install`

**First run is slow** → Normal! EasyOCR downloads the model once (~500 MB). Subsequent runs start in seconds.

**Scan is inaccurate** → Use a well-lit, high-resolution photo. The image should be at least 1000px wide.
