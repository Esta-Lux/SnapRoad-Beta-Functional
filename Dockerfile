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

# Railway injects PORT into the container environment. Do not use shell $PORT in CMD — if Railway
# (or a Start Command override) invokes the process without a shell, uvicorn sees the literal "$PORT".
# Reading PORT in Python avoids that. Clear Railway Settings → Deploy → Start Command so this CMD runs.
EXPOSE 8001
CMD ["python", "-c", "import os; port=int((os.environ.get('PORT') or '8001').strip()); import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=port)"]
