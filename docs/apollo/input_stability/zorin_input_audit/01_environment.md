# AUI-R1: ZorinOS Apollo Input Audit — Environment

## System

- OS: Zorin OS 17.3 (Ubuntu 22.04 jammy)
- Kernel: Linux
- Desktop: GNOME (X11)
- Display: Xvfb :99 (1920x1080x24) or native display

## Runtime

- Node.js: v22.23.2
- npm: 10.9.8
- Python: 3.10.12 (.venv/bin/python)
- Backend: uvicorn backend.app.main:app on 127.0.0.1:8000

## Frontend

- Vite: v7.3.5 (mode: apollo)
- Dev server: http://127.0.0.1:5173
- Electron: v42.3.3
- Playwright: v1.61.0 (@playwright/test)
- Playwright browser: Chromium (bundled)

## Repository

- Path: /home/masaharu/Projects/spacer-clone
- Branch: main
- Baseline SHA: f6b222c18b4663d225c731f8624c61eda9bb153c
- Worktree: clean

## IME

- IBus: available
- Engine: mozc-jp (Japanese)
- Locale: ja_JP.UTF-8

## Existing Scripts

- frontend/scripts/verifyApolloUnit2Electron.mjs (Electron Playwright harness)
- frontend/scripts/verifyApolloElectron.mjs

## Test Readiness

| Check | Status |
|-------|--------|
| Repository exists | PASS |
| Local main = origin/main | PASS |
| Worktree clean | PASS |
| Backend python available | PASS |
| Backend health endpoint | PASS |
| Vite dev server starts | PASS |
| Electron compile succeeds | PASS |
| Electron Playwright launches | PASS |
| Xvfb available | PASS |
| Japanese IME available | PASS |