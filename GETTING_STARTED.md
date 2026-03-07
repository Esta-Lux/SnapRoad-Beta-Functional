# SnapRoad – See the app and your updates

## Quick start (one command)

From the **project root** (`SnapRoad-Beta-Functional-RyanPM`):

```bash
npm install
npm run dev
```

This starts:
- **Backend** (API) on **http://localhost:8001**
- **Frontend** (React app) on **http://localhost:3000**

Then **open in your browser:**

| What you want | URL |
|---------------|-----|
| **Landing / welcome** | http://localhost:3000/ |
| **Driver app** | http://localhost:3000/driver |
| **Login (admin)** | http://localhost:3000/login |

If port 3000 is in use, Vite will use 3001. Check the terminal for the line like:

```
  ➜  Local:   http://localhost:3000/
```
or
```
  ➜  Local:   http://127.0.0.1:3001/
```

Use that URL.

---

## If you don’t see updates

1. **Use the URL from the terminal** – not an old bookmark (e.g. 3001 vs 3000).
2. **Hard refresh** – `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows).
3. **Run from project root** – `npm run dev` must be run from the folder that contains this `GETTING_STARTED.md` (so both backend and frontend start).
4. **Two terminals (alternative):**
   - Terminal 1: `cd app/backend && python run_server.py`
   - Terminal 2: `cd app/frontend && npm run dev`
   - Then open the URL that the frontend terminal prints (e.g. http://localhost:3000 or http://127.0.0.1:3001).

---

## Requirements

- **Node.js** (for frontend)
- **Python 3** (for backend)

### Backend first-time setup (required once)

On macOS with Homebrew Python, use a virtual environment so the backend can install dependencies:

```bash
cd app/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Then from the **project root**, `npm run dev` will use `app/backend/.venv/bin/python` automatically. If you prefer to run the backend without the venv (e.g. you use a global Python), remove or rename `app/backend/.venv` and ensure `python-dotenv`, `fastapi`, `uvicorn`, and other deps are installed (e.g. `pip install -r requirements.txt` in a venv elsewhere).
