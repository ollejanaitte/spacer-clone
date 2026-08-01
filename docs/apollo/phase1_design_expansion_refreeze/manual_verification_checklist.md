# Apollo Phase 1 — Final Manual 3D/GUI Verification Checklist

**Status:** CHECKLIST_PREPARED — user visual confirmation required  
**Prepared:** 2026-08-01 19:49 JST  
**Target branch:** `docs/apollo-refreeze-local-verification`  
**Baseline:** `1fbcb3ea804f965b8f262284573f4f4d42dc2411`  
**Artifact role:** LV-05 manual 3D/GUI non-regression — operator-facing visual confirmation only

## Automated vs manual verdict policy

Codex, Cursor, and other non-visual agents **cannot** certify GUI/3D display correctness.
Automated vitest/Playwright PASS results (e.g. LV-04 bundle 2 viewer/3D: 228/228 tests PASS)
are **supporting evidence only** and do **not** substitute for this checklist.

```text
THREED_VIEWER_VERDICT: PENDING_USER_VISUAL_CONFIRMATION
```

Do not upgrade `THREED_VIEWER_VERDICT` to PASS until a human operator completes every row
below and records evidence. Do not treat automated test PASS as manual GUI PASS.

---

## 1. Startup prerequisites

| Prerequisite | Requirement | Operator check |
|--------------|-------------|----------------|
| Repository | `/home/masaharu/Projects/spacer-clone` (canonical clone) | Path exists |
| Branch | `docs/apollo-refreeze-local-verification` (or integrated `main` containing same Apollo code) | `git branch --show-current` |
| Worktree | Clean or docs-only edits; no unrelated staged application changes | `git status --short` |
| Node.js | v24.x recommended (recorded: v24.5.0) | `node --version` |
| npm | 10.x (recorded: 10.9.8) | `npm --version` |
| Python | 3.10+ (recorded: 3.10.12) | `python3 --version` |
| Frontend deps | `frontend/node_modules` installed | `cd frontend && npm ci` or `npm install` if missing |
| Backend deps | Python packages for `backend.app.main` importable | `python3 -c "import backend.app.main"` from repo root |
| Apollo env | `frontend/.env.apollo` present (`VITE_APOLLO_PHASE1_NN_ENABLED=true`, etc.) | Loaded automatically by `dev:apollo` / `app:dev:apollo` |
| Display | Desktop browser or Electron with WebGL; not headless-only | GPU/WebGL available |
| Downloads folder | Writable default browser download directory | For STL/manifest verification |

---

## 2. Exact startup commands

Run from repository root unless noted.

### Option A — Browser (recommended for screenshot evidence)

**Terminal 1 — backend API:**

```bash
cd /home/masaharu/Projects/spacer-clone
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 — Apollo frontend dev server:**

```bash
cd /home/masaharu/Projects/spacer-clone/frontend
npm run dev:apollo -- --host 127.0.0.1 --strictPort
```

Wait until Vite reports ready (default port **5173**).

### Option B — Electron + backend (single command)

```bash
cd /home/masaharu/Projects/spacer-clone/frontend
npm run app:dev:apollo
```

Starts uvicorn on `127.0.0.1:8000` and Apollo Electron shell against Vite.

### Option C — Ubuntu launcher

```bash
cd /home/masaharu/Projects/spacer-clone
./start-ubuntu.sh --apollo
```

Confirm launcher matches Option A or B URLs before relying on it.

---

## 3. URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Main PRO screen | `http://127.0.0.1:5173/pro` | Frame/main viewer; Apollo round-trip target |
| Apollo Phase 1 | `http://127.0.0.1:5173/pro/apollo` | Apollo workspace and embedded 3D |
| Backend API | `http://127.0.0.1:8000` | API health (optional: `/docs`) |
| Vite dev root | `http://127.0.0.1:5173/` | Landing; navigate to `/pro` if needed |

Electron mode loads the same Vite origin (`http://127.0.0.1:5173`).

---

## 4. Navigation — Apollo screen

| Step | Action | UI anchor |
|------|--------|-----------|
| 1 | Open main PRO screen | URL `http://127.0.0.1:5173/pro` |
| 2 | Confirm Apollo entry enabled | Toolbar button `data-testid="open-apollo-phase1"` is **enabled** (not greyed out) |
| 3 | Enter Apollo | Click **Apollo Phase 1** / open-apollo-phase1 → URL becomes `/pro/apollo` |
| 4 | Confirm shell | `data-testid="apollo-phase1-shell"` visible |
| 5 | Load standard sample | **サンプルを選ぶ** (`apollo-open-sample-selection`) → **このサンプルを読み込む** (`apollo-load-standard-sample`) for **200m級 5径間連続橋** |
| 6 | Confirm sample loaded | Guided checklist or topology summary shows nodes/members; `apollo-topology-view` shows 3D panel |
| 7 | Open topology 3D | Section **橋梁モデル表示** (`apollo-topology-shell`) with embedded viewer |

---

## 5. Navigation — main screen (round-trip)

| Step | Action | UI anchor |
|------|--------|-----------|
| 1 | From Apollo with sample loaded | Sample **200m級 5径間連続橋** active |
| 2 | Return to main menu | **メニューへ戻る** (`apollo-return-to-pro`) |
| 3 | Unsaved guard (if shown) | **破棄して戻る** (`apollo-guard-discard`) or save first — record choice |
| 4 | Confirm main route | URL `http://127.0.0.1:5173/pro` |
| 5 | Confirm Apollo model available | Viewer control `viewer-display-model` select present; **Apollo モデルは利用できません** (`viewer-display-model-unavailable`) **not** shown |
| 6 | Switch display model | `viewer-display-model` → option value `apollo` |
| 7 | Open view controls | Viewer panel toggles for visibility and camera |

---

## 6. Visual verification items

Complete each row on **both** Apollo embedded viewer and main screen (after round-trip) where applicable.

| ID | Check | Expected result | Evidence | PASS / FAIL / PENDING_USER_VISUAL_CONFIRMATION |
|----|-------|-----------------|----------|-----------------------------------------------|
| MV-01 | **3D solid display** (Apollo viewer) | **Apollo Solid** toggle on; visible mass geometry (not empty canvas); **Apollo Line** may also show but solids must be present | Screenshot + note solid count impression | PENDING_USER_VISUAL_CONFIRMATION |
| MV-02 | **Deck display** | **Deck** visibility on → deck slab solids visible; off → deck hidden | Screenshot on/off | PENDING_USER_VISUAL_CONFIRMATION |
| MV-03 | **Main girder display** | **Girders** on → main-girder solids visible; off → girders hidden | Screenshot on/off | PENDING_USER_VISUAL_CONFIRMATION |
| MV-04 | **Cross-beam / floor members** | **Cross Beams** (and bracing if present) on → transverse/floor-related members visible as solids or defined geometry; off → hidden | Screenshot on/off | PENDING_USER_VISUAL_CONFIRMATION |
| MV-05 | **No regression to frame lines only** | With **Apollo Solid** on, display is **not** limited to wireframe/frame lines only; main screen `apollo` display model shows solid visualization (`data-apollo-visualization` > 0 equivalent visually) | Screenshot comparing frame-only vs solid | PENDING_USER_VISUAL_CONFIRMATION |
| MV-06 | **Camera rotate** | Drag in viewer rotates model; no stuck or blank view | Short note or screen recording | PENDING_USER_VISUAL_CONFIRMATION |
| MV-07 | **Camera zoom** | Scroll or zoom control changes scale smoothly | Short note | PENDING_USER_VISUAL_CONFIRMATION |
| MV-08 | **Console errors** | Browser DevTools console: **no** red `Error` entries during sample load, view toggles, STL export, and round-trip (WebGL stall **warnings** alone are informational) | Console log export or screenshot | PENDING_USER_VISUAL_CONFIRMATION |
| MV-09 | **STL export** | Preset `全体` (`full`) → **STL + Manifest** (`apollo-export-stl`) triggers download without UI error | Screenshot of export UI + download bar | PENDING_USER_VISUAL_CONFIRMATION |
| MV-10 | **Downloaded file verification** | Files land in download folder; e.g. `full-1-200m級-5径間連続橋.stl` and matching `.apollo.json` manifest; STL size > 0 bytes; open STL in external viewer if desired | File paths, sizes, optional `ls -l` output | PENDING_USER_VISUAL_CONFIRMATION |
| MV-11 | **STL presets** (optional depth) | Presets `主桁のみ` / `床版のみ` / `表示中のみ` (`girders`, `deck`, `visible`) each download distinct non-empty STL + manifest | File list per preset | PENDING_USER_VISUAL_CONFIRMATION |
| MV-12 | **Reload existing data** | **作業中データを保存** (`apollo-workspace-save`) then reload via **作業中データを開く** (`apollo-workspace-open`) or **ファイルを開く**; model and 3D view restore without corruption | Screenshot after reload | PENDING_USER_VISUAL_CONFIRMATION |
| MV-13 | **Main screen solid after reload** | After workspace reload + return to `/pro`, `viewer-display-model` = `apollo` still shows solids (MV-05 on main screen) | Screenshot on `/pro` | PENDING_USER_VISUAL_CONFIRMATION |

### Visibility control reference (viewer panel)

| Label | Visibility flag | Used in |
|-------|-----------------|---------|
| Apollo Solid | `apolloSolidModel` | MV-01, MV-05 |
| Apollo Line | `apolloLineModel` | Regression check (lines alone insufficient) |
| Girders | `apolloGirders` | MV-03 |
| Cross Beams | `apolloCrossBeams` | MV-04 |
| Deck | `apolloDeck` | MV-02 |
| Bracing | `apolloBracings` | MV-04 (supplemental) |

### STL export reference

| Preset UI | `apollo-stl-export-preset` value | Expected download prefix (standard sample) |
|-----------|----------------------------------|--------------------------------------------|
| 全体 | `full` | `full-1-200m級-5径間連続橋.stl` |
| 主桁のみ | `girders` | `girders-1-200m級-5径間連続橋.stl` |
| 床版のみ | `deck` | `deck-1-200m級-5径間連続橋.stl` |
| 表示中のみ | `visible` | `visible-1-200m級-5径間連続橋.stl` |

Manifest sibling: same prefix with `.apollo.json` (e.g. `full-2-200m級-5径間連続橋.apollo.json`).

---

## 7. Overall LV-05 manual verdict

| Field | Value |
|-------|-------|
| Checklist artifact | `manual_verification_checklist.md` (this file) |
| Automated viewer tests (LV-04-B02) | PASS (228/228 vitest) — **does not** constitute manual GUI PASS |
| Operator completion date | *(fill when done)* |
| Operator name | *(fill when done)* |
| Evidence location | *(screenshots, logs, file paths)* |
| All MV rows PASS? | *(fill when done)* |
| `THREED_VIEWER_VERDICT` | **PENDING_USER_VISUAL_CONFIRMATION** |
| `LV05_3D_DISPLAY_VERDICT` | **PENDING_USER_VISUAL_CONFIRMATION** (until all MV rows PASS) |

### Recording procedure

1. Execute startup commands (Section 2) and navigation (Sections 4–5).
2. For each MV row, set **PASS** or **FAIL** and attach evidence.
3. If any row is FAIL, set `THREED_VIEWER_VERDICT: FAIL` and describe defect.
4. If all rows PASS, set `THREED_VIEWER_VERDICT: PASS` and update `local_verification_report.md` and `final_report.txt`.
5. Do not mark refreeze final readiness or PR judgment PASS until step 4 completes with human PASS.

---

## 8. Related automated evidence (non-substituting)

| Source | Result | Note |
|--------|--------|------|
| LV-04 bundle 2 viewer vitest | PASS (22 files, 228 tests) | Geometry/build logic only |
| PR5 smoke summary | `PASS_PER_SOURCE_SUMMARY` | Historical; route `/pro/apollo`, STL presets |
| Operator smoke | Representative PNG `17_sample_loaded.png` | Sample load UI only |
| Commits `d3f1ec6`, `1fbcb3e` | On `origin/main` | Main viewer solid handoff maintenance |

---

## 9. Sign-off block (operator)

```text
MANUAL_VERIFICATION_COMPLETED: NO
THREED_VIEWER_VERDICT: PENDING_USER_VISUAL_CONFIRMATION
LV05_3D_DISPLAY_VERDICT: PENDING_USER_VISUAL_CONFIRMATION
REFREEZE_FINAL_READINESS: BLOCKED — manual user visual confirmation required
OPERATOR: 
DATE: 
EVIDENCE_PATH: 
```
