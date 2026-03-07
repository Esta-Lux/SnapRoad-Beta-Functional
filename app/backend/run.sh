#!/usr/bin/env bash
# Run SnapRoad API backend on port 8001 (frontend proxies /api to this port)
cd "$(dirname "$0")"
if [ ! -d "venv" ]; then
  echo "Creating venv..."
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null || true
echo "Starting backend at http://127.0.0.1:8001"
exec uvicorn main:app --host 127.0.0.1 --port 8001 --reload
