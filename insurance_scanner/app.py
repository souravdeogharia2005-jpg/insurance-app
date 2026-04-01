"""
app.py
Main entry point:
  • Flask REST API on port 5050  (POST /api/scan, GET /api/health)
  • Watchdog file-watcher on scan_input/ (runs in background thread)

Run with:  python app.py
"""

import os
import sys
import json
import logging
import threading
import time
import gc
from datetime import datetime
from pathlib import Path

# ── Flask ──────────────────────────────────────────────────────────────────────
from flask import Flask, request, jsonify
from flask_cors import CORS

# ── Local modules ─────────────────────────────────────────────────────────────
from field_extractor  import train_model, load_model, extract_fields_from_text, MODEL_PATH
from ocr_engine       import scan_image
from checkbox_detector import detect_checkboxes, map_checkboxes_to_fields
from emr_calculator   import calculate_total_emr, occupation_extra_per_mille
from premium_calculator import calculate_premium

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
INPUT_DIR   = BASE_DIR / 'scan_input'
OUTPUT_DIR  = BASE_DIR / 'scan_output'
LOG_FILE    = BASE_DIR / 'scanner.log'
MODEL_DIR   = BASE_DIR / 'models'

INPUT_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)

# ── Flask app ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Module-level ML model reference (loaded after training)
_ML_MODEL = None


# ─── Core pipeline ────────────────────────────────────────────────────────────

def run_pipeline(image_path):
    """
    Full pipeline: preprocess → OCR → ML extract → checkbox → EMR → premium.
    Returns the result dict or raises on unrecoverable error.
    """
    filename = Path(image_path).name

    # 1. OCR
    full_text, ocr_results, avg_conf, preprocessed_np = scan_image(image_path)
    logger.info(f"[{filename}] OCR complete — avg confidence: {avg_conf:.3f}")

    # 2. ML + regex field extraction (personal fields)
    ml_fields, unclear, methods = extract_fields_from_text(full_text, _ML_MODEL)

    # 3. Checkbox detection (family history / conditions / habits / occupations)
    # Need BGR image for cv2 checkbox detection
    import cv2
    bgr = cv2.cvtColor(preprocessed_np, cv2.COLOR_GRAY2BGR)
    label_map, _ = detect_checkboxes(bgr, ocr_results)
    checkbox_fields = map_checkboxes_to_fields(label_map)

    # 4. Merge: checkbox fields fill in what text extraction couldn't get
    combined = {**ml_fields}
    combined['family_history']    = checkbox_fields.get('family_history') or ml_fields.get('family_history')
    combined['health_conditions'] = checkbox_fields.get('health_conditions', {})
    combined['habits']            = checkbox_fields.get('habits', {})
    combined['occupations']       = checkbox_fields.get('occupations', [])

    # 5. EMR
    emr_score, bmi, emr_breakdown = calculate_total_emr(combined)

    # 6. Occupation extra (for premium)
    occ_extra, occ_breakdown = occupation_extra_per_mille(combined.get('occupations', []))

    # 7. Premium
    premium = calculate_premium(combined, emr_score)

    result = {
        'filename':          filename,
        'timestamp':         datetime.now().isoformat(),
        'extracted_fields':  combined,
        'bmi':               bmi,
        'emr_score':         emr_score,
        'emr_breakdown':     emr_breakdown + occ_breakdown,
        'life_class':        premium['life_class'],
        'life_factor':       premium['life_factor'],
        'life_loading_pct':  premium['life_loading_pct'],
        'cir_class':         premium['cir_class'],
        'cir_factor':        premium['cir_factor'],
        'cir_loading_pct':   premium['cir_loading_pct'],
        'life_premium_rs':   premium['life_premium_rs'],
        'cir_premium_rs':    premium['cir_premium_rs'],
        'accident_premium_rs': premium['accident_premium_rs'],
        'total_premium_rs':  premium['total_premium_rs'],
        'cover_warning':     premium.get('cover_warning'),
        'unclear_fields':    unclear,
        'ocr_confidence_avg': avg_conf,
        'extraction_method': methods,
        'raw_ocr_text':      full_text[:3000],   # truncate for JSON size
    }
    return result


# ─── Flask API ─────────────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_loaded': _ML_MODEL is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/scan', methods=['POST'])
def api_scan():
    """Accept image upload, run full pipeline, return JSON result."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image file in request (key: "image")'}), 400

    f = request.files['image']
    if not f.filename:
        return jsonify({'error': 'Empty filename'}), 400

    # Save to a temp location inside scan_input/
    safe_name = f"upload_{int(time.time())}_{f.filename}"
    save_path = INPUT_DIR / safe_name
    f.save(str(save_path))
    logger.info(f"[API] Received upload: {safe_name}")

    try:
        result = run_pipeline(str(save_path))
        # Also save to output dir
        _save_outputs(result, safe_name)
        return jsonify(result), 200
    except Exception as exc:
        logger.error(f"[API] Pipeline error for {safe_name}: {exc}", exc_info=True)
        return jsonify({'error': str(exc)}), 500
    finally:
        # Clean up temp upload and force memory release
        try:
            save_path.unlink(missing_ok=True)
        except Exception:
            pass
        gc.collect()


def _save_outputs(result, filename_stem):
    """Persist JSON + human-readable TXT to scan_output/."""
    stem = Path(filename_stem).stem
    json_path = OUTPUT_DIR / f"{stem}_result.json"
    txt_path  = OUTPUT_DIR / f"{stem}_report.txt"

    with open(json_path, 'w', encoding='utf-8') as fp:
        json.dump(result, fp, indent=2, ensure_ascii=False)

    # Human-readable report
    fields = result.get('extracted_fields', {})
    lines  = [
        "=" * 60,
        "  AegisAI Insurance Scanner — Underwriting Report",
        "=" * 60,
        f"File      : {result['filename']}",
        f"Timestamp : {result['timestamp']}",
        "",
        "── Extracted Fields ─────────────────────────────────────",
        f"  Name           : {fields.get('name', '—')}",
        f"  Gender         : {fields.get('gender', '—')}",
        f"  DOB            : {fields.get('date_of_birth', '—')}   (Age {result.get('age', '—')})",
        f"  Residence      : {fields.get('residence', '—')}",
        f"  Profession     : {fields.get('profession', '—')}",
        f"  Height         : {fields.get('height_cm', '—')} cm",
        f"  Weight         : {fields.get('weight_kg', '—')} kg",
        f"  BMI            : {result.get('bmi', '—')}",
        f"  Yearly Income  : ₹{fields.get('yearly_income', 0):,.0f}",
        f"  Base Cover     : ₹{fields.get('base_cover_lakhs', 0):.0f} Lakhs",
        f"  CIR Cover      : ₹{fields.get('cir_cover_lakhs', 0):.0f} Lakhs",
        f"  Accident Cover : ₹{fields.get('accident_cover_lakhs', 0):.0f} Lakhs",
        "",
        "── EMR Breakdown ─────────────────────────────────────────",
    ]
    for bd in result.get('emr_breakdown', []):
        lines.append(f"  {bd}")
    lines += [
        f"\n  Total EMR Score : {result['emr_score']}",
        "",
        "── Risk Classification ───────────────────────────────────",
        f"  Life Insurance : {result['life_class']} (Factor {result['life_factor']}, Loading {result['life_loading_pct']})",
        f"  CIR            : {result['cir_class']} (Factor {result['cir_factor']}, Loading {result['cir_loading_pct']})",
        "",
        "── Premium Summary ───────────────────────────────────────",
        f"  Life Premium     : ₹{result['life_premium_rs']:>10,.2f}",
        f"  CIR Premium      : ₹{result['cir_premium_rs']:>10,.2f}",
        f"  Accident Premium : ₹{result['accident_premium_rs']:>10,.2f}",
        f"  {'─'*40}",
        f"  TOTAL PREMIUM    : ₹{result['total_premium_rs']:>10,.2f}",
        "",
        "── OCR Stats ─────────────────────────────────────────────",
        f"  Avg OCR Confidence : {result['ocr_confidence_avg']:.3f}",
        f"  Unclear Fields     : {', '.join(result['unclear_fields']) or 'None'}",
        "=" * 60,
    ]
    if result.get('cover_warning'):
        lines.insert(-1, f"\n⚠  {result['cover_warning']}")

    with open(txt_path, 'w', encoding='utf-8') as fp:
        fp.write('\n'.join(lines))

    logger.info(f"Saved → {json_path.name}  |  {txt_path.name}")


# ─── File Watcher (watchdog) ──────────────────────────────────────────────────

def _start_file_watcher():
    """Launch watchdog observer in a daemon thread."""
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler

        SUPPORTED = {'.jpg', '.jpeg', '.png', '.webp'}

        class FormHandler(FileSystemEventHandler):
            def on_created(self, event):
                if event.is_directory:
                    return
                path = Path(event.src_path)
                if path.suffix.lower() not in SUPPORTED:
                    return
                # Wait 1 s for file write to complete
                time.sleep(1)
                logger.info(f"[Watcher] New file detected: {path.name}")
                try:
                    result = run_pipeline(str(path))
                    _save_outputs(result, path.name)
                    print(
                        f"✅ Processed: {path.name} | "
                        f"EMR: {result['emr_score']} | "
                        f"Total Premium: ₹{result['total_premium_rs']:,.2f}"
                    )
                except Exception as exc:
                    logger.error(f"[Watcher] Error processing {path.name}: {exc}", exc_info=True)

        observer = Observer()
        observer.schedule(FormHandler(), str(INPUT_DIR), recursive=False)
        observer.daemon = True
        observer.start()
        logger.info(f"[Watcher] Watching {INPUT_DIR} for new images...")
    except ImportError:
        logger.warning("watchdog not installed — file watcher disabled. Run: pip install watchdog")


# ─── Startup ──────────────────────────────────────────────────────────────────

def startup():
    global _ML_MODEL

    # 1. Train or load model
    if not os.path.exists(MODEL_PATH):
        print("\n[Startup] No trained model found — training now (fast mode)...")
        # Reduced to 250 samples to use less RAM on low-tier servers
        _ML_MODEL = train_model(n_samples=250, n_epochs=50, print_progress=True)
        gc.collect()
    else:
        print(f"[Startup] Loading model from {MODEL_PATH}")
        _ML_MODEL = load_model()
        print("[Startup] Model loaded ✓")

    # 2. Start file watcher ONLY if running locally (not on Render)
    if not os.environ.get('PORT'):
        watcher_thread = threading.Thread(target=_start_file_watcher, daemon=True)
        watcher_thread.start()
    else:
        print("[Startup] Cloud environment detected. File watcher disabled to save memory.")

    # 3. Print banner
    print("""
============================================
 InsureScan Background Engine — READY
 API endpoint:     http://localhost:5050/api/scan
============================================""")

# Run startup immediately when module is loaded (e.g. by gunicorn)
startup()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
