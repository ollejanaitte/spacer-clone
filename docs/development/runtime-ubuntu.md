# Ubuntu / WSL Startup Guide

This is a one-command startup guide for `spacer-clone` on Ubuntu 20.04 or later / WSL2 (Ubuntu).
It is positioned as the equivalent of `start-windows.ps1` / `start-mac.sh` and automatically sets up the Python venv, npm dependencies, and Electron.

## Requirements

| Item | Recommended |
| --- | --- |
| OS | Ubuntu 20.04+ / WSL2 (Ubuntu) |
| Python | 3.10 or later |
| Node.js | 18 or later (LTS recommended) |
| npm | 9 or later |

If anything is missing:

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nodejs npm
```

> When `python3` and `node` / `npm` are already on `PATH`, no manual preparation is required because the script creates the venv and `frontend/node_modules` automatically.

## Quick Start

```bash
cd ~/Projects/spacer-clone
./start-ubuntu.sh
```

What it does:

1. Moves to the repository root.
2. Creates `.venv` if missing.
3. Auto-installs Python dependencies such as `fastapi`, `uvicorn`, `numpy`, and `scipy`.
4. Creates `frontend/node_modules` via `npm install` if missing.
5. Builds `desktop/electron/dist/main.js` with `tsc` if missing.
6. Generates `build/icon.png` with `scripts/build_icons.py` if missing.
7. Starts the FastAPI backend on `http://127.0.0.1:8000`.
8. Starts the Electron development environment in `compat-gpu-blocklist` mode.

Stop with **Ctrl+C**. The backend, Electron, and related process groups are all stopped.

## Launch Options

```bash
./start-ubuntu.sh                   # Default: Electron + compat-gpu-blocklist
./start-ubuntu.sh --safe-gpu        # ANGLE GL fallback
./start-ubuntu.sh --legacy-gl       # Legacy desktop GL
./start-ubuntu.sh --normal          # Normal GPU (for Linux standard drivers)
./start-ubuntu.sh --web             # No Electron, Vite dev only (open http://127.0.0.1:5173 in a browser)
./start-ubuntu.sh --backend-only    # FastAPI only (useful for curl-based verification)
./start-ubuntu.sh --help            # Help
```

The GPU mode values match `GPU_MODES` in `desktop/electron/gpuMode.ts`.

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PYTHON_BIN` | `.venv/bin/python` | Python executable |
| `HOST` | `127.0.0.1` | Backend host |
| `PORT` | `8000` | Backend port |
| `GPU_MODE` | (follows `--safe-gpu` and similar) | Passed through to Electron |

Example:

```bash
PORT=8765 ./start-ubuntu.sh --web
```

## Logs

| File | Contents |
| --- | --- |
| `.local_projects/backend-start.out.log` | FastAPI stdout |
| `.local_projects/backend-start.err.log` | FastAPI stderr |

## Troubleshooting

### Electron is black / does not start

Switch the GPU mode and retry:

```bash
./start-ubuntu.sh --legacy-gl    # or --safe-gpu
```

### Use Wayland

```bash
./start-ubuntu.sh --normal        # Prefer Wayland with the normal GPU mode
```

### Wayland does not work / crashes

Switch to an X11 session, or use `--safe-gpu`.

### "Port 8000 is in use"

```bash
# Check
ss -ltn | grep 8000
# Free
fuser -k 8000/tcp
```

### "frontend/node_modules not found"

This happens when the automatic `npm install` fails, for example in an offline environment. Run it manually:

```bash
cd frontend
npm install
cd ..
./start-ubuntu.sh
```

### Processes remain after Ctrl+C

One of `backend`, `vite`, or `electron` is sticking outside of its process group. The cleanup script falls back to `pkill -f`, but you can also clean up manually:

```bash
pkill -f "uvicorn backend.app.main:app"
pkill -f "frontend/node_modules/.bin/vite"
pkill -f "node_modules/electron/dist/electron"
```

### No X server (CI / WSLg unavailable)

Skip Electron and use the Web (Vite) mode:

```bash
./start-ubuntu.sh --web
```

Or the backend-only mode:

```bash
./start-ubuntu.sh --backend-only
```

## Development Tips

- To update dependencies explicitly:

  ```bash
  # Python
  .venv/bin/pip install -U <pkg>
  # npm
  cd frontend && npm install <pkg>
  ```

- To watch the backend log in another terminal:

  ```bash
  tail -f .local_projects/backend-start.err.log
  ```

- Tests:

  ```bash
  .venv/bin/pytest backend/ -q
  cd frontend && npx vitest run
  ```
