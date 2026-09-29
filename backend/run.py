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


def run_server() -> subprocess.Popen:
    """Start uvicorn as a subprocess WITHOUT --reload.
    Uses the venv Python directly (not sys.executable / Xcode Python)
    to avoid OSError [Errno 89] from Xcode site.py sandboxing.
    """
    env = os.environ.copy()
    # Silence gRPC C-extension channel-creation errors in the child process
    env["GRPC_VERBOSITY"] = "NONE"
    env["GRPC_TRACE"] = ""
    env["PYTHONUNBUFFERED"] = "1"

    # Use the venv Python directly — never the Xcode-bundled Python
    venv_python = os.path.join(backend_dir, ".venv", "bin", "python3")
    python_bin = venv_python if os.path.isfile(venv_python) else sys.executable

    return subprocess.Popen(
        [
            python_bin, "-u", "-m", "uvicorn",
            "src.main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
        ],
        cwd=backend_dir,
        env=env,
    )

if __name__ == "__main__":
    src_dir = os.path.join(backend_dir, "src")

    print("\n" + "=" * 68)
    print("🚀 FIT CLUB GYM ENTERPRISE PLATFORM BACKEND SERVER")
    print("=" * 68)
    print("  • Base API Endpoint:  http://127.0.0.1:8000/api/v1")
    print("  • Swagger OpenAPI UI: http://127.0.0.1:8000/docs")
    print("  • ReDoc Specs:       http://127.0.0.1:8000/redoc")
    print("  • Health Endpoint:    http://127.0.0.1:8000/health")
    print("  • Watching:           src/ (*.py only)")
    print("=" * 68 + "\n")

    try:
        from watchfiles import watch, Change
    except ImportError:
        # watchfiles not available – just run once without auto-reload
        proc = run_server()
        proc.wait()
        sys.exit(0)

    def only_py_in_src(change: Change, path: str) -> bool:
        """Filter: only trigger on .py changes inside src/, never .venv."""
        if ".venv" in path or "__pycache__" in path:
            return False
        if not path.endswith(".py"):
            return False
        if not path.startswith(src_dir):
            return False
        return True

    _free_port(8000)
    proc = run_server()
    last_restart_at = time.monotonic()
    print("[watcher] Server started. Watching src/ for .py changes…\n")

    MIN_RESTART_INTERVAL = 4.0

    try:
        for changes in watch(src_dir, watch_filter=only_py_in_src, debounce=2000, step=400):
            # Ignore initial indexing events fired right after server launch (6.0s grace period)
            if time.monotonic() - last_restart_at < 6.0:
                continue

            changed_files = [os.path.basename(p) for _, p in changes]
            if not changed_files:
                continue

            elapsed = time.monotonic() - last_restart_at
            if elapsed < MIN_RESTART_INTERVAL:
                time.sleep(MIN_RESTART_INTERVAL - elapsed)

            print(f"[watcher] Changes detected in {len(changed_files)} file(s): {changed_files}")
            print("[watcher] Restarting server gracefully…")

            if proc and proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait()

            time.sleep(1.0)
            _free_port(8000)
            proc = run_server()
            last_restart_at = time.monotonic()
            print("[watcher] Server restarted.\n")

        # Keep parent process alive if generator ends
        if proc and proc.poll() is None:
            proc.wait()

    except (KeyboardInterrupt, EOFError):
        print("\n[watcher] Shutting down…")
        if proc and proc.poll() is None:
            proc.terminate()
            proc.wait()
    except Exception as e:
        print(f"\n[watcher alert] Watcher loop encountered exception: {e}")
        if proc and proc.poll() is None:
            proc.wait()


