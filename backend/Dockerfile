# HireLens API. Works on any host that runs a container and injects $PORT
# (Railway, Render, Fly.io, Cloud Run).
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies first, so a code change does not invalidate the install layer.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as a non-root user.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Migrations run on boot, then the server starts. Shell form so $PORT expands.
CMD alembic upgrade head && \
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
