"""
premium_calculator.py
Calculates insurance premium from EMR score and cover amounts.
All rates hardcoded. Zero external dependencies.
"""

from datetime import datetime


def age_from_dob(dob_str):
    """Parse DOB string and return age in years. Returns None on failure."""
    if not dob_str:
        return None
    formats = ['%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y',
               '%d/%m/%y', '%d-%m-%y', '%d.%m.%y']
    for fmt in formats:
        try:
            dob = datetime.strptime(dob_str.strip(), fmt)
            today = datetime.today()
            age = today.year - dob.year - (
                (today.month, today.day) < (dob.month, dob.day))
            return max(18, min(age, 70))
        except Exception:
            pass
    return None


def max_cover_multiple(age):
    """Max cover as multiple of yearly income by age band."""
    if age is None:
        return 15
    if age <= 35: return 25
    if age <= 45: return 20
    if age <= 55: return 15
    return 10


def life_emr_class(emr):
    """Returns (class_label, factor) for life insurance EMR."""
    if emr <= 35:  return 'Class I',    1
    if emr <= 60:  return 'Class II',   2
    if emr <= 85:  return 'Class III',  3
    if emr <= 120: return 'Class IV',   4
    if emr <= 170: return 'Class V',    6
    if emr <= 225: return 'Class VI',   8
    if emr <= 275: return 'Class VII',  10
    if emr <= 350: return 'Class VIII', 12
    if emr <= 450: return 'Class IX',   16
    return 'Class X', 20


def cir_emr_class(emr):
    """Returns (class_label, factor) for CIR/health insurance EMR."""
    if emr <= 20: return 'Standard', 0
    if emr <= 35: return 'Class I',  1
    if emr <= 60: return 'Class II', 2
    if emr <= 75: return 'Class III', 3
    return 'Class IV', 4


def base_rate_life(age):
    """Base premium rate per mille for life insurance by age."""
    if age <= 35: return 1.5
    if age <= 40: return 3.0
    if age <= 45: return 4.5
    if age <= 50: return 6.0
    if age <= 55: return 7.5
    if age <= 60: return 9.0
    return 10.5


def base_rate_accident(age):
    """Base rate per mille for accident rider."""
    return 1.0 if age <= 50 else 1.5


def base_rate_cir(age):
    """Base rate per mille for CIR/health cover by age."""
    if age <= 35: return 3.0
    if age <= 40: return 6.0
    if age <= 45: return 12.0
    if age <= 50: return 15.0
    if age <= 55: return 20.0
    return 25.0


def calculate_premium(fields, emr_score):
    """
    Compute full premium. Takes extracted_fields dict and emr_score int.
    Returns dict with all premium components.
    """
    dob            = fields.get('date_of_birth', '') or ''
    age            = age_from_dob(dob) or 35
    yearly_income  = float(fields.get('yearly_income') or 0)
    base_cover     = float(fields.get('base_cover_lakhs') or 0)
    cir_cover      = float(fields.get('cir_cover_lakhs') or 0)
    accident_cover = float(fields.get('accident_cover_lakhs') or 0)
    occupations    = fields.get('occupations') or []

    # Financial underwriting cover cap
    cover_warning = None
    if yearly_income > 0:
        max_cover = (yearly_income / 100000) * max_cover_multiple(age)
        if base_cover > max_cover:
            cover_warning = (
                f"Requested cover ₹{base_cover:.0f}L exceeds max ₹{max_cover:.1f}L "
                f"({max_cover_multiple(age)}× income) for age {age}. Capped."
            )
            base_cover = max_cover

    # Occupation extra per mille
    OCC_RATES = {'athletes': 2, 'pilots': 6, 'drivers': 2,
                 'merchant_navy': 3, 'oil_gas': 3}
    occ_extra = sum(OCC_RATES.get(o, 0) for o in occupations)

    # ── Life insurance ──────────────────────────────────────────────────────
    life_class, life_factor = life_emr_class(emr_score)
    life_loading  = 0.25 * life_factor
    life_rate     = base_rate_life(age)
    # Formula: (Cover_Lakhs × 100 × rate/1000) × (1 + loading) + occ_extra
    life_premium  = (base_cover * 100 * life_rate / 1000) * (1 + life_loading)
    life_premium += base_cover * 100 * occ_extra / 1000

    # ── CIR / Health insurance ──────────────────────────────────────────────
    cir_class, cir_factor = cir_emr_class(emr_score)
    cir_loading  = 0.30 * cir_factor
    cir_rate     = base_rate_cir(age)
    cir_premium  = (cir_cover * 100 * cir_rate / 1000) * (1 + cir_loading)

    # ── Accident rider (no EMR loading) ───────────────────────────────────
    acc_rate        = base_rate_accident(age)
    accident_premium = accident_cover * 100 * acc_rate / 1000

    total = life_premium + cir_premium + accident_premium

    return {
        'age':                      age,
        'life_class':               life_class,
        'life_factor':              life_factor,
        'life_loading_pct':         f"{life_loading * 100:.0f}%",
        'cir_class':                cir_class,
        'cir_factor':               cir_factor,
        'cir_loading_pct':          f"{cir_loading * 100:.0f}%",
        'life_premium_rs':          round(life_premium, 2),
        'cir_premium_rs':           round(cir_premium, 2),
        'accident_premium_rs':      round(accident_premium, 2),
        'total_premium_rs':         round(total, 2),
        'cover_warning':            cover_warning,
        'occupation_extra_per_mille': occ_extra,
    }
