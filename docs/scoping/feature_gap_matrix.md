# 機能ギャップマトリクス

**Generated**: 2026-07-15  
**Git HEAD**: `fd21e30`

---

## 道路側

| 機能 | 現行状態 | 場所 | UI | Core | Save | Test | 再利用判定 | Risk |
|------|----------|------|-----|------|------|------|-----------|------|
| LINER 線形 | IMPLEMENTED | `liner/core/` | 有 | 有 | 有 | 有 | KEEP | 低 |
| LINER 測点 | IMPLEMENTED | `liner/core/station/` | 有 | 有 | 有 | 有 | KEEP | 低 |
| LINER 縦断 | IMPLEMENTED | `liner/core/geometry/` | 有 | 有 | 有 | 有 | KEEP | 低 |
| LINER 横断 | IMPLEMENTED | `liner/core/` | 有 | 有 | 有 | 有 | KEEP | 低 |
| LINER DXF | IMPLEMENTED | `liner/dxf/` | 有 | 有 | 有 | 有 | KEEP | 低 |
| LDIST | **NOT IMPLEMENTED** | — | 無 | 無 | 無 | 無 | — | P2 |
| HAUNCH | **NOT IMPLEMENTED** | — | 無 | 無 | 無 | 無 | — | P2 |
| HOSO | **NOT IMPLEMENTED** | — | 無 | 無 | 無 | 無 | — | P2 |
| GDRAW (Drawing) | IMPLEMENTED | `liner/drawing/` | 有 | 有 | 有 | 有 | KEEP | 低 |
| TOOL (電卓等) | **NOT IMPLEMENTED** | — | 無 | 無 | 無 | 無 | — | P2 |
| 拡幅 (Widening) | **NOT IMPLEMENTED**（型定義のみ） | `schema/types.ts:348-353` | 無 | 無 | 無 | 無 | — | P2 |
| Bridge Wizard | IMPLEMENTED | `bridge/` | 有 | 有 | 有 | 有 | KEEP (legacy) | 低 |
| BridgeDefinition | IMPLEMENTED（feature-flagged） | `bridgeDefinition/` | 有 | 有 | — | 有 | KEEP (intermediate) | 低 |

---

## 骨組み側

| 機能 | 現行状態 | 場所 | UI | Solver | Save | Test | 再利用判定 | Risk |
|------|----------|------|-----|--------|------|------|-----------|------|
| CONTROL (run) | **PARTIAL** | `Toolbar.tsx` | 有 | — | — | — | — | P1 |
| CONTROL (cancel) | **ABSENT** | — | 無 | — | — | — | — | P1 |
| CONTROL (progress) | **ABSENT** | — | — | — | — | — | — | P1 |
| CONTROL (history) | **ABSENT** | — | — | — | — | — | — | P1 |
| STATICS model | IMPLEMENTED | `PropertyPanel` | 有 | 有 | 有 | 有 | KEEP | 低 |
| STATICS spring | **ABSENT** | — | 無 | 無 | 無 | 無 | — | P1 |
| STATICS release | **ABSENT** | — | 無 | 無 | 無 | 無 | — | P1 |
| STATICS rigid offset | **ABSENT** | — | 無 | 無 | 無 | 無 | — | P1 |
| STATICS temp | **ABSENT** | — | 無 | 無 | 無 | 無 | — | P2 |
| STATICS settlement | **ABSENT** | — | 無 | 無 | 無 | 無 | — | P2 |
| Nodal load | IMPLEMENTED | `PropertyPanel` | 有 | 有 | 有 | 有 | KEEP | 低 |
| Member load (uniform) | IMPLEMENTED | `PropertyPanel` | 有 | 有 | 有 | 有 | KEEP | 低 |
| Self weight | PARTIAL（Wizard のみ） | `bridge_fem_generator.py:274` | Wizard | 有 | 有 | 有 | KEEP | 低 |
| INFLOAD full | **NOT IMPLEMENTED** | — | — | — | — | — | — | P1 |
| INFLOAD MVP (singlePoint) | IMPLEMENTED | `moving_load.py` | 有 | 有 | — | 有 | KEEP | 低 |
| Influence | IMPLEMENTED | `influence.py` | 有 | 有 | 有 | 有 | KEEP | 低 |
| R-SPECTRUM | IMPLEMENTED | `response_spectrum.py` | 有 | 有 | 有 | 有 | KEEP | 低 |
| Eigen | IMPLEMENTED | `eigen.py` | 有 | 有 | 有 | 有 | KEEP | 低 |
| PRINT static combos | **ABSENT** | — | — | — | — | — | — | P1 |
| PRINT CSV | IMPLEMENTED | `reports.py` | — | — | 有 | 有 | KEEP | 低 |
| PRINT PDF (influence) | **NOTINCLUDED** | `resultPdfReport.ts` | — | — | — | — | — | P2 |
| PRINT PDF (movingLoad) | **NOTINCLUDED** | `resultPdfReport.ts` | — | — | — | — | — | P2 |
| DRAFT formal FEM CAD | **PARTIAL**（Viewer ≠ DRAFT） | `viewer/` | 有 | — | — | — | — | P1 |
| Autosave | **FALSE** | `App.tsx:89` | — | — | — | — | — | P0 |
| Result persistence (non-TH) | **React state only** | `App.tsx:103` | — | — | — | — | — | P1 |
| TimeHistory persistence | IMPLEMENTED | `types.ts:189-191` | 有 | 有 | 有 | 有 | KEEP | 低 |

---

## 統計

| カテゴリ | IMPLEMENTED | PARTIAL | ABSENT | NOTINCLUDED |
|----------|-------------|---------|--------|-------------|
| 道路 | 9 | 1 | 5 | 0 |
| 骨組み | 11 | 5 | 11 | 2 |
| **合計** | **20** | **6** | **16** | **2** |
