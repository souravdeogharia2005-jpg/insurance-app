"""
field_extractor.py
ML + Regex hybrid field extractor.
Trains a TF-IDF + SGDClassifier (50 epochs) on synthetic OCR data.
Falls back to regex when ML confidence < 0.6.
"""

import re
import os
import random
import logging
import numpy as np
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.pipeline import Pipeline

logger   = logging.getLogger(__name__)
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'field_classifier.joblib')

# ─── Synthetic data helpers ──────────────────────────────────────────────────

NAMES = ['Rahul Sharma', 'Priya Patel', 'Amit Singh', 'Sunita Kumar', 'Rajesh Gupta',
         'Anjali Verma', 'Vikram Joshi', 'Pooja Mehta', 'Suresh Shah', 'Deepa Nair',
         'Arjun Reddy', 'Meena Iyer', 'Kiran Pillai', 'Sanjay Rao', 'Rekha Das']

PROFESSIONS = ['Engineer', 'Doctor', 'Teacher', 'Lawyer', 'Businessman',
               'Accountant', 'Manager', 'Consultant', 'Pharmacist', 'Nurse']

RESIDENCES  = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune',
               'Kolkata', 'Hyderabad', 'Ahmedabad', 'Jaipur', 'Surat']

INCOME_SRCS = ['Salary', 'Business', 'Self-employed', 'Professional fees']

TICK_MARKS  = ['✓', '√', 'X', 'x', '✗', '[X]', '(✓)', 'v', '/']


def _noisy(text):
    """Inject OCR-style character noise."""
    noise = {'a': '@', 'e': '3', 'i': '1', 'o': '0', 's': '5', 'g': '9', 'l': '1'}
    out = []
    for ch in text:
        if ch.lower() in noise and random.random() < 0.07:
            out.append(noise[ch.lower()] if ch.islower() else noise[ch.lower()].upper())
        else:
            out.append(ch)
    return ''.join(out)


def _case(name):
    r = random.random()
    if r < 0.3: return name.upper()
    if r < 0.6: return name.title()
    return _noisy(name)


def _date(d, m, y):
    sep = random.choice(['/', '-', '.'])
    fy  = 1960 + y
    sy  = str(fy)[2:]
    fmt = random.randint(0, 2)
    if fmt == 0: return f'{d:02d}{sep}{m:02d}{sep}{fy}'
    if fmt == 1: return f'{d:02d}{sep}{m:02d}{sep}{sy}'
    return f'{d:02d}/{m:02d}/{fy}'


def _income(lakh):
    r = random.random()
    if r < 0.25: return str(lakh * 100000)
    if r < 0.50: return f'{lakh} Lakhs'
    if r < 0.75: return f'{lakh}L'
    return f'{lakh:,}00,000'  # noisy comma formatting


def _cover(lakh):
    r = random.random()
    if r < 0.33: return str(lakh)
    if r < 0.66: return f'{lakh} Lakhs'
    return f'{lakh}L'


def _height(cm):
    r = random.random()
    if r < 0.40: return str(cm)
    if r < 0.65: return f'{cm}cm'
    if r < 0.80: return f'{cm} cm'
    return f'{cm / 30.48:.1f} feet'


def _weight(kg):
    r = random.random()
    if r < 0.40: return str(kg)
    if r < 0.70: return f'{kg}kg'
    return f'{kg} Kg'


def _tick():
    return random.choice(TICK_MARKS)


def generate_synthetic_sample():
    """Return one randomised proposal form sample dict."""
    name  = _case(random.choice(NAMES))
    d, m, y = random.randint(1, 28), random.randint(1, 12), random.randint(0, 50)
    incl  = random.choice([3, 5, 8, 10, 15, 20, 25, 30, 50])
    conds = {c: random.choice([0, 0, 0, 1, 2, 3, 4]) for c in
             ['thyroid', 'asthma', 'hypertension', 'diabetes', 'gut_disorder']}
    habits = {h: random.choice([None, None, None, 'occasionally',
                                 'regular_moderate', 'regular_high'])
               for h in ['smoking', 'alcohol', 'tobacco']}
    return {
        'name':           name,
        'gender':         random.choice(['Male', 'Female']),
        'residence':      random.choice(RESIDENCES),
        'dob':            _date(d, m, y),
        'profession':     random.choice(PROFESSIONS),
        'height':         _height(random.randint(150, 195)),
        'weight':         _weight(random.randint(45, 110)),
        'income':         _income(incl),
        'income_source':  random.choice(INCOME_SRCS),
        'base_cover':     _cover(random.choice([25, 50, 100, 150, 200, 250])),
        'cir_cover':      _cover(random.choice([5, 10, 15, 20, 25])),
        'accident_cover': _cover(random.choice([10, 25, 50, 100])),
        'family_history': random.choice(['both_gt65', 'one_gt65', 'both_lt65', None]),
        'health_conditions': conds,
        'habits':         habits,
        'occupations':    random.sample(
            ['athletes', 'pilots', 'drivers', 'merchant_navy', 'oil_gas'],
            random.choice([0, 0, 0, 0, 1])
        ),
    }


def sample_to_labeled_pairs(sample):
    """
    Convert one sample into (text_snippet, field_label) pairs for training.
    This teaches the classifier what raw OCR text looks like for each field.
    """
    t = _tick()
    pairs = [
        (f"Name : {sample['name']}",                  'name'),
        (f"NAME {sample['name']}",                    'name'),
        (_noisy(sample['name']),                       'name'),
        (f"Gender: {sample['gender']}",               'gender'),
        (f"Male",                                      'gender'),
        (f"Female",                                    'gender'),
        (f"Place of Residence: {sample['residence']}", 'residence'),
        (f"Date of Birth : {sample['dob']}",          'dob'),
        (f"DOB {sample['dob']}",                      'dob'),
        (f"D.O.B {sample['dob']}",                    'dob'),
        (f"Profession : {sample['profession']}",       'profession'),
        (f"Height : {sample['height']}",               'height'),
        (f"Weight : {sample['weight']}",               'weight'),
        (f"Yearly Income : {sample['income']}",        'income'),
        (f"Source of Income : {sample['income_source']}", 'income_source'),
        (f"Base Cover : {sample['base_cover']} Lakhs", 'base_cover'),
        (f"CIR Cover : {sample['cir_cover']} Lakhs",  'cir_cover'),
        (f"Accident Cover : {sample['accident_cover']} Lakhs", 'accident_cover'),
        # Family history ticks
        (f"{t} Both Surviving > age 65",               'family_both_gt65'),
        (f"{t} Only one surviving > age 65",           'family_one_gt65'),
        (f"{t} Both died < age 65",                    'family_both_lt65'),
        # Health checkbox patterns
        (f"Thyroid L1 {t}",  'health_thyroid'),
        (f"Asthma L2 {t}",   'health_asthma'),
        (f"Hyper Tension L3 {t}", 'health_hypertension'),
        (f"Diabetes Mellitus L4 {t}", 'health_diabetes'),
        (f"Gut disorder L2 {t}", 'health_gut'),
        # Habit checkboxes
        (f"Smoking Occasionally {t}", 'habit_smoking'),
        (f"Alcoholic drinks Regular moderate {t}", 'habit_alcohol'),
        (f"Tobacco Regular high dose {t}", 'habit_tobacco'),
        # Occupation checkboxes
        (f"{t} Professional Athletes Bicycle racers", 'occ_athletes'),
        (f"{t} Commercial pilots air crew",           'occ_pilots'),
        (f"{t} Drivers Public carriers national permit", 'occ_drivers'),
        (f"{t} Merchant navy oil inflammable",        'occ_merchant_navy'),
        (f"{t} Oil Natural Gas onshore",              'occ_oil_gas'),
        # Noise / other lines
        ('|||||', 'other'), ('...........', 'other'),
        (f"{'=' * random.randint(5,15)}", 'other'),
        (f"Page {random.randint(1,3)} of {random.randint(3,5)}", 'other'),
    ]
    return pairs


# ─── Model training ───────────────────────────────────────────────────────────

def train_model(n_samples=500, n_epochs=50, print_progress=True):
    """
    Generate synthetic data, train TF-IDF + SGDClassifier over n_epochs.
    Saves model to MODEL_PATH for reuse.
    """
    os.makedirs(MODEL_DIR, exist_ok=True)

    if print_progress:
        print(f"\n[Train] Generating {n_samples} synthetic samples...")

    # Collect all (text, label) pairs
    all_texts, all_labels = [], []
    for _ in range(n_samples):
        sample = generate_synthetic_sample()
        for text, label in sample_to_labeled_pairs(sample):
            all_texts.append(text)
            all_labels.append(label)

    # Unique classes
    classes = sorted(set(all_labels))

    # Build TF-IDF vectorizer (fit once on all data)
    tfidf = TfidfVectorizer(
        analyzer='char_wb', ngram_range=(2, 4),
        max_features=8000, sublinear_tf=True
    )
    X_all = tfidf.fit_transform(all_texts)

    # SGDClassifier supports partial_fit (online learning = epoch-based training)
    clf = SGDClassifier(
        loss='modified_huber', max_iter=1,
        random_state=42, n_jobs=-1, tol=None
    )

    n = len(all_texts)
    batch = max(1, n // n_epochs)  # one batch per epoch

    best_acc = 0.0
    for epoch in range(1, n_epochs + 1):
        start = ((epoch - 1) * batch) % n
        end   = min(start + batch, n)
        X_batch = X_all[start:end]
        y_batch = [all_labels[i] for i in range(start, end)]

        clf.partial_fit(X_batch, y_batch, classes=classes)

        # Measure accuracy on the current batch
        preds = clf.predict(X_batch)
        acc   = round(sum(p == l for p, l in zip(preds, y_batch)) / len(y_batch) * 100, 1)
        if acc > best_acc:
            best_acc = acc

        if print_progress:
            print(f"  Training epoch {epoch:02d}/{n_epochs} — accuracy: {acc:.1f}%")

    # Wrap in a dict so we can save both tfidf and clf together
    model = {'tfidf': tfidf, 'clf': clf, 'classes': classes}
    joblib.dump(model, MODEL_PATH)
    if print_progress:
        print(f"\n[Train] Done. Best accuracy: {best_acc:.1f}%  Model saved → {MODEL_PATH}\n")
    return model


def load_model():
    """Load saved model from disk. Returns None if not found."""
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None


# ─── ML + Regex hybrid extraction ────────────────────────────────────────────

_MODEL = None  # module-level cache


def _get_model():
    global _MODEL
    if _MODEL is None:
        _MODEL = load_model()
    return _MODEL


def _ml_classify(line, model):
    """Return (predicted_label, confidence) for a single text line."""
    try:
        X   = model['tfidf'].transform([line])
        clf = model['clf']
        proba = clf.predict_proba(X)[0]
        idx   = int(np.argmax(proba))
        return model['classes'][idx], float(proba[idx])
    except Exception:
        return 'other', 0.0


# ─── Regex extractors ─────────────────────────────────────────────────────────

def _re_name(text):
    m = re.search(r'(?:Name|नाम)\s*[:\-]?\s*([A-Za-z][A-Za-z\s]{2,40})', text, re.I)
    if m:
        v = m.group(1).strip()
        bad = {'male', 'female', 'date', 'birth', 'profession', 'gender', 'income'}
        if v.lower().split()[0] not in bad:
            return v
    return None


def _re_gender(text):
    m = re.search(r'Gender\s*[:\-]?\s*(Male|Female)\b', text, re.I)
    if m:
        return m.group(1).title()
    if re.search(r'\bFemale\b', text, re.I): return 'Female'
    if re.search(r'\bMale\b',   text, re.I): return 'Male'
    return None


def _re_dob(text):
    m = re.search(r'(?:Date\s*of\s*Birth|D\.O\.B|DOB)\s*[:\-]?\s*'
                  r'(\d{1,2}[\s/.\-]\d{1,2}[\s/.\-]\d{2,4})', text, re.I)
    if m: return m.group(1).strip()
    m = re.search(r'(\d{2}[/.\-]\d{2}[/.\-]\d{2,4})', text)
    if m: return m.group(1)
    return None


def _re_height(text):
    m = re.search(r'Height\s*[:\-]?\s*([\d.]+)\s*(cm|feet|ft)?', text, re.I)
    if not m:
        m2 = re.search(r'(\d{3})\s*cm', text, re.I)
        return float(m2.group(1)) if m2 else None
    val, unit = float(m.group(1)), (m.group(2) or '').lower()
    if 'feet' in unit or 'ft' in unit or val < 10:
        return round(val * 30.48)
    return val


def _re_weight(text):
    m = re.search(r'Weight\s*[:\-]?\s*([\d.]+)\s*(?:kg|kgs)?', text, re.I)
    if not m:
        m2 = re.search(r'(\d{2,3})\s*[Kk][Gg]', text)
        return float(m2.group(1)) if m2 else None
    return float(m.group(1))


def _re_income(text):
    m = re.search(
        r'(?:Yearly\s*)?Income\s*[:\-]?\s*([\d,]+(?:\.\d+)?)\s*(?:Lakh|lakh|L\b|lakhs)?',
        text, re.I)
    if not m: return None
    raw = float(m.group(1).replace(',', ''))
    if re.search(r'\d\s*(?:lakh|lakhs|L)\b', m.group(0), re.I) or raw < 1000:
        return raw * 100000
    return raw


def _re_cover(label_pattern, text):
    m = re.search(rf'{label_pattern}\s*Cover\s*[:\-]?\s*([\d.]+)\s*(?:Lakh|lakhs|L)?',
                  text, re.I)
    if not m: return None
    val = float(m.group(1))
    return val / 100000 if val > 9999 else val  # normalise to Lakhs


def _re_profession(text):
    m = re.search(r'Profession\s*[:\-]?\s*([A-Za-z][A-Za-z\s\-]{2,30})', text, re.I)
    return m.group(1).strip() if m else None


def _re_residence(text):
    m = re.search(r'(?:Residence|City)\s*[:\-]?\s*([A-Za-z][A-Za-z\s]{2,30})', text, re.I)
    return m.group(1).strip() if m else None


def _re_income_source(text):
    m = re.search(r'Source\s*of\s*Income\s*[:\-]?\s*([A-Za-z][A-Za-z\s\-]{2,30})', text, re.I)
    return m.group(1).strip() if m else None


# ─── Master extraction function ───────────────────────────────────────────────

def extract_fields_from_text(ocr_text, model=None):
    """
    Run ML + regex extraction on full OCR text.
    Returns (extracted_fields_dict, unclear_list, method_map).
    """
    if model is None:
        model = _get_model()

    lines   = ocr_text.split('\n')
    fields  = {}
    unclear = []
    methods = {}

    # ── Helper: try ML then fallback to regex ─────────────────────────────
    def pick(field_key, ml_label, regex_fn, postprocess=None):
        """Try every line with ML; if top line matches ml_label with ≥0.6 conf use ML,
        otherwise aggregate regex hits."""
        best_ml_text, best_ml_conf = None, 0.0
        if model:
            for line in lines:
                label, conf = _ml_classify(line, model)
                if label == ml_label and conf > best_ml_conf:
                    best_ml_conf  = conf
                    best_ml_text  = line

        # Try regex on full text
        regex_val = regex_fn(ocr_text)

        if best_ml_conf >= 0.6 and best_ml_text:
            val = regex_fn(best_ml_text) or regex_val
        else:
            val = regex_val

        if val is not None:
            if postprocess:
                val = postprocess(val)
            fields[field_key]  = val
            methods[field_key] = 'ml' if best_ml_conf >= 0.6 else 'regex'
        else:
            unclear.append(field_key)
            methods[field_key] = 'none'

    # ── Personal fields ───────────────────────────────────────────────────
    pick('name',         'name',         _re_name)
    pick('gender',       'gender',       _re_gender)
    pick('residence',    'residence',    _re_residence)
    pick('date_of_birth','dob',          _re_dob)
    pick('profession',   'profession',   _re_profession)
    pick('height_cm',    'height',       _re_height)
    pick('weight_kg',    'weight',       _re_weight)
    pick('yearly_income','income',       _re_income)
    pick('income_source','income_source',_re_income_source)
    pick('base_cover_lakhs',     'base_cover',     lambda t: _re_cover('Base', t))
    pick('cir_cover_lakhs',      'cir_cover',      lambda t: _re_cover('CIR', t))
    pick('accident_cover_lakhs', 'accident_cover', lambda t: _re_cover('Accident', t))

    return fields, unclear, methods
