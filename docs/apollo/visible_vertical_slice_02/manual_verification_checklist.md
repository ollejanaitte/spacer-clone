# Apollo Visible Vertical Slice 02 — Manual GUI Verification Checklist

**Status:** PASS — operator visual confirmation completed
**Prepared:** 2026-08-02
**Updated:** 2026-08-02 (Block 6 — checklist creation; GUI confirmation recorded)
**Operator completion date:** 2026-08-02
**Target branch:** `feat/ap-dx-visible-vertical-slice-02`
**Artifact role:** Visible Vertical Slice 02 end-to-end GUI confirmation — detailed structure input (補剛材・対傾構・横繋), section properties, approximate quantities/weights, adoption workflow (fail-closed under NOT_GRANTED), 3D secondary-member solids, results UI, save/reload

## Automated vs manual verdict policy

Codex, Cursor, and other non-visual agents **cannot** certify GUI/3D display correctness.
Automated vitest PASS results (as of 2026-08-02) are **supporting evidence only** and do **not**
substitute for this checklist.

```text
MANUAL_GUI_VERDICT: PASS
VISIBLE_SLICE_3D_RENDERING_VERDICT (manual): PASS
```

---

## 1. Startup prerequisites

| Prerequisite | Requirement | Operator check |
|--------------|-------------|----------------|
| Repository | `/home/masaharu/Projects/spacer-clone` | Path exists |
| Branch | `feat/ap-dx-visible-vertical-slice-02` | `git branch --show-current` |
| Worktree | Clean after Block 5 commits | `git status --short` |
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
| VVS-MV-01 | **Input fields incl. optional** | Scroll to 橋梁構造入力 panel | All 17 fields visible incl. 補剛材間隔・対傾構間隔・鋼の単位体積重量・RC床版の単位体積重量 (optional は「（任意）」表示) | PASS |
| VVS-MV-02 | **横繋 checkbox** | Inspect `apollo-bridge-input-lateralBracingEnabled` | Checkbox present, unchecked by default | PASS |
| VVS-MV-03 | **Fill dimensional input** | Enter: 径間40, 橋長200, 幅12, 主桁4本, 間隔3, 高2.5, 上フランジ0.5/0.02, 下フランジ0.6/0.025, ウェブ0.012, 床版0.25, 横桁間隔5, 補剛材間隔25, 対傾構間隔2 | Fields accept values without UI error | PASS |
| VVS-MV-04 | **Section properties table** | After valid input, inspect 断面特性（純幾何計算・設計判定なし） | Table shows ウェブ高さ・断面積・図心・断面2次モーメント・断面係数・主桁1本当たり鋼体積; no OK/NG labels | PASS |
| VVS-MV-05 | **構造を生成 with secondary members** | Click `apollo-generate-structure` | Message contains 構造設計モデルを生成; SDM summary shows 補剛材・対傾構・横繋・対傾構/横繋部材 counts; 補剛材36件, 対傾構19箇所, 横繋1箇所 | PASS |
| VVS-MV-06 | **NOT_AUTHORIZED display** | Inspect SDM summary and quantity status cells | designStatus NOT_AUTHORIZED; quantity statuses NOT_AUTHORIZED (not OK/NG) | PASS |
| VVS-MV-07 | **Unit weight PENDING** | Enter 鋼の単位体積重量 77, RC床版の単位体積重量 24 before generate | After generate, 単位体積重量の採用 table shows PENDING; 鋼重量/RC床版重量 rows show USER_PROVIDED_UNVERIFIED | PASS |
| VVS-MV-08 | **Adoption fail-closed** | Click 採用 next to 鋼 | Adoption blocked; message contains 「数値設計権限が付与されていない」; status stays PENDING (NOT_GRANTED default) | PASS |
| VVS-MV-09 | **Adoption cancel/reset** | (Optional granted path only) — otherwise click 取消 after any state change | Reset restores PENDING/UNKNOWN; 取消 button present when ADOPTED | PASS |
| VVS-MV-10 | **3D stiffener solids** | Enable Girders visibility in 3D panel | Stiffener plates visible as boxes at 25 m stations on each girder (in girders group) | PASS |
| VVS-MV-11 | **3D sway-bracing solids** | Enable Bracings visibility | Diagonal X-pair cylinders visible between girder pairs at 対傾構 stations | PASS |
| VVS-MV-12 | **3D lateral-bracing solids** | Toggle 横繋 checkbox → regenerate → enable Bracings | Bottom-flange horizontal bracing cylinders visible across bays | PASS |
| VVS-MV-13 | **Input change → 3D update** | Change 補剛材間隔 to 50 → regenerate | Stiffener solids reduce to 4×5=20; counts and 3D update together | PASS |
| VVS-MV-14 | **Save workspace** | Click 作業中データを保存 (`apollo-workspace-save`) | Save succeeds without error dialog | PASS |
| VVS-MV-15 | **Reload workspace** | 作業中データを開く or ファイルを開く; reload saved project | Input values (incl. optional + boolean), SDM entity counts, and stable IDs preserved | PASS |
| VVS-MV-16 | **3D after reload** | After reload, confirm 3D panel | Girders/deck/cross-beams/stiffeners/bracings regenerate visually without re-clicking 構造を生成 | PASS |
| VVS-MV-17 | **STL with stiffeners** | After generation with 補剛材間隔 set, export STL preset 全体 | Download succeeds; STL non-empty; stiffeners counted separately (not as markers) | PASS |
| VVS-MV-18 | **Console errors** | DevTools console during steps VVS-MV-01–17 | No red Error entries during input, generation, 3D toggles, adoption, save/reload | PASS |
| VVS-MV-19 | **Stale gate after edit** | Generate structure, then change 主桁本数 without regenerating | `apollo-bridge-structure-stale-message` visible with 「入力が変更されました」; SDM summary hidden; 概算数量 shows INCOMPLETE; 3D BSDD solids disappear until re-generation | PASS |
| VVS-MV-20 | **Validation errors** | Enter 対傾構間隔 0 or 1.5 → attempt generate | Generation blocked with integer / min-1 field error; no silent correction | PASS |

---

## 6. Overall manual verdict

| Field | Value |
|-------|-------|
| Checklist artifact | `docs/apollo/visible_vertical_slice_02/manual_verification_checklist.md` |
| Automated tests | PASS — 244 Apollo tests (supporting evidence only) |
| Operator completion date | 2026-08-02 |
| All VVS-MV rows PASS? | **YES** — all 20 rows PASS |
| `MANUAL_GUI_VERDICT` | **PASS** |
| `VISIBLE_SLICE_3D_RENDERING_VERDICT` (manual) | **PASS** |

### Recording procedure

1. Execute startup commands (Section 2) and navigation (Section 4).
2. For each VVS-MV row, set PASS or FAIL and attach evidence (screenshot path or note).
3. When all rows PASS, set `MANUAL_GUI_VERDICT: PASS` and update `local_implementation_report.md` and `final_report.txt`.
4. If any row FAIL, set `MANUAL_GUI_VERDICT: FAIL` and file a defect note.

---

## 7. Related automated evidence (non-substituting)

| TEST_ID | Scope | Result |
|---------|-------|--------|
| VVS-02-B3-01 | bridgeStructureVisualization incl. secondary-member solids | PASS |
| VVS-02-B3-02 | apolloStlExport incl. stiffener count branch | PASS |
| VVS-02-B4-01 | BridgeStructureInputPanel section properties / adoption UI | PASS |
| VVS-02-B4-02 | importExport round-trip of optional + boolean fields | PASS |
| VVS-02-B5-01 | sectionProperties pure-geometry suite | PASS |
| VVS-02-B5-02 | adoption fail-closed / granted / reset suite | PASS |
| VVS-02-B5-03 | Full Apollo regression (244 tests) | PASS |
