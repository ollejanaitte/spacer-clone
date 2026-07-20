# P4-D05 Official Spec Extraction — JIP §8 Confirmation Diagrams

**Date:** 2026-07-21
**Status:** APPROVED — supervisor EXTRACTION gate (2026-07-21)

**Scope parent:** [p4_d05_scope.md](p4_d05_scope.md)
**Phase 4 parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)

---

## 1. Purpose

JIP-LINER マニュアル **§8**（確認図・寸法）から **semantic authority** を分類し、P4-D05 で **採用 / 非採用 / 参考のみ** を凍結する。§8 の図面一覧・印刷 UI の完全再現は **不要**（正本 [phase4_design_document.md](phase4_design_document.md) P4-D05 表が正）。

**D05-C07（LDIST/HAUNCH/HOSO 図面オーバーレイ）:** **N/A** — 監督 amendment または P4-D08 修正まで実装対象外。

---

## 2. Source document

| Field | Value |
| --- | --- |
| File | `マニュアル/JIP-LINER_マニュアル.pdf` |
| Semantic authority | **§8 確認図**, **§8.8 寸法** |
| Print pages (approx.) | p.143+（平面）, p.151（寸法モード） |
| Cross-reference | [p4_d02_ldist_extraction_record.md](p4_d02_ldist_extraction_record.md) §8.8 → D05 参考 |

---

## 3. Adoption matrix（§8 → P4-D05）

| JIP §8 概念 | P4-D05 採用 | 実装先 | 備考 |
| --- | --- | --- | --- |
| 平面図 IP / BC / EC | **採用** | `formalBuilders` plan annotations | 緩和曲線は KA/KE |
| 平面図 寸法線（直線部） | **採用** | `alignmentSegmentDimensions` | 曲線部は R 注記 |
| 平面図 座標表 | **採用** | `planCoordinateTable` | Type A/B パターン |
| 縦断図 設計線・勾配 | **採用** | profile layer + band `grade` | pipeline 由来 |
| 縦断図 VCL / BVC-EVC | **採用** | profile band `verticalCurve` | 地盤線は **非採用（合成禁止）** |
| 地盤標高・地盤線 | **明示 unavailable** | `groundLineUnavailable` | D05-C04 |
| 横断図 測点断面 | **採用** | `createCrossSectionDrawingBuilder` | station-driven |
| 横断勾配 | **採用** | cross-section title + band `crossfall` | active alignment pipeline |
| 帯シート 拡幅 | **unavailable** | band `widening` → `—` | D05-C05；PR-24 deferred |
| LDIST 寸法オーバーレイ | **N/A** | — | D05-C07 |
| HAUNCH 図面注記 | **N/A** | — | D05-C07 |
| HOSO 図面注記 | **N/A** | — | D05-C07 |
| §8 印刷ダイアログ完全 UI | **非採用** | Formal Drawing print/DXF（Phase 3） | 製品 UI は既存 workspace |
| `.lin` 図面ブロック | **非採用** | RDD + runtime `DrawingDocument` | 記録のみ無視 |

---

## 4. §8.8 寸法モード（参考）

| JIP 概念 | 分類 | P4-D05 |
| --- | --- | --- |
| ライン間寸法（垂直 vs セクション上） | LDIST と概念共有 | D05 では plan 直線寸法のみ；LDIST オーバーレイは N/A |
| 寸法スタイル・レイヤ | 参考 | CAD layer presets 既存 |

---

## 5. UI entry semantics（正本凍結）

| Surface | JIP 相当 | プロジェクト決定 |
| --- | --- | --- |
| 確認図 primary | §8 図面ビュー | `/pro/liner/drawings/*` |
| 確認図 secondary | — | `LinerPreviewPage` → Formal Drawing link |
| Setup review | 橋梁配置（別モジュール） | Bridge Layout only；§8 平面図 **移設禁止** |

---

## 6. Ground and widening policy（fail-closed）

| Quantity | Rule | Evidence key |
| --- | --- | --- |
| Ground elevation / ground line | **Never fabricate** | `ja.liner.formalDrawing.groundLineUnavailable` |
| Widening band values | **Always unavailable (`—`)** until widening slice approved | `bandRows.widening` + `bandRows.unavailable` |

---

## 7. D05-C07 explicit N/A record

| Overlay type | Status | Rationale |
| --- | --- | --- |
| LDIST result annotations on plan/profile | **N/A** | Optional per freeze；D08 amendment only |
| HAUNCH elevation overlays | **N/A** | Same |
| HOSO thickness overlays | **N/A** | Same |

**Not required for P4-D05 COMPLETE** when N/A per [phase4_completion_gate.md](phase4_completion_gate.md).

---

## 8. Extraction completeness

| Gate | Status |
| --- | --- |
| §8 semantic classification | **COMPLETE**（本書） |
| Numeric formula extraction | **Not required** for D05（diagram display from existing pipeline） |
| D05-C07 overlays | **N/A documented** |
