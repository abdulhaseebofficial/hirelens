import sys
from pathlib import Path

# Add backend directory to sys.path so app and its modules are discoverable
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app

# Vercel looks for 'app' ASGI instance
__all__ = ["app"]
