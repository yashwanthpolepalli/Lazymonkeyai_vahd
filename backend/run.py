#!/usr/bin/env python3
import os
import sys

# ── Silence gRPC C-extension stderr noise ────────────────────────────────────
# These must be set BEFORE any google/grpc library is imported.
os.environ.setdefault("GRPC_VERBOSITY", "NONE")
os.environ.setdefault("GRPC_TRACE", "")

import warnings

# Suppress non-critical third-party deprecation & framework warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore")

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

import subprocess
import time

def _free_port(port: int = 8000) -> None:
    """Force-kill any process still occupying the given port before spawning a new server."""
    try:
        result = subprocess.run(
            ["lsof", "-ti", f":{port}"],
            capture_output=True, text=True
        )
        pids = result.stdout.strip().split()
        for pid in pids:
            if pid.strip():
                try:
                    subprocess.run(["kill", "-9", pid.strip()], check=False)
                except Exception:
                    pass
    except Exception:
        pass


if __name__ == "__main__":
    _free_port(8000)

    print("\n" + "=" * 68)
    print("🚀 VAHD ENTERPRISE PLATFORM BACKEND SERVER")
    print("=" * 68)
    print("  • Base API Endpoint:  http://127.0.0.1:8000/api/v1")
    print("  • Swagger OpenAPI UI: http://127.0.0.1:8000/docs")
    print("  • ReDoc Specs:       http://127.0.0.1:8000/redoc")
    print("  • Health Endpoint:    http://127.0.0.1:8000/health")
    print("  • Reload:             Enabled (watching src/)")
    print("=" * 68 + "\n")

    sys.dont_write_bytecode = True
    os.environ["PYTHONDONTWRITEBYTECODE"] = "1"

    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )


