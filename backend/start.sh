#!/bin/bash
# Production startup script for Render.com deployment

echo "Starting Kaggler Backend..."
echo "Python version: $(python --version)"
echo "Current directory: $(pwd)"
echo "PORT: $PORT"

# Run with production settings
exec uvicorn api:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers ${WORKERS:-1} \
    --access-log \
    --log-level info
