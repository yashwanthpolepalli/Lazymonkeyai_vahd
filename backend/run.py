#!/usr/bin/env python3
"""
VAHD Backend Dev Server
=======================
Launches uvicorn via the CLI (subprocess) so that --reload-dir strictly
limits file watching to src/ only — no CWD watching, no multiprocessing
spawn storms, no __pycache__ mtime false-positives on macOS Python 3.9.
"""
import os
import sys
import subprocess

# ── Silence gRPC C-extension stderr noise ────────────────────────────────────
os.environ.setdefault("GRPC_VERBOSITY", "NONE")
os.environ.setdefault("GRPC_TRACE", "")

# Stop Python from writing .pyc / __pycache__ files.
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
sys.dont_write_bytecode = True

import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)


def _free_port(port: int = 8000) -> None:
    """Force-kill any process still occupying the given port."""
    try:
        result = subprocess.run(
            ["lsof", "-ti", f":{port}"], capture_output=True, text=True
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
    print("  • ReDoc Specs:        http://127.0.0.1:8000/redoc")
    print("  • Health Endpoint:    http://127.0.0.1:8000/health")
    print("  • Reload:             Enabled — watching src/ ONLY")
    print("=" * 68 + "\n")

    src_dir = os.path.join(backend_dir, "src")

    # Use uvicorn CLI via subprocess — this is the ONLY reliable way to
    # restrict reload watching to src/ on macOS Python 3.9.
    # uvicorn's --reload-dir flag does NOT also watch CWD (unlike uvicorn.run()).
    # Running as subprocess avoids multiprocessing spawn races on macOS.
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"

    cmd = [
        sys.executable, "-m", "uvicorn",
        "src.main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload",
        "--reload-dir", src_dir,
        "--log-level", "warning",
    ]

    try:
        subprocess.run(cmd, cwd=backend_dir, env=env)
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped.")
