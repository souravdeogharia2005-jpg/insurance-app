"""
checkbox_detector.py
Detects ticked checkboxes in a scanned insurance form image using OpenCV.
No external APIs — pure computer vision.
"""

import cv2
import numpy as np


def detect_checkboxes(image_bgr, ocr_results):
    """
    Find all checkbox squares in the image and determine which are ticked.
    
    Args:
        image_bgr: OpenCV BGR image (numpy array)
        ocr_results: list of EasyOCR result tuples [(bbox, text, conf), ...]
    
    Returns:
        dict {label_text: bool}  — True = ticked, False = unticked
        Also returns list of (bbox, is_ticked) for debugging.
    """
    gray   = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    _, bw  = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Find all contours
    contours, _ = cv2.findContours(bw, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    checkbox_regions = []  # list of (x, y, w, h, is_ticked)

    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)

        # Filter: checkboxes are roughly square, 15–60px in both dims
        if not (15 <= w <= 60 and 15 <= h <= 60):
            continue
        if abs(w - h) > max(w, h) * 0.4:  # not square enough
            continue

        # Measure fill ratio inside the box (inner 60% to avoid border)
        margin_x = max(2, int(w * 0.2))
        margin_y = max(2, int(h * 0.2))
        inner = bw[y + margin_y: y + h - margin_y,
                   x + margin_x: x + w - margin_x]
        if inner.size == 0:
            continue

        fill_ratio = np.count_nonzero(inner) / inner.size
        is_ticked  = fill_ratio > 0.15   # >15% dark pixels → ticked

        checkbox_regions.append((x, y, w, h, is_ticked))

    # Map each checkbox to the nearest OCR label text
    label_map = {}
    for (cx, cy, cw, ch, ticked) in checkbox_regions:
        box_cx = cx + cw // 2
        box_cy = cy + ch // 2

        best_label = None
        best_dist  = float('inf')

        for bbox, text, conf in ocr_results:
            # bbox is [[x1,y1],[x2,y1],[x2,y2],[x1,y2]]
            tx = int((bbox[0][0] + bbox[2][0]) / 2)
            ty = int((bbox[0][1] + bbox[2][1]) / 2)
            dist = ((tx - box_cx) ** 2 + (ty - box_cy) ** 2) ** 0.5

            # Only look for nearby labels (within ~300px), ignore very short text
            if dist < 300 and dist < best_dist and len(text.strip()) > 2:
                best_dist  = dist
                best_label = text.strip()

        if best_label:
            # If multiple checkboxes map to same label, keep the one that is ticked
            if best_label not in label_map or ticked:
                label_map[best_label] = ticked

    # Also scan raw OCR text for tick characters near known labels
    TICK_CHARS = set('✓√Xx✗')
    for bbox, text, conf in ocr_results:
        if any(c in text for c in TICK_CHARS):
            # Remove tick chars to get clean label
            clean = text
            for c in TICK_CHARS:
                clean = clean.replace(c, '').strip()
            if clean:
                label_map[clean] = True

    return label_map, checkbox_regions


def map_checkboxes_to_fields(label_map):
    """
    Convert raw label_map to structured field dict using keyword matching.
    Returns dict with keys: family_history, health_conditions, habits, occupations
    """
    result = {
        'family_history':    None,
        'health_conditions': {
            'thyroid': 0, 'asthma': 0, 'hypertension': 0,
            'diabetes': 0, 'gut_disorder': 0
        },
        'habits':      {'smoking': None, 'alcohol': None, 'tobacco': None},
        'occupations': [],
    }

    for label, ticked in label_map.items():
        if not ticked:
            continue
        lo = label.lower()

        # ── Family history ───────────────────────────────────────────────
        if 'both' in lo and ('surviving' in lo or 'survived' in lo) and '65' in lo:
            result['family_history'] = 'both_gt65'
        elif 'only' in lo and 'one' in lo:
            result['family_history'] = 'one_gt65'
        elif 'both' in lo and 'died' in lo:
            result['family_history'] = 'both_lt65'

        # ── Health conditions + severity levels ─────────────────────────
        for cond, key in [('thyroid', 'thyroid'), ('asthma', 'asthma'),
                           ('hyper', 'hypertension'), ('diabetes', 'diabetes'),
                           ('gut', 'gut_disorder')]:
            if cond in lo:
                for lvl in [4, 3, 2, 1]:
                    if f'l{lvl}' in lo or f'level {lvl}' in lo or str(lvl) in lo:
                        result['health_conditions'][key] = lvl
                        break
                else:
                    result['health_conditions'][key] = 1  # default to level 1

        # ── Habits ──────────────────────────────────────────────────────
        for habit, key in [('smoking', 'smoking'), ('alcohol', 'alcohol'),
                            ('tobacco', 'tobacco')]:
            if habit in lo:
                if 'high' in lo:
                    result['habits'][key] = 'regular_high'
                elif 'moderate' in lo or 'regular' in lo:
                    result['habits'][key] = 'regular_moderate'
                elif 'occasional' in lo:
                    result['habits'][key] = 'occasionally'

        # ── Occupations ─────────────────────────────────────────────────
        if any(w in lo for w in ['athlete', 'cyclist', 'boxer', 'wrestler', 'pugilist']):
            if 'athletes' not in result['occupations']:
                result['occupations'].append('athletes')
        if any(w in lo for w in ['pilot', 'air crew', 'airline']):
            if 'pilots' not in result['occupations']:
                result['occupations'].append('pilots')
        if 'driver' in lo and 'national' in lo:
            if 'drivers' not in result['occupations']:
                result['occupations'].append('drivers')
        if 'merchant' in lo or ('navy' in lo and 'oil' in lo):
            if 'merchant_navy' not in result['occupations']:
                result['occupations'].append('merchant_navy')
        if ('oil' in lo and ('gas' in lo or 'natural' in lo)) or 'onshore' in lo:
            if 'oil_gas' not in result['occupations']:
                result['occupations'].append('oil_gas')

    return result
