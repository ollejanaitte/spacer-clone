# UX-REAUDIT P08 — Backend-UI Contract Crosscheck（凍結）

Status: FROZEN（VERIFIED）

## 1. Purpose
UX-P01〜P07 で定義した各画面・入力・模式図が、
既存 backend API / frontend 計算エンジン / Step1 設計（X4-D / Vertical / Rule /
BridgeGeometry / Output / 3D / Replay）と矛盾なく接続できることを確認する。
既存 API を不必要に増やさない。

## 2. 現状アーキテクチャ（確認）
- backend: FastAPI（backend/app/main.py）+ rule_engine（X4-A/B/C/D）+ engine（構造解析等）
- frontend: LinerDraft（schema/types.ts）→ headless 計算（core/*）→ adapter（linerViewer/linerPreview/linerUi）→ UI
- frontend は計算エンジン（core）を同梱し、backend とは構造解析・IF3・帳票等で接続

## 3. 画面 ↔ API / Entity 接続表（BACKEND_UI_CONTRACT_MATRIX・凍結）

| Screen | 入力 (frontend) | 計算 (frontend core / backend) | 出力・模式図 | 状態 |
|--------|-----------------|--------------------------------|--------------|------|
| H-ALIGN (UX-P01) | HorizontalElementDraft | core/geometry/horizontal + X4-B（主要点） | LinerGridPreview（PLAN） | 既存coreで充足。主要点はX4-B/Step2で backend 供給可能 |
| V-PROF (UX-P02) | VerticalElementDraft | core/verticalSampling / Step2 P01 backend | VerticalProfileChart（PROFILE） | 既存core + Step2 P01 backend で充足 |
| X-SECT (UX-P03) | CrossSectionTemplateDraft / WidthChangePointDraft / CrossSlopeIntervalDraft | core/crossSection* / X4-C | CrossSectionPreview（SECTION） | 既存coreで充足。Rule（Step2 P02）は backend |
| B-BRIDGE (UX-P04) | PierDraft / SpanDraft | core/bridge + Step2 P03 backend | BridgeLayoutEditor（PLAN） | BridgeLayoutEditor 既存。Step2 P03 backend へ拡張 |
| O-OUTPUT (UX-P05) | 計算結果 | Step2 output（backend） | DrawingDocumentSvg / exports | 既存 frontend exports + Step2 output |
| O-REPLAY (UX-P05) | fixture | Step2 replay_runner（backend） | 表+図 | Step2 新規 |
| 3D (Step3) | BridgeGeometry3dPayload | Step2 geometry3d（backend） | Three.js | Step2 payload → Step3 描画 |

## 4. 既存 API の追加方針（凍結）
- 既存の X4-D RoadGeometryAPI / X4-A/B/C / Step1 設計を**正本として維持**し、追加を最小化
- 追加候補（Step2 で backend に新設）:
  - vertical solver API（Step2 P01）
  - rule evaluation 接続（Step2 P02-P05: 既存 Rule Engine に追加登録）
  - bridge_geometry API（Step2 P03）
  - output API（Step2 P04: format/tables/reports/dxf）
  - geometry3d payload API（Step2 P05）
  - replay_runner API（Step2 P06）
- いずれも「既存計算コアへの委譲 + 整形」であり、数値計算の重複実装をしない

## 5. frontend/backend 責務境界（再確認）
- frontend: LinerDraft 入力・模式図表示・ライブプレビュー・印刷・出力 UI
- backend: 正式計算（vertical/rule/bridge/output/replay）と計算書・DXF の生成
- ライブプレビュー（INPUT/VALIDATED）は frontend の簡易計算（近似可）、
  CALCULATED RESULT は backend（または frontend core の production 計算）— UX-P06 の3状態に整合
- 数値の正本は backend / frontend core（既存実装）。UI は表示のみ

## 6. 診断・エラー連携
- frontend: LINER_DIAGNOSTIC_CODES（既存）を図中エラー表示に使用
- backend: 各 API のエラー契約（RangeError / validation / CONTRACT_ERROR）を
  frontend 診断コードへマッピング（エラーコード対応表を Step2 で定義）
- replay の PASS/KNOWN/DEFERRED/FAIL は backend 判定 → frontend 表示（Step2 P06）

## 7. データフロー整合チェック結果
- 水平/縦断/横断/橋梁の入力は全て frontend LinerDraft（既存 schema）を正本
- X4-D は計算正本として backend/frontend core 両方で利用可能（既存）
- 3D は Step2 geometry3d payload を経由（UX-P05 と整合）
- Replay は fixture（実資料）→ backend pipeline → 表+図表示（Step2 P06）

## 8. Acceptance Criteria
- [ ] 全画面が既存 API / Entity と矛盾なく接続可能（本 matrix）
- [ ] 新規 API は最小追加（vertical/rule/bridge/output/geometry3d/replay のみ）
- [ ] 数値計算の重複実装なし（既存コアへ委譲）
- [ ] エラーコード連携表が定義済み（Step2）
- [ ] X4-A/B/C/D に退行なし

## 9. Traceability
- backend/app/main.py / backend/rule_engine/*（X4系）
- frontend/src/liner/{schema,core,adapters,headless,components,pages}
- Step1 P01〜P07
- UX-P01〜P07
