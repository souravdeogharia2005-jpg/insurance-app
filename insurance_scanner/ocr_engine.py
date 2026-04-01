"""
ocr_engine.py
Image preprocessing + Tesseract OCR pipeline.
Uses pytesseract (lightweight, ~50MB) instead of EasyOCR/PyTorch.
Works on Render's 512MB starter plan with ease.
Zero external APIs — runs fully on-device.
"""

import logging
import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger(__name__)


def preprocess_image(image_path):
    """
    Full preprocessing pipeline before OCR:
    1. Load with Pillow, upscale if width < 1200px
    2. Convert to grayscale
    3. CLAHE for local contrast enhancement
    4. Gaussian denoise
    5. Otsu binarisation
    6. Deskew via Hough lines
    7. Crop to form boundary (largest rectangle contour)
    Returns: numpy uint8 grayscale array (preprocessed)
    """
    # 1. Load & upscale small images
    pil_img = Image.open(image_path).convert('RGB')
    w, h    = pil_img.size
    if w < 1200:
        scale   = 1200 / w
        pil_img = pil_img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    img_np = np.array(pil_img)           # H×W×3 uint8

    # 2. Grayscale
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

    # 3. CLAHE — boost local contrast (great for low-light scans)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray  = clahe.apply(gray)

    # 4. Gaussian denoise
    gray = cv2.GaussianBlur(gray, (1, 1), 0)

    # 5. Otsu binarisation — adaptive threshold
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # 6. Deskew
    bw = _deskew(bw)

    # 7. Crop to form boundary
    bw = _crop_to_form(bw)

    return bw


def _deskew(bw):
    """Detect and correct skew angle using Hough lines."""
    try:
        edges  = cv2.Canny(bw, 50, 150, apertureSize=3)
        lines  = cv2.HoughLines(edges, 1, np.pi / 180, threshold=150)
        if lines is None:
            return bw

        angles = []
        for rho, theta in lines[:, 0]:
            angle = np.degrees(theta) - 90
            if abs(angle) < 45:
                angles.append(angle)

        if not angles:
            return bw

        median_angle = float(np.median(angles))
        if abs(median_angle) < 0.5:    # skip tiny corrections
            return bw

        h, w    = bw.shape
        M       = cv2.getRotationMatrix2D((w / 2, h / 2), median_angle, 1.0)
        rotated = cv2.warpAffine(bw, M, (w, h),
                                 flags=cv2.INTER_LINEAR,
                                 borderMode=cv2.BORDER_REPLICATE)
        return rotated
    except Exception as exc:
        logger.warning(f"Deskew failed: {exc}")
        return bw


def _crop_to_form(bw):
    """Find the largest rectangle contour (form boundary) and crop to it."""
    try:
        inv = cv2.bitwise_not(bw)
        contours, _ = cv2.findContours(inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return bw

        largest = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest)

        ih, iw = bw.shape
        if w * h > iw * ih * 0.3:    # only crop if it looks like the form border
            pad = 10
            return bw[max(0, y - pad):min(ih, y + h + pad),
                      max(0, x - pad):min(iw, x + w + pad)]
    except Exception as exc:
        logger.warning(f"Crop failed: {exc}")

    return bw


def run_ocr(preprocessed_np):
    """
    Run Tesseract OCR via pytesseract.
    Returns:
        full_text      (str)   — joined raw text
        ocr_results    (list)  — [(bbox, text, conf), ...] compatible with checkbox_detector
        avg_confidence (float)
    """
    try:
        import pytesseract
    except ImportError:
        raise RuntimeError("pytesseract not installed. Run: pip install pytesseract")

    # Convert grayscale numpy array to PIL for pytesseract
    pil_img = Image.fromarray(preprocessed_np)

    # ── Pass 1: full text (PSM 6 = assume uniform block of text) ────────────
    config_block = '--psm 6 --oem 1'
    full_text = pytesseract.image_to_string(pil_img, config=config_block)

    # ── Pass 2: layout-aware (PSM 3 = auto detect layout) ───────────────────
    config_auto = '--psm 3 --oem 1'
    auto_text = pytesseract.image_to_string(pil_img, config=config_auto)

    # Merge both passes — use both for best coverage
    combined_text = full_text + '\n' + auto_text

    # ── Get word-level bounding boxes + confidence for checkbox detection ────
    ocr_data = pytesseract.image_to_data(
        pil_img,
        config=config_block,
        output_type=pytesseract.Output.DICT
    )

    # Convert pytesseract data format → EasyOCR-compatible format:
    # [(bbox [[x1,y1],[x2,y1],[x2,y2],[x1,y2]], text, confidence_0to1), ...]
    ocr_results = []
    n = len(ocr_data['text'])
    confidences = []

    for i in range(n):
        text = (ocr_data['text'][i] or '').strip()
        conf = int(ocr_data['conf'][i] or -1)

        if not text or conf < 0:
            continue

        conf_norm = conf / 100.0   # tesseract returns 0-100, normalize to 0-1
        confidences.append(conf_norm)

        x  = ocr_data['left'][i]
        y  = ocr_data['top'][i]
        w  = ocr_data['width'][i]
        h  = ocr_data['height'][i]

        bbox = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
        ocr_results.append((bbox, text, conf_norm))

    avg_conf = round(float(np.mean(confidences)) if confidences else 0.0, 3)
    logger.info(f"OCR done — {len(ocr_results)} words, avg confidence: {avg_conf:.3f}")

    return combined_text, ocr_results, avg_conf


def scan_image(image_path):
    """
    Full end-to-end scan: preprocess → OCR.
    Returns (full_text, ocr_results, avg_confidence, preprocessed_np)
    """
    logger.info(f"Preprocessing: {image_path}")
    preprocessed = preprocess_image(image_path)

    logger.info("Running Tesseract OCR...")
    full_text, ocr_results, avg_conf = run_ocr(preprocessed)

    return full_text, ocr_results, avg_conf, preprocessed
