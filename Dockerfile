# Production-Hardened Non-Root Backend Dockerfile for SIC_FaceRecognition
FROM python:3.10-slim

# Create non-root app user
RUN groupadd -g 1000 appuser && useradd -u 1000 -g appuser -m appuser

WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy app code
COPY --chown=appuser:appuser web_app/backend/app /app/app
COPY --chown=appuser:appuser web_app/backend/main.py /app/main.py
COPY --chown=appuser:appuser src /app/src
COPY --chown=appuser:appuser data_gallery /app/data_gallery
COPY --chown=appuser:appuser reports /app/reports
COPY --chown=appuser:appuser web_app/backend/data /app/web_app/backend/data

RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    sqlalchemy \
    passlib \
    pyjwt \
    python-multipart \
    openpyxl \
    opencv-python-headless \
    pillow \
    torch \
    numpy

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
