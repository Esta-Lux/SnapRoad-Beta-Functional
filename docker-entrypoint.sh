#!/bin/sh
set -e
# Railway sets PORT; expand here under /bin/sh (dashboard Start Commands often skip the shell).
if [ -z "${PORT}" ]; then PORT=8001; fi
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
