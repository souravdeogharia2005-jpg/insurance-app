FROM python:3.11-slim

# Install system dependencies (Tesseract OCR, OpenCV dependencies)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set default port just in case
ENV PORT=5050
EXPOSE $PORT

# Run gunicorn (shell form to evaluate $PORT)
CMD gunicorn app:app --bind 0.0.0.0:$PORT --timeout 180 --workers 1
