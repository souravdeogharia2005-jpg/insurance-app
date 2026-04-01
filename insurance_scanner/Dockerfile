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

# VITAL FOR MEMORY: Prevent numpy/scikit-learn from spawning too many baseline threads (kills memory)
ENV OMP_NUM_THREADS=1
ENV OPENBLAS_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV VECLIB_MAXIMUM_THREADS=1
ENV NUMEXPR_NUM_THREADS=1

# Tell glibc memory allocator to minimize fragmentation
ENV MALLOC_ARENA_MAX=2

# Run gunicorn — strictly 1 worker, 2 threads to stay well under 400MB
CMD gunicorn app:app --bind 0.0.0.0:$PORT --timeout 180 --workers 1 --threads 2 --worker-class gthread
