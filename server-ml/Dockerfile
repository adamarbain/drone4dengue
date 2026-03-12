# ML Service Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV and Health Checks
RUN apt-get update && apt-get install -y \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code and models
COPY . .

# Use gunicorn for production. Cloud Run provides the PORT env var.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 prediction_service:app
