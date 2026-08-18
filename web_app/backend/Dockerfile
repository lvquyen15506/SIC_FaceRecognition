# Production-Hardened Non-Root Backend Dockerfile for SIC_FaceRecognition
FROM python:3.10-slim

# Create non-root app user
RUN groupadd -g 1000 appuser && useradd -u 1000 -g appuser -m appuser

WORKDIR /app

# Copy app code and core AI
COPY --chown=appuser:appuser web_app/backend/app /app/app
COPY --chown=appuser:appuser web_app/backend/main.py /app/main.py
COPY --chown=appuser:appuser src /app/src
COPY --chown=appuser:appuser data_gallery /app/data_gallery
COPY --chown=appuser:appuser reports /app/reports
COPY --chown=appuser:appuser web_app/backend/data /app/web_app/backend/data

# Pre-compiled wheels (opencv-python-headless & psycopg2-binary do not require apt system libs)
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
    torch \
    numpy

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
