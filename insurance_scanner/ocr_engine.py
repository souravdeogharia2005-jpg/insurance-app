"""
ocr_engine.py
Image preprocessing + EasyOCR text extraction pipeline.
Zero external APIs — runs fully on-device.
"""

import logging
import numpy as np
import cv2
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# EasyOCR reader is heavy — initialise once and reuse
_READER = None


def get_reader():
    """Lazy-init EasyOCR reader (CPU-only, English)."""
    global _READER
    if _READER is None:
        try:
            import easyocr
            logger.info("Initialising EasyOCR reader (first run may download models)...")
            _READER = easyocr.Reader(
                ['en'],
                gpu=False,
                verbose=False,
            )
            logger.info("EasyOCR ready.")
        except ImportError:
            logger.error("easyocr not installed. Run: pip install easyocr")
            raise
    return _READER


def preprocess_image(image_path):
    """
    Full preprocessing pipeline before OCR:
    1. Load with Pillow, upscale if small
    2. Convert to grayscale
    3. CLAHE for local contrast
    4. Gaussian denoise
    5. Otsu binarisation
    6. Deskew via Hough lines
    7. Crop to form boundary (largest rectangle contour)
    Returns: numpy uint8 array (grayscale, preprocessed)
    """
    # 1. Load & upscale
    pil_img = Image.open(image_path).convert('RGB')
    w, h    = pil_img.size
    if w < 1200:
        scale   = 1200 / w
        pil_img = pil_img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    img_np = np.array(pil_img)          # H×W×3 uint8

    # 2. Grayscale
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

    # 3. CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray  = clahe.apply(gray)

    # 4. Gaussian denoise
    gray = cv2.GaussianBlur(gray, (1, 1), 0)

    # 5. Otsu binarisation
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # 6. Deskew using Hough lines
    bw = _deskew(bw)

    # 7. Crop to form boundary
    bw = _crop_to_form(bw)

    return bw


def _deskew(bw):
    """Detect rotation via Hough lines and rotate to correct skew > 0.5°."""
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
        if abs(median_angle) < 0.5:
            return bw

        h, w   = bw.shape
        M      = cv2.getRotationMatrix2D((w / 2, h / 2), median_angle, 1.0)
        rotated = cv2.warpAffine(bw, M, (w, h),
                                 flags=cv2.INTER_LINEAR,
                                 borderMode=cv2.BORDER_REPLICATE)
        return rotated
    except Exception as exc:
        logger.warning(f"Deskew failed: {exc}")
        return bw


def _crop_to_form(bw):
    """Find largest rectangular contour (the form boundary) and crop to it."""
    try:
        inv = cv2.bitwise_not(bw)
        contours, _ = cv2.findContours(inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return bw

        largest = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest)

        # Only crop if the detected rect is >30% of the image (genuine form boundary)
        ih, iw = bw.shape
        if w * h > iw * ih * 0.3:
            pad = 10
            x1  = max(0, x - pad)
            y1  = max(0, y - pad)
            x2  = min(iw, x + w + pad)
            y2  = min(ih, y + h + pad)
            return bw[y1:y2, x1:x2]
    except Exception as exc:
        logger.warning(f"Crop failed: {exc}")

    return bw


def run_ocr(preprocessed_np):
    """
    Run EasyOCR in two passes (word-level + paragraph) and merge results.
    Returns:
        full_text  (str)  — joined text for regex extraction
        ocr_results (list) — [(bbox, text, conf), ...] for checkbox detection
        avg_confidence (float)
    """
    reader = get_reader()

    # Pass 1: word-level (better for field extraction)
    results_words = reader.readtext(
        preprocessed_np,
        paragraph=False,
        min_size=10,
        contrast_ths=0.1,
        adjust_contrast=0.5,
        text_threshold=0.7,
        low_text=0.4,
    )

    # Pass 2: paragraph mode (better context reconstruction)
    results_para = reader.readtext(
        preprocessed_np,
        paragraph=True,
        min_size=10,
        contrast_ths=0.1,
        adjust_contrast=0.5,
        text_threshold=0.7,
        low_text=0.4,
    )

    # Sort word results top-to-bottom, left-to-right (reading order)
    results_words.sort(key=lambda r: (r[0][0][1], r[0][0][0]))

    # Build full text: use paragraph pass for long sentences, word pass for structured lines
    para_lines = [text for _, text, _ in results_para]
    word_lines = [text for _, text, _ in results_words]

    # Merge: concatenate both
    all_lines  = word_lines + para_lines
    full_text  = '\n'.join(all_lines)

    # Average OCR confidence
    confs = [c for _, _, c in results_words] or [0.0]
    avg_conf = round(float(np.mean(confs)), 3)

    logger.info(f"OCR done — {len(results_words)} word boxes, avg conf: {avg_conf:.3f}")

    return full_text, results_words, avg_conf


def scan_image(image_path):
    """
    End-to-end: preprocess → OCR.
    Returns (full_text, ocr_results, avg_confidence, preprocessed_np)
    """
    logger.info(f"Preprocessing {image_path}")
    preprocessed = preprocess_image(image_path)

    logger.info("Running OCR...")
    full_text, ocr_results, avg_conf = run_ocr(preprocessed)

    return full_text, ocr_results, avg_conf, preprocessed
