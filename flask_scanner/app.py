# =============================================================================
#  AegisAI — Insurance Proposal Form Scanner
#  Python Flask Backend | EasyOCR | No paid APIs
# =============================================================================

from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import io
import re
import socket

app = Flask(__name__)
CORS(app)

# ── Initialise EasyOCR once at startup (downloads model ~500 MB first run) ───
print("⏳  Loading EasyOCR model (first run downloads ~500 MB)…")
reader = easyocr.Reader(['en'], gpu=False)
print("✅  EasyOCR ready!")


# =============================================================================
#  IMAGE PREPROCESSING
# =============================================================================

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')

    # Scale up small images
    w, h = img.size
    if w < 1000:
        scale = 1000 / w
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    img = img.convert('L')                                          # Grayscale
    img = ImageEnhance.Contrast(img).enhance(2.0)                  # Contrast ×2
    img = img.filter(ImageFilter.SHARPEN)                           # Sharpen
    return np.array(img)


# =============================================================================
#  FIELD EXTRACTION  (regex + keyword matching — no AI)
# =============================================================================

def _num(text: str) -> float | None:
    """Extract first number from a string."""
    m = re.search(r'[\d,]+\.?\d*', text.replace(',', ''))
    return float(m.group().replace(',', '')) if m else None


def _line_after(lines: list[str], keyword: str) -> str | None:
    """Return the text that appears immediately after 'keyword' on the same or
    next non-empty line."""
    kw = keyword.lower()
    for i, l in enumerate(lines):
        ll = l.lower()
        if kw in ll:
            # same-line value (e.g. "Name: Rahul Sharma")
            after = re.split(kw, ll, maxsplit=1)[-1]
            after = re.sub(r'^[\s:|-]+', '', after).strip()
            if after:
                return after
            # next non-empty line
            for j in range(i + 1, min(i + 3, len(lines))):
                nxt = lines[j].strip()
                if nxt:
                    return nxt
    return None


def extract_fields(ocr_results: list) -> dict:
    """
    ocr_results = list of (bbox, text, confidence) from EasyOCR.
    Returns a dict of extracted fields; marks uncertain ones as 'unclear'.
    """
    LOW_CONF = 0.50

    # Build plain-text lines list and a confidence map
    lines: list[str] = []
    conf_map: dict[str, float] = {}
    for (_bbox, text, conf) in ocr_results:
        t = text.strip()
        if t:
            lines.append(t)
            conf_map[t.lower()] = conf

    full_text = ' '.join(lines)
    ft = full_text.lower()

    fields: dict = {}

    # ── Basic details ────────────────────────────────────────────────────────
    fields['name']       = _line_after(lines, 'name')       or 'unclear'
    fields['profession'] = _line_after(lines, 'profession') or \
                           _line_after(lines, 'occupation')  or 'unclear'

    # Gender
    if re.search(r'\bfemale\b|\bf\b', ft):
        fields['gender'] = 'Female'
    elif re.search(r'\bmale\b|\bm\b', ft):
        fields['gender'] = 'Male'
    else:
        fields['gender'] = 'unclear'

    # Date of Birth
    dob_match = re.search(
        r'\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b',
        full_text)
    fields['dob'] = dob_match.group(1) if dob_match else 'unclear'

    # Height / Weight / Income / Covers
    def _extract_after_kw(kw: str) -> float | None:
        v = _line_after(lines, kw)
        return _num(v) if v else None

    fields['height_cm']      = _extract_after_kw('height')
    fields['weight_kg']      = _extract_after_kw('weight')
    fields['yearly_income']  = _extract_after_kw('yearly income') or \
                                _extract_after_kw('annual income') or \
                                _extract_after_kw('income')
    fields['source_income']  = _line_after(lines, 'source')  or 'unclear'
    fields['base_cover']     = _extract_after_kw('base cover')   or \
                                _extract_after_kw('life cover')
    fields['cir_cover']      = _extract_after_kw('cir') or \
                                _extract_after_kw('critical')
    fields['accident_cover'] = _extract_after_kw('accident')

    # ── Family History ───────────────────────────────────────────────────────
    if re.search(r'both.{0,20}surviv.{0,20}(65|above)', ft):
        fields['family_history'] = 'both_surviving_above_65'
    elif re.search(r'(one|only).{0,20}surviv.{0,20}(65|above)', ft):
        fields['family_history'] = 'one_surviving_above_65'
    elif re.search(r'both.{0,20}(died|deceased|death).{0,20}(65|below)', ft):
        fields['family_history'] = 'both_died_below_65'
    else:
        fields['family_history'] = 'unclear'

    # ── Health Conditions (severity 1–4) ────────────────────────────────────
    conditions = {}
    COND_KEYWORDS = {
        'thyroid':       ['thyroid'],
        'asthma':        ['asthma'],
        'hypertension':  ['hypertension', 'hyper tension', 'bp', 'blood pressure'],
        'diabetes':      ['diabetes', 'dm', 'diabetes mellitus'],
        'gut_disorder':  ['gut', 'ibs', 'colitis', 'crohn'],
    }
    for key, keywords in COND_KEYWORDS.items():
        for kw in keywords:
            idx = ft.find(kw)
            if idx != -1:
                snippet = ft[max(0, idx-30): idx+80]
                sev = None
                # Look for "level X" or "severity X" or standalone digit
                sev_m = re.search(
                    r'(?:level|severity|sev|grade|stage)[\s:]*([1-4])', snippet)
                if sev_m:
                    sev = int(sev_m.group(1))
                else:
                    sev_m2 = re.search(r'\b([1-4])\b', snippet)
                    if sev_m2:
                        sev = int(sev_m2.group(1))
                if sev:
                    conditions[key] = sev
                    break

    fields['health_conditions'] = conditions

    # ── Personal Habits ──────────────────────────────────────────────────────
    HABITS = {
        'smoking':   ['smoking', 'cigarette', 'smoker'],
        'alcohol':   ['alcohol', 'drink', 'alcoholic'],
        'tobacco':   ['tobacco', 'chewing', 'gutka', 'pan'],
    }
    habits: dict[str, str] = {}
    for key, keywords in HABITS.items():
        for kw in keywords:
            idx = ft.find(kw)
            if idx != -1:
                snippet = ft[max(0, idx-10): idx+60]
                if re.search(r'regular[\s-]*high|heavy', snippet):
                    habits[key] = 'regular_high'
                elif re.search(r'regular[\s-]*mod|moderate', snippet):
                    habits[key] = 'regular_moderate'
                elif re.search(r'occasional', snippet):
                    habits[key] = 'occasionally'
                else:
                    habits[key] = 'occasionally'   # present but unquantified
                break
    fields['personal_habits'] = habits

    # ── Occupation ───────────────────────────────────────────────────────────
    OCC_KEYWORDS = {
        'pilot':          ['pilot', 'air crew', 'aircrew', 'airline crew'],
        'merchant_navy':  ['merchant navy', 'merchant ship', 'oil ship'],
        'oil_gas':        ['oil', 'natural gas', 'petroleum', 'onshore'],
        'driver':         ['driver', 'national permit', 'truck', 'bus driver'],
        'athlete':        ['athlete', 'cyclist', 'boxer', 'wrestler'],
    }
    fields['occupation_type'] = 'general'
    for occ_key, kws in OCC_KEYWORDS.items():
        if any(kw in ft for kw in kws):
            fields['occupation_type'] = occ_key
            break

    return fields


# =============================================================================
#  EMR CALCULATION
# =============================================================================

def calculate_emr(fields: dict) -> tuple[float, list[str], float | None]:
    emr = 0.0
    breakdown: list[str] = []

    # ── BMI ──────────────────────────────────────────────────────────────────
    bmi = None
    h = fields.get('height_cm')
    w = fields.get('weight_kg')
    if h and w and float(h) > 0:
        bmi = float(w) / (float(h) / 100) ** 2
        if   bmi < 18:          pts = 10
        elif bmi <= 23:         pts = 0
        elif bmi <= 28:         pts = 5
        elif bmi <= 33:         pts = 10
        else:                   pts = 15
        emr += pts
        if pts:
            breakdown.append(f"BMI {bmi:.1f}: +{pts}")
        else:
            breakdown.append(f"BMI {bmi:.1f} (normal): 0")

    # ── Family History ───────────────────────────────────────────────────────
    FH_PTS = {
        'both_surviving_above_65': -10,
        'one_surviving_above_65':  -5,
        'both_died_below_65':       10,
    }
    fh = fields.get('family_history', 'unclear')
    if fh in FH_PTS:
        pts = FH_PTS[fh]
        emr += pts
        sign = '+' if pts >= 0 else ''
        breakdown.append(f"Family history ({fh}): {sign}{pts}")

    # ── Health Conditions ────────────────────────────────────────────────────
    COND_RATES = {
        'thyroid':      [2.5, 5,  7.5, 10],
        'asthma':       [5,   7.5, 10, 12.5],
        'hypertension': [5,   7.5, 10, 15],
        'diabetes':     [10,  15,  20, 25],
        'gut_disorder': [5,   10,  15, 20],
    }
    conditions = fields.get('health_conditions', {})
    active_conds = 0
    for cond, sev in conditions.items():
        rates = COND_RATES.get(cond, [])
        idx = int(sev) - 1
        if 0 <= idx < len(rates):
            pts = rates[idx]
            emr += pts
            active_conds += 1
            breakdown.append(f"{cond.capitalize()} (sev {sev}): +{pts}")

    # Co-morbidity
    if active_conds >= 3:
        emr += 40
        breakdown.append(f"Co-morbidity ({active_conds} conditions): +40")
    elif active_conds == 2:
        emr += 20
        breakdown.append("Co-morbidity (2 conditions): +20")

    # ── Personal Habits ──────────────────────────────────────────────────────
    HABIT_PTS = {
        'occasionally':      5,
        'regular_moderate':  10,
        'regular_high':      15,
    }
    habits = fields.get('personal_habits', {})
    active_habits = 0
    for habit, level in habits.items():
        pts = HABIT_PTS.get(level, 0)
        if pts:
            emr += pts
            active_habits += 1
            breakdown.append(f"{habit.capitalize()} ({level}): +{pts}")

    # Co-existing habits
    if active_habits >= 3:
        emr += 40
        breakdown.append("Co-existing habits (3+): +40")
    elif active_habits == 2:
        emr += 20
        breakdown.append("Co-existing habits (2): +20")

    return round(emr, 2), breakdown, (round(bmi, 1) if bmi else None)


# =============================================================================
#  PREMIUM CALCULATION
# =============================================================================

def calculate_premium(fields: dict, emr: float, bmi: float | None) -> dict:
    # ── Age from DOB ─────────────────────────────────────────────────────────
    import datetime
    age = None
    dob_str = fields.get('dob', '')
    for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y',
                '%d/%m/%y', '%d-%m-%y']:
        try:
            dob = datetime.datetime.strptime(dob_str, fmt).date()
            today = datetime.date.today()
            age = today.year - dob.year - (
                (today.month, today.day) < (dob.month, dob.day))
            break
        except Exception:
            pass
    if age is None:
        age = 35   # safe fallback

    # ── Life EMR Class & Factor ──────────────────────────────────────────────
    LIFE_CLASS = [
        (35,  'I',    1),
        (60,  'II',   2),
        (85,  'III',  3),
        (120, 'IV',   4),
        (170, 'V',    6),
        (225, 'VI',   8),
        (275, 'VII',  10),
        (350, 'VIII', 12),
        (450, 'IX',   16),
        (550, 'X',    20),
    ]
    life_class, life_factor = 'Standard', 0
    for threshold, cls, factor in LIFE_CLASS:
        if emr <= threshold:
            life_class, life_factor = cls, factor
            break

    life_loading_pct = life_factor * 25   # 25% × factor

    # ── CIR EMR Class & Factor ───────────────────────────────────────────────
    if   emr <= 20:  cir_class, cir_factor = 'Standard', 0
    elif emr <= 35:  cir_class, cir_factor = 'I',  1
    elif emr <= 60:  cir_class, cir_factor = 'II', 2
    elif emr <= 75:  cir_class, cir_factor = 'III', 3
    else:            cir_class, cir_factor = 'IV', 4

    cir_loading_pct = cir_factor * 30    # 30% × factor

    # ── Base Rates ₹ per mille ───────────────────────────────────────────────
    def life_rate(a):
        if a <= 35: return 1.5
        if a <= 40: return 3.0
        if a <= 45: return 4.5
        if a <= 50: return 6.0
        if a <= 55: return 7.5
        if a <= 60: return 9.0
        return 10.5

    def acc_rate(a):
        return 1.0 if a <= 50 else 1.5

    def cir_rate(a):
        if a <= 35: return 3.0
        if a <= 40: return 6.0
        if a <= 45: return 12.0
        if a <= 50: return 15.0
        if a <= 55: return 20.0
        return 25.0

    # ── Occupation Extra Charge per mille ────────────────────────────────────
    OCC_CHARGE = {
        'pilot':         6,
        'merchant_navy': 3,
        'oil_gas':       3,
        'driver':        2,
        'athlete':       2,
        'general':       0,
    }
    occ_extra = OCC_CHARGE.get(fields.get('occupation_type', 'general'), 0)

    # ── Cover amounts ────────────────────────────────────────────────────────
    def safe_cover(val):
        try:
            return float(val)
        except (TypeError, ValueError):
            return None

    base_cover_l = safe_cover(fields.get('base_cover'))  or 0    # in Lakhs
    cir_cover_l  = safe_cover(fields.get('cir_cover'))   or 0
    acc_cover_l  = safe_cover(fields.get('accident_cover')) or 0

    # Convert Lakhs → ₹ thousands (mille)
    def premium_calc(cover_l, rate, loading_pct, extra_per_mille=0):
        cover_thousands = cover_l * 100          # 1 Lakh = 100 × ₹1000
        base = cover_thousands * rate
        loaded = base * (1 + loading_pct / 100)
        occ_charge = cover_thousands * extra_per_mille
        return round(loaded + occ_charge)

    life_premium = premium_calc(
        base_cover_l, life_rate(age), life_loading_pct, occ_extra)
    cir_premium  = premium_calc(
        cir_cover_l,  cir_rate(age),  cir_loading_pct)
    acc_premium  = premium_calc(
        acc_cover_l,  acc_rate(age),  0)

    total_premium = life_premium + cir_premium + acc_premium

    # ── Financial Underwriting Warning ───────────────────────────────────────
    cover_warning = None
    income = safe_cover(fields.get('yearly_income'))
    if income and base_cover_l:
        MAX_MULT = {35: 25, 45: 20, 50: 15, 55: 15}
        mult = 10
        for cutoff in sorted(MAX_MULT):
            if age <= cutoff:
                mult = MAX_MULT[cutoff]
                break
        max_cover_l = income * mult / 1_00_000   # income is in ₹, covers in L
        if base_cover_l > max_cover_l:
            cover_warning = (
                f"Base cover ₹{base_cover_l}L exceeds max allowed "
                f"₹{max_cover_l:.1f}L ({mult}× income) for age {age}.")

    return {
        'age':               age,
        'life_class':        life_class,
        'life_factor':       life_factor,
        'life_loading_pct':  life_loading_pct,
        'cir_class':         cir_class,
        'cir_factor':        cir_factor,
        'cir_loading_pct':   cir_loading_pct,
        'life_premium_rs':   life_premium,
        'cir_premium_rs':    cir_premium,
        'accident_premium_rs': acc_premium,
        'total_premium_rs':  total_premium,
        'cover_warning':     cover_warning,
    }


# =============================================================================
#  FLASK ROUTES
# =============================================================================

@app.route('/')
def index():
    return jsonify({
        'service': 'AegisAI Insurance Scanner',
        'version': '2.0',
        'status': 'running',
        'endpoints': {
            'health': 'GET /health',
            'scan':   'POST /scan  (multipart: key=image)',
        }
    })


@app.route('/health')
def health():
    return jsonify({'status': 'ok'})


@app.route('/scan', methods=['POST'])
def scan():
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image file provided. Use key "image".'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Empty filename.'}), 400

    try:
        image_bytes = file.read()
        img_array   = preprocess_image(image_bytes)

        # ── OCR ──────────────────────────────────────────────────────────────
        results = reader.readtext(img_array)   # [(bbox, text, conf), …]

        # Raw lines for debugging (first 30)
        raw_lines = [
            {'text': txt, 'confidence': round(float(conf), 3)}
            for (_bbox, txt, conf) in results[:30]
        ]

        # ── Extract → EMR → Premium ──────────────────────────────────────────
        fields  = extract_fields(results)
        emr, breakdown, bmi = calculate_emr(fields)
        premium = calculate_premium(fields, emr, bmi)

        return jsonify({
            'success':         True,
            'extracted_fields': fields,
            'bmi':             bmi,
            'emr_score':       emr,
            'emr_breakdown':   breakdown,
            'premium':         premium,
            'raw_ocr_lines':   raw_lines,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# =============================================================================
#  STARTUP
# =============================================================================

if __name__ == '__main__':
    local_ip = socket.gethostbyname(socket.gethostname())
    print("\n" + "="*60)
    print("  🛡️  AegisAI Insurance Scanner — Python Flask Backend")
    print("="*60)
    print(f"  Local:      http://localhost:5000")
    print(f"  Network:    http://{local_ip}:5000")
    print(f"  Scan API:   POST http://localhost:5000/scan")
    print(f"  Health:     GET  http://localhost:5000/health")
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
