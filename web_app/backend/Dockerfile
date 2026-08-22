# Production-Hardened Non-Root Backend Dockerfile for SIC_FaceRecognition
FROM python:3.10-slim

# Install ffmpeg for OpenCV video decoding & processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root app user
RUN groupadd -g 1000 appuser && useradd -u 1000 -g appuser -m appuser

WORKDIR /app

# Pre-install Python dependencies for ultra-fast Docker layer caching
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    sqlalchemy \
    psycopg2-binary \
    passlib \
    pyjwt \
    python-multipart \
    openpyxl \
    opencv-python-headless \
    pillow \
    onnxruntime \
    numpy

# Copy app code and core AI
COPY --chown=appuser:appuser web_app/backend/app /app/app
COPY --chown=appuser:appuser web_app/backend/main.py /app/main.py
COPY --chown=appuser:appuser src /app/src

# Ensure data directories exist and belong to appuser
RUN mkdir -p /app/weights /app/data_gallery /app/reports /app/web_app/backend/data/uploads && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
