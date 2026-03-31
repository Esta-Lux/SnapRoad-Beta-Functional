# SnapRoad API Server
# Modular backend - all routes in /routes, services in /services, models in /models
# Supervisor entry point: server:app

from main import create_app
from fastapi import Depends
from middleware.auth import require_admin

app = create_app()


# ==================== HEALTH & ROOT ====================
@app.get("/")
def root():
    return {
        "app": "SnapRoad API",
        "version": "2.0.0",
        "status": "running",
        "architecture": "modular (routes/, services/, models/)",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "snaproad-api"}


# ==================== DATABASE MIGRATION ====================
@app.get("/api/admin/migrate")
async def run_db_migration(_admin: dict = Depends(require_admin)):
    """Run database migration to create Supabase tables."""
    from services.supabase_service import run_migration
    result = await run_migration()
    return result


@app.get("/api/admin/db-status")
def check_db_status(_admin: dict = Depends(require_admin)):
    """Check database connection status."""
    from services.supabase_service import test_connection
    return test_connection()
