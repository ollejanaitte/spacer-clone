# 11 — Phase 3 Handoff

> **Authority:** Phase 2-K (handoff)
> **Next step:** STEP 9 / Phase 3 — 連続橋計算書用 Report Model 仕様凍結
> **Current HEAD:** 6ba572d (local == origin/main, clean)

## 1. Phase 3 の目的

> **STEP 9 / Phase 3**
> 連続橋計算書用 Report Model 仕様凍結

`08_report_data_contract_boundary.md` (12 concepts R-01..R-12, 12 principles) と `topic/chapter_matrix.csv` + `output_permission_matrix.csv` を正本入力として、**Report Model の型・変換契約・検証契約**を凍結する。

> ■ **Phase 3 は「いきなり PDF や HTML を実装せず、** まず Report Model の型・変換契約・検証契約を凍結する。**という方針 (§15 冒頭) に従う。**

## 2. Phase 2 正本成果物

| No. | ファイル | 役割 |
|-----|----------|------|
| 00 | `README.md` | Phase 2 purpose/scope/deliverables |
| 01 | `01_phase1_input_review.md` | Phase 1 verdict + 3 human-confirmation items (H-01..03) |
| 02 | `02_report_purpose_and_classification.md` | report classification A/B/C/D/E + formal name |
| 03 | `03_report_chapter_structure.md` | 25 + 5 future D-class chapters, CH-*→CP-* mapping |
| 04 | `chapter_matrix.csv` | 30 chapters × 17 fields |
| 05 | `05_detailed_report_spec.md` | summary 17 + detail D1-D14 items |
| 06 | `06_output_permission_matrix.md` | 30 items × 8 classifications |
| 07 | `output_permission_matrix.csv` | machine-readable permission matrix |
| 08 | `07_warning_and_status_message_spec.md` | mandatory watermark + 10 state codes |
| 09 | `08_report_data_contract_boundary.md` | 12 concepts + 12 principles (Phase 3 input) |
| 10 | `09_traceability_and_evidence_spec.md` | 4 granularity evidence fields + future numeric evidence |
| 11 | `10_acceptance_criteria.md` | 20-item checklist + 9 consistency checks |
| 12 | `11_phase3_handoff.md` | (this) handoff |
| 13 | `completion_report.md` | final |

## 3. Report Model の対象 (Phase 3 実装対象)

- **R-01 ReportMetadata**: schemaVersion / reportId / generatedAt / locale / modes / developmentStatus / use-prohibited / authorizationStatus
- **R-02 ProjectSummary**: projectName / projectId / (designerName? → NOT_IMPLEMENTED, O-18)
- **R-03 BridgeSummary**: bridgeSystem/spanSystem/bridgeLength/width/girderCount/girderDepth/spanCount/supportCount
- **R-04/05 Span/Support Summary** (per-element arrays, role/station/fixity)
- **R-06 GirderSummary** (continuous segments, offset, count)
- **R-07 CrossMemberSummary**, **R-08 GeometrySummary** (solids + STL manifest), **R-09 ValidationSummary**, **R-10 AuthorizationSummary** (DS-09 cells), **R-11 WarningSummary**, **R-12 EvidenceSummary**
- `value_kind` canonical set (§08 §3), `authorizationStatus`/stale/missingReason per value.

## 4. 非対象 (Phase 3 では実装しない)

- 実際の HTML/PDF/CSS 渲染実装 (render は Report Model の外)。
- formal PDF 生成 (`assertFormalReportRejected` 維持)。
- 数値解析結果・断面力・照査判定の実装 (CP-3x = NOT_AVAILABLE / PROHIBITED)。
- H-01/H-02/H-03 の architect 決定 (Phase 3 は仮定として記録)。
- production code / 解析 code / UI 変更 (docs-only 継続)。

## 5. 必須契約 (Phase 3 が凍結すべき)

1. `ReportModel` は `ProjectModel` を直接テンプレートに渡さない (middle layer, §08 principle 1)。
2. `value: number | null` + `display: string` 分離 (principle 2), `unit` 必須 (3)。
3. `source.path/symbol/schemaVersion` per value (4), `authorizationStatus` (5), `stale` (6), `missingReason` (7)。
4. `reportModel.ts:85-92` `row()` 表示規約 (`null → "NOT_AVAILABLE"`, zero-fill 禁止) を踏襲。
5. `reportModel.ts:311-319` chapter order validation を維持。
6. `assertFormalReportRejected` / `assertDevelopmentReportExportable` / `assertIntegratedExportAllowed` ゲートを維持。
7. summary/detail を同一 Report Model から派生 (principle 8)。

## 6. 既存データモデル接続調査 (Phase 3 事前調査)

| 既存 API | 用途 | 結合点 |
|----------|------|--------|
| `getBridgeStructureInputDraft` | draft 取得 | R-03/04/05/06/09/12 |
| `isBridgeStructureGenerationCurrent` | STALE | R-01 stale |
| `buildQuantityModel` | quantity (CP-25) | R-12 / CP-13? |
| `computeGirderSectionProperties` | CH-SECTION | R-06 (CP-13) — **spanLength ガード課題 U-03** |
| `buildApolloVisualizationModelOrThrow` | solids | R-08 |
| `exportApolloBinaryStl` | STL manifest | R-08 |
| `validateBridgeStructureInputDraft` | validation | R-09 |
| `getBridgeStructureUnitWeightAdoption` | adoptionStatus | R-03 + R-10 |
| `buildIntegratedOutputs` | consistency gate | §08 principle 6 |

> ■ **U-03 (spanLength gate) は Phase 3 実装の前提条件**。`computeGirderSectionProperties` を `spanLength`-independent にリファクタリングする（cross-section props はスパン長非依存）。architect H-01/H-02/H-03 判定後に着手。

## 7. テスト方針 (Phase 3)

- `reportModel.test.ts` に **CONTINUOUS** パスを追加 (G-07)。
- `chapter_matrix.csv` のすべての chapter_id が `buildReportModel` から出現することを検証。
- `output_permission_matrix.csv` の PROHIBITED item が report に現れないことを検証。
- `assertFormalReportRejected` が維持されることを検証。
- **数値未承認状態 (`NOT_AUTHORIZED`/`NOT_GRANTED`/`PROHIBITED`/`NOT_AVAILABLE`) を維持**する regression test を追加 (Phase 2 から引き継ぐ)。

## 8. 実装前凍結事項

| 事項 | 凍結場所 |
|------|----------|
| chapter_id set + mapping | `chapter_matrix.csv` (Phase 2-C) |
| output permission | `output_permission_matrix.csv` (Phase 2-F) |
| state codes + warning | `07_warning_and_status_message_spec.md` (Phase 2-G) |
| Report Model boundary | `08_report_data_contract_boundary.md` (Phase 2-H) |
| traceability fields | `09_traceability_and_evidence_spec.md` (Phase 2-I) |
| H-01/H-02/H-03 resolution | **architect (AP-01/AP-02)** — Phase 3 GO 前 |

## 9. GO / NO-GO 条件

### GO
- H-01/H-02/H-03 が architect 解決済み。
- U-03 (spanLength gate) リファクタリング方針が決定。
- `chapter_matrix.csv` / `output_permission_matrix.csv` / `08` / `09` が canonical として凍結済み（Phase 2 完了）。
- local == origin/main, clean。

### NO-GO
- H-01/H-02/H-03 未解決のまま実装着手 (命名混乱リスク)。
- `value_kind`/`authorizationStatus`/`stale` を Report Model から省略した実装。
- formal PDF / 数値結果章を PROHIBITED 超えて実装。
- docs 以外の変更を混入。

## 10. 状態

- HEAD: 6ba572d. local == origin/main. clean.
- 本ハンドオフ確定: Phase 3 は **GO with non-numeric restrictions** (H-01..03 解決待ち)。
