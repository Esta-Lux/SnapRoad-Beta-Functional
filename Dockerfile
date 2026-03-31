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

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Railway: railway.toml startCommand also points here (dashboard overrides must not use bare `uvicorn ... $PORT`).
EXPOSE 8001
CMD ["/docker-entrypoint.sh"]
