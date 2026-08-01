# Apollo Visible Vertical Slice 01 — Manual GUI Verification Checklist

**Status:** PENDING — operator visual confirmation required
**Prepared:** 2026-08-01
**Updated:** 2026-08-01 (Block 3 — PR #245 review follow-up GUI items)
**Target branch:** `feat/ap-dx-visible-vertical-slice-01`
**Review follow-up baseline SHA:** `560c9e1ed09c65691e8a47a0a542201c6c73208b`
**Artifact role:** Visible Vertical Slice 01 end-to-end GUI confirmation — bridge structure input → SDM → 3D solids → save/reload, including stale-gate and validation UX

## Automated vs manual verdict policy

Codex, Cursor, and other non-visual agents **cannot** certify GUI/3D display correctness.
Automated vitest PASS results (218 Apollo + 22 viewer + slice-specific tests as of 2026-08-01) are
**supporting evidence only** and do **not** substitute for this checklist.

```text
MANUAL_GUI_VERDICT: PENDING_USER_CONFIRMATION
VISIBLE_SLICE_3D_RENDERING_VERDICT (manual): PENDING
```

---

## 1. Startup prerequisites

| Prerequisite | Requirement | Operator check |
|--------------|-------------|----------------|
| Repository | `/home/masaharu/Projects/spacer-clone` | Path exists |
| Branch | `feat/ap-dx-visible-vertical-slice-01` | `git branch --show-current` |
| Worktree | Clean after Block 3 commits | `git status --short` |
| Node.js | v24.x recommended | `node --version` |
| Frontend deps | `frontend/node_modules` installed | `cd frontend && npm ci` if missing |
| Backend deps | `python3 -c "import backend.app.main"` from repo root | Import succeeds |
| Apollo env | `frontend/.env.apollo` present | `VITE_APOLLO_PHASE1_NN_ENABLED=true` etc. |
| Display | Desktop browser or Electron with WebGL | GPU/WebGL available |

---

## 2. Exact startup commands

Run from repository root unless noted.

### Option A — Browser (recommended)

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

---

## 3. URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Apollo Phase 1 | `http://127.0.0.1:5173/pro/apollo` | Bridge structure input + 3D viewer |
| Main PRO screen | `http://127.0.0.1:5173/pro` | Optional round-trip check |
| Backend API | `http://127.0.0.1:8000` | API health (optional) |

---

## 4. Navigation — bridge structure workflow

| Step | Action | UI anchor |
|------|--------|-----------|
| 1 | Open Apollo | URL `http://127.0.0.1:5173/pro/apollo` or navigate from `/pro` via `open-apollo-phase1` |
| 2 | Confirm shell | `data-testid="apollo-phase1-shell"` visible |
| 3 | Locate input panel | `data-testid="apollo-bridge-structure-panel"` — heading **橋梁構造入力** |
| 4 | Confirm empty state | `data-testid="apollo-bridge-structure-not-generated"` visible before generation |

---

## 5. Visual verification items

Complete each row. Record **PASS**, **FAIL**, or leave **PENDING** until operator confirms.

| ID | Check | Step-by-step action | Expected result | PASS / FAIL / PENDING |
|----|-------|---------------------|-------------------|---------------------|
| VVS-MV-01 | **Input fields present** | Scroll to 橋梁構造入力 panel | All 13 fields visible (`apollo-bridge-input-spanLength` … `apollo-bridge-input-crossBeamSpacing`) | PENDING |
| VVS-MV-02 | **INCOMPLETE quantities** | Before filling all fields, inspect 概算数量 table | Status shows INCOMPLETE; no design OK/NG labels | PENDING |
| VVS-MV-03 | **Fill dimensional input** | Enter: 径間40, 橋長200, 幅12, 主桁4本, 間隔3, 高2.5, 上フランジ0.5/0.02, 下フランジ0.6/0.025, ウェブ0.012, 床版0.25, 横桁間隔5 | Fields accept values without UI error | PENDING |
| VVS-MV-04 | **構造を生成** | Click `data-testid="apollo-generate-structure"` | Message contains 構造設計モデルを生成; `apollo-bridge-structure-sdm-summary` shows 主桁4 / RC床版1 / 横桁>0; compositeAction false | PENDING |
| VVS-MV-05 | **NOT_AUTHORIZED display** | Inspect SDM summary and quantity status cells | designStatus NOT_AUTHORIZED; quantity statuses NOT_AUTHORIZED (not OK/NG) | PENDING |
| VVS-MV-06 | **3D deck solids** | Open 橋梁モデル表示 3D panel; enable Apollo Solid + Deck | RC deck slab visible in viewer after generation | PENDING |
| VVS-MV-07 | **3D main girder solids** | Enable Girders visibility | Four main girder solids aligned transversely | PENDING |
| VVS-MV-08 | **3D cross-beam solids** | Enable Cross Beams visibility | Cross-beams visible at spacing stations along bridge length | PENDING |
| VVS-MV-09 | **Input change → 3D update** | Change 主桁本数 to 2, 主桁間隔 to 4; click 構造を生成 again | 3D shows 2 girders at new spacing; SDM counts update | PENDING |
| VVS-MV-10 | **Save workspace** | Click 作業中データを保存 (`apollo-workspace-save`) | Save succeeds without error dialog | PENDING |
| VVS-MV-11 | **Reload workspace** | 作業中データを開く or ファイルを開く; reload saved project | Input values, SDM entity counts, and stable IDs preserved | PENDING |
| VVS-MV-12 | **3D after reload** | After reload, confirm 3D panel | Girders/deck/cross-beams regenerate visually without re-clicking 構造を生成 | PENDING |
| VVS-MV-13 | **STL non-regression** | Load 200m級 sample (optional); export STL preset 全体 | Download succeeds; STL non-empty (sample path unchanged) | PENDING |
| VVS-MV-14 | **Console errors** | DevTools console during steps VVS-MV-01–12 | No red Error entries during input, generation, 3D toggles, save/reload | PENDING |
| VVS-MV-15 | **Stale gate after edit** | Generate structure (VVS-MV-04), then change 主桁本数 without clicking 構造を生成 | `apollo-bridge-structure-stale-message` visible with 「入力が変更されました」; SDM summary hidden; 概算数量 shows INCOMPLETE; 3D BSDD solids disappear until re-generation | PENDING |
| VVS-MV-16 | **Validation errors** | Enter 橋長100 / 径間30 → attempt generate; then enter 幅8 / 主桁4 / 間隔3 → attempt generate | Generation blocked with 「割り切れる」 and 「主桁配置幅」 field errors respectively; no silent span correction | PENDING |

---

## 6. Overall manual verdict

| Field | Value |
|-------|-------|
| Checklist artifact | `docs/apollo/visible_vertical_slice_01/manual_verification_checklist.md` |
| Automated Block 3 tests | PASS — 40 slice + 218 Apollo (supporting evidence only) |
| Operator completion date | _not recorded_ |
| All VVS-MV rows PASS? | **NO** — pending operator execution |
| `MANUAL_GUI_VERDICT` | **PENDING_USER_CONFIRMATION** |
| `VISIBLE_SLICE_3D_RENDERING_VERDICT` (manual) | **PENDING** |

### Recording procedure

1. Execute startup commands (Section 2) and navigation (Section 4).
2. For each VVS-MV row, set PASS or FAIL and attach evidence (screenshot path or note).
3. When all rows PASS, set `MANUAL_GUI_VERDICT: PASS` and update `local_implementation_report.md` and `final_report.txt`.
4. If any row FAIL, set `MANUAL_GUI_VERDICT: FAIL` and file a defect note.

---

## 7. Related automated evidence (non-substituting)

| TEST_ID | Scope | Result |
|---------|-------|--------|
| VVS-01-B3-01 | Slice tests incl. stale/validation negatives (40 tests) | PASS |
| VVS-01-B3-02 | Full Apollo regression (218 tests) | PASS |
| VVS-01-B3-03 | Viewer + STL regression (22 tests) | PASS |
| VVS-01-D-04 | bridgeStructureVisualization 3D model | PASS |
| VVS-01-D-05 | importExport save/reload | PASS |
