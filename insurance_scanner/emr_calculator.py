"""
emr_calculator.py
Computes Expected Mortality Rating (EMR) from extracted proposal form fields.
All rates are hardcoded per the underwriting manual. Zero external dependencies.
"""

from datetime import datetime


def calculate_bmi(height_cm, weight_kg):
    """Return BMI or None if inputs are invalid."""
    try:
        if not height_cm or not weight_kg:
            return None
        h = float(height_cm) / 100.0
        return round(float(weight_kg) / (h * h), 2)
    except Exception:
        return None


def bmi_emr_loading(bmi):
    """Return (emr_points, description_string) for a given BMI."""
    if bmi is None:
        return 0, "BMI: unknown (height/weight missing) → +0"
    if bmi < 18:
        return 10, f"BMI {bmi:.1f} — Underweight → +10"
    if bmi <= 23:
        return 0,  f"BMI {bmi:.1f} — Normal → +0"
    if bmi <= 28:
        return 5,  f"BMI {bmi:.1f} — Overweight → +5"
    if bmi <= 33:
        return 10, f"BMI {bmi:.1f} — Obese I → +10"
    if bmi <= 38:
        return 15, f"BMI {bmi:.1f} — Obese II → +15"
    return 20, f"BMI {bmi:.1f} — Morbid Obesity → +20"


def family_history_emr_loading(fam_key):
    """
    fam_key: 'both_gt65' | 'one_gt65' | 'both_lt65' | None
    Returns (emr_points, description).
    """
    table = {
        'both_gt65': (-10, "Family: both parents surviving >65 → -10"),
        'one_gt65':  (-5,  "Family: one parent surviving >65 → -5"),
        'both_lt65': (10,  "Family: both parents died <65 (excl. accident) → +10"),
    }
    return table.get(fam_key, (0, "Family history: not specified → +0"))


def health_conditions_emr_loading(conditions):
    """
    conditions: dict {condition_name: severity_level (int 0-4)}
    Returns (total_emr_float, [breakdown_lines]).
    """
    EMR_TABLE = {
        'thyroid':      [2.5,  5.0,  7.5, 10.0],
        'asthma':       [5.0,  7.5, 10.0, 12.5],
        'hypertension': [5.0,  7.5, 10.0, 15.0],
        'diabetes':     [10.0, 15.0, 20.0, 25.0],
        'gut_disorder': [5.0,  10.0, 15.0, 20.0],
    }
    total, breakdown, active = 0.0, [], 0
    for cond, level in (conditions or {}).items():
        level = int(level or 0)
        if level < 1:
            continue
        active += 1
        table = EMR_TABLE.get(cond.lower().replace(' ', '_').replace('mellitus', '').strip(), [0, 0, 0, 0])
        pts = table[min(level - 1, 3)]
        total += pts
        breakdown.append(f"{cond.replace('_', ' ').title()} — Severity {level} → +{pts}")

    # Co-morbidity loading
    if active == 2:
        total += 20
        breakdown.append("Co-morbidity (2 conditions) → +20")
    elif active >= 3:
        total += 40
        breakdown.append(f"Co-morbidity ({active} conditions) → +40")
    return total, breakdown


def habits_emr_loading(habits):
    """
    habits: dict {habit_name: level_key}
    level_key: 'occasionally' | 'regular_moderate' | 'regular_high' | None
    Returns (total_emr_int, [breakdown_lines]).
    """
    LEVEL_EMR = {'occasionally': 5, 'regular_moderate': 10, 'regular_high': 15}
    total, breakdown, active = 0, [], 0
    for habit, level in (habits or {}).items():
        pts = LEVEL_EMR.get(level or '', 0)
        if pts:
            active += 1
            total += pts
            breakdown.append(f"{habit.title()} — {(level or '').replace('_', ' ')} → +{pts}")

    if active == 2:
        total += 20
        breakdown.append("Co-existing risky habits (2) → +20")
    elif active >= 3:
        total += 40
        breakdown.append(f"Co-existing risky habits ({active}) → +40")
    return total, breakdown


def occupation_extra_per_mille(occupations):
    """
    occupations: list of occupation key strings.
    Returns (total_extra_per_mille, [breakdown_lines]).
    """
    OCC_RATES = {
        'athletes': 2, 'pilots': 6, 'drivers': 2,
        'merchant_navy': 3, 'oil_gas': 3,
    }
    total, breakdown = 0, []
    for occ in (occupations or []):
        rate = OCC_RATES.get(occ, 0)
        if rate:
            total += rate
            breakdown.append(f"Occupation [{occ}] → +{rate}‰ extra per mille")
    return total, breakdown


def calculate_total_emr(fields):
    """
    Master function. Takes extracted_fields dict.
    Returns (emr_score_int, bmi_float_or_None, breakdown_list).
    """
    emr = 100
    breakdown = ["Base EMR → 100"]

    bmi = calculate_bmi(fields.get('height_cm'), fields.get('weight_kg'))
    pts, desc = bmi_emr_loading(bmi)
    emr += pts
    breakdown.append(desc)

    pts, desc = family_history_emr_loading(fields.get('family_history'))
    emr += pts
    breakdown.append(desc)

    pts, lines = health_conditions_emr_loading(fields.get('health_conditions') or {})
    emr += pts
    breakdown.extend(lines)

    pts, lines = habits_emr_loading(fields.get('habits') or {})
    emr += pts
    breakdown.extend(lines)

    return int(emr), bmi, breakdown
