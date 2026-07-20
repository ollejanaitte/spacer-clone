# P4-D05 Scope — Review Diagrams and Utilities UI

**Date:** 2026-07-21
**Status:** AUTHORITATIVE — `P4_D05_SCOPE_VERDICT: APPROVED` (2026-07-21, supervisor message)

**Extraction record:** [p4_d05_official_spec_extraction.md](p4_d05_official_spec_extraction.md) — **APPROVED** (EXTRACTION gate; JIP §8 semantics reference only)

**Authoritative parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)
**Execution plan:** [phase4_d03_to_final_execution_plan.md](phase4_d03_to_final_execution_plan.md)
**Pattern reference:** [p4_d04_scope.md](p4_d04_scope.md)
**P4-D01 baseline:** multi-alignment COMPLETE
**P4-D04 baseline:** `77173c4a` — HOSO COMPLETE (P4-D04)

---

## 1. D-step ID と正式名称

| 項目 | 値 |
| --- | --- |
| **D-step ID** | **P4-D05** |
| **正式名称** | **Review Diagrams and Utilities UI**（確認図・ユーティリティ UI） |

Phase 4 正式名称 **Road Advanced Calculation & Utilities** の第 5 実装ステップ。JIP-LINER **§8** の確認図意味論を参考に、**Formal Drawing workspace** を一次入口として平面・縦断・横断・帯シートを強化する。Setup **review** タブは **Bridge Layout のみ**（変更禁止）。

| 正本ラベル | 意味 |
| --- | --- |
| P4-D01 | Multiple Alignment and Line Management（前提完了） |
| P4-D02..D04 | LDIST / HAUNCH / HOSO（図面オーバーレイは D05-C07 **N/A**） |
| **P4-D05** | **Review Diagrams and Utilities UI（本スコープ）** |
| P4-D06 | Reports and CSV |
| P4-D07 | Persistence / Legacy / Migration |
| P4-D08 | E2E and Final Verification |

---

## 2. 目的

P4-D01 で確立した **active alignment** を前提に、確認図（plan / profile / cross-section / band sheet）を **Formal Drawing workspace**（`/pro/liner/drawings/*`）で提供し、Preview は二次導線とする。`DrawingDocument` はランタイム再生成のみ。

成功基準（正本 completion gate D05-C01..C07）:

| ID | 要点 |
| --- | --- |
| D05-C01 | Review tab = Bridge Layout only（確認キャンバス追加禁止） |
| D05-C02 | Formal Drawing primary `/pro/liner/drawings/*` |
| D05-C03 | `DrawingDocument` 非永続；reload regenerate |
| D05-C04 | Ground profile explicit unavailable |
| D05-C05 | Widening band row unavailable |
| D05-C06 | Preview secondary link/banner to Formal Drawing |
| D05-C07 | LDIST/HAUNCH/HOSO diagram overlays — **N/A**（監督 amendment まで） |

---

## 3. 対象（In scope）

### 3.1 図面強化（必須）

| 図面 | 強化内容 |
| --- | --- |
| **Plan** | IP / BC/EC（KA/KE）マーカー、直線部寸法、座標表（`alignmentSegmentDimensions`, `planCoordinateTable`） |
| **Profile** | 勾配、VCL、縦断曲線インジケータ；地盤 band **unavailable** 明示 |
| **Cross-section** | 測点駆動断面、横断勾配表示；active alignment パイプライン連携 |
| **Band sheet** | 横断勾配値；拡幅行 **unavailable** |
| **Preview（二次）** | Formal Drawing へのバナー／リンク |

### 3.2 UI 入口（凍結）

| 役割 | パス / コンポーネント |
| --- | --- |
| **Primary** | `/pro/liner/drawings/plan`, `/profile`, `/cross-section` — `LinerFormalDrawingWorkspacePage` |
| **Secondary** | `LinerPreviewPage` — Formal Drawing への導線（primary 代替不可） |
| **Review tab** | `BridgeLayoutEditor` + diagnostics（**確認図キャンバス禁止**） |

### 3.3 永続化

| 項目 | 方針 |
| --- | --- |
| `drawingSettings` | RDD geometry extension 経由 round-trip（Phase 3 パターン） |
| `DrawingDocument` | **保存禁止**；`buildFormalDrawingWorkspaceDocuments` で再生成 |
| `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` | **0.1.0 維持** |

### 3.4 i18n

- `setupTabPlaceholder.review` の stale 「Phase 4.0-2」文言を P4-D05 意図に更新
- Preview Formal Drawing 通知コピー追加

### 3.5 検証

- `formalBuilders.test.ts` — plan/profile/cross/band ビルダー（D05-C02, C04, C05）
- `drawingSettingsPersistence.test.ts` — D05-C03 パターン
- `LinerEditPage.test.tsx` — D05-C01 regression
- `LinerPreviewPage.test.tsx` — D05-C06
- E2E: review tab guard + formal drawing routes（feasible 時）

---

## 4. 非対象（Out of scope）

| 項目 | 理由 |
| --- | --- |
| LDIST/HAUNCH/HOSO 図面オーバーレイ | D05-C07 **N/A** |
| Review tab への確認図キャンバス | D05-C01 違反 |
| 地盤プロファイルの合成表示 | 凍結ポリシー（fabrication 禁止） |
| 拡幅 band 数値 | widening slice deferred |
| `DrawingDocument` / `domainDraft` canonical persistence | 凍結ポリシー |
| `schemaVersion` bump | 別承認まで禁止 |
| JIP §8 図面一覧の完全再現 | 正本 D05 表が正；§8 は意味論参考のみ |
| CSV/HTML ダウンロード UI | P4-D06 |
| Playwright 最終ゲート一式 | P4-D08 |

---

## 5. 依存関係

| 上流 | 理由 |
| --- | --- |
| P4-D01 | active alignment → cross-section / diagram scope |

**不要:** D02/D03/D04 numeric COMPLETE（並行可）

**下流:** D06（export controls on Formal Drawing header）、D08（P4-E2E-04/05）

---

## 6. 公式仕様ソース

| Source | Section | Use |
| --- | --- | --- |
| JIP-LINER manual | **§8**, **§8.8** | 寸法・確認図意味論（参考；完全 parity 不要） |
| [phase4_design_document.md](phase4_design_document.md) | P4-D05 | Primary/secondary entry, enhancement table |
| [formal_drawing_ui_design.md](../output/formal_drawing_ui_design.md) | — | Formal drawing UI patterns |
| [phase4_completion_gate.md](phase4_completion_gate.md) | D05-C01..C07 | COMPLETE criteria |

---

## 7. 実装エリア（推定）

| Area | Path |
| --- | --- |
| Formal builders | `frontend/src/liner/drawing/builders/formalBuilders.ts` |
| Dimensions / tables | `dimensions/alignmentSegmentDimensions.ts`, `tables/planCoordinateTable.ts` |
| Workspace | `frontend/src/liner/pages/LinerFormalDrawingWorkspacePage.tsx` |
| Preview link | `frontend/src/liner/pages/LinerPreviewPage.tsx` |
| Review guard | `frontend/src/liner/pages/LinerEditPage.tsx`, `BridgeLayoutEditor.tsx` |
| i18n | `frontend/src/i18n/ja.ts` |
| Tests | `formalBuilders.test.ts`, `drawingSettingsPersistence.test.ts`, page tests |

---

## 8. リスク

| Risk | Mitigation |
| --- | --- |
| Phase 5 drawing docs との重複 | P4-D05 列挙分のみ拡張；Phase 5 再定義禁止 |
| D05-C07 が D08 で要求 | 監督 amendment まで N/A 維持 |
| 大規模 drawing diff | 既存 Phase 3 builders 拡張；最小差分 |

---

## 9. COMPLETE 判定

監督 COMPLETE 候補条件:

1. 本 SCOPE + EXTRACTION + IMPLEMENTATION PLAN が AUTHORITATIVE
2. D05-C01..C06 の required evidence / tests 充足
3. D05-C07 は **N/A** として記録
4. 品質: `typecheck`, `lint`, `build`, drawing/pages tests, `test:regression` PASS
5. commit/push は別指示（本ゲートでは実施しない）
