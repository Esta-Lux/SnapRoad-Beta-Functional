# SnapRoad API (FastAPI) — production image for Railway, Fly.io, etc.
# Repo is a monorepo; API code lives in app/backend. Root package.json is for local dev only.
FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY app/backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

COPY app/backend /app

# Railway injects PORT at runtime — shell-form CMD so ${PORT} is expanded (exec JSON form would not).
# Leave Railway "Start Command" empty so this CMD is used.
# Local docker: defaults to 8001 if PORT unset.
EXPOSE 8001
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}
