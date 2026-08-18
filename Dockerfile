# Backend Dockerfile for SIC_FaceRecognition
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV and PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY web_app/backend/app /app/app
COPY web_app/backend/main.py /app/main.py
COPY src /app/src
COPY data_gallery /app/data_gallery
COPY reports /app/reports

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

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
