# 09 — Traceability and Evidence Specification

> **Authority:** Phase 2-I (specification freeze)
> **Base:** Phase 1 `06_report_data_source_map.md` §5, `reportModel.ts:301-306` (audit fields), `evidence_matrix.csv`.

## 1. 目的

計算書の**各値がどこから来たか**を追跡できる。Phase 2 は**実装せず**、Report Model が保持すべき証跡フィールドを定義する。

## 2. 現在の証跡フィールド (Phase 1 `reportModel.ts` audit)

`reportModel.ts:300-306` (CH-AUDIT rows) + `reportModel.ts:331-346` (ReportModel.audit):

| field | 現在の値 | 種別 |
|-------|----------|------|
| inputRevision | `draft.generatedAt ?? "STALE_OR_UNGENERATED"` | string |
| inputChecksum | `buildInputChecksum(draft)` | hex |
| quantityChecksum | `computeContentChecksum(quantity)` | hex |
| resultChecksum | `computeContentChecksum({chapters, inputChecksum, quantityChecksum})` | hex |
| stale | `!isBridgeStructureGenerationCurrent(project)` | boolean |
| appCommitSha | `options?.appCommitSha ?? "NOT_CAPTURED_IN_BROWSER"` | string|null |
| schemaVersions | `[REPORT_MODEL_SCHEMA_VERSION, quantity.schemaVersion]` | string[] |
| calculationReferenceIds | `["GOLD-SP-001","GOLD-AN-001","GOLD-QTY-001"]` | string[] |
| formalOkNgEmitted | `false` | boolean |

> ■ Phase 2 ではこれを**概念 R-12 EvidenceSummary** (`08_report_data_contract_boundary.md` R-12) として拡張定義する。**値自体は変更しない**。

## 3. 将来証跡フィールド (Report Model で保持すべき)

| field | type | 現在 | 未来 (Phase 3/6) | 根拠 |
|-------|------|------|------------------|------|
| source_path | string | partical (CH-AUDIT に inputChecksum) | per-value | §4 traceability principle |
| source_symbol | string | n/a | per-value (`reportModel.ts` import パス) | |
| schema_version | string | schemaVersions[] | per-value | |
| report_version | string | REPORT_MODEL_SCHEMA_VERSION | per-value | `reportModel.ts:18` |
| generated_at | string | generatedAt | per-value | `reportModel.ts:326` |
| application_version | string | appCommitSha | per-value | `reportModel.ts:306` |
| commit_sha | string | appCommitSha | build commit | |
| input_revision | string | inputRevision | per-value | `reportModel.ts:301` |
| authorization_status | enum | NOT_GRANTED | per-value (NOT_AUTHORIZED/ADOPTED) | §6 |
| validation_status | enum | complete boolean | complete + issues[] | `reportModel.ts:300,223` |
| human_confirmation_status | enum | n/a | UNRESOLVED/RESOLVED | H-01..H-03 |

## 4. 原則 (traceability principles)

1. **value-level provenance**: 帳票の**各値**は `source_path` + `source_symbol` を持つ。section/value も例外なし。
2. **checksum chain**: `inputChecksum` → quantity/report/drawing/schedule チェーンを `assertIntegratedExportAllowed` で照合 (`outputIntegration.ts:69-73`)。
3. **no value without source**: `source_path` 欠落値は `NOT_AVAILABLE` + `missingReason="NO_SOURCE"`。
4. **human confirmation**: H-01/H-02/H-03 は `human_confirmation_status: UNRESOLVED` でタグ付け。
5. **numeric future-proof**: 将来の数値結果 (CP-3x) は **計算根拠** (formula_id, standard_ref, decision_id, test_evidence, human_approval) を**必ず**保持する。現段階ではこれらは空/NOT_IMPLEMENTED。

## 5. 数値結果の将来証跡 (future numeric result)

> Phase 1 `numericAuthorityGuard.ts` に準拠。

| field | type | 定義 |
|-------|------|------|
| formula_id | string | `verification_equation_register.csv` VER 行 |
| standard_ref | string | R7 条文/表番号 (`道示 R7`) |
| limit_value_id | string | `07_validation_cases.csv` LV 行 |
| test_evidence | string[] | `07_validation_cases.csv` PASS 証跡 path |
| human_approval | `DEC-PHA-xxxx` | セル GRATED 決定記録 |
| solver_trace | string | GATE-NR-02 機械証跡 |

> ■ **現段階**: formula_id/standard_ref/limit_value_id/test_evidence/human_approval は**すべて空** (DS-09 NR-01..05 BLOCKED)。CP-3x は `NOT_AVAILABLE` (U-01)。

## 6. 証跡の粒度

| 粒度 | 対象 | 証跡フィールド | 現在 |
|------|------|----------------|------|
| report | 全体 | ReportMetadata + EvidenceSummary | ✅ (`reportModel.ts:324-347`) |
| chapter | CP-01..25 | chapterId + data_source | ✅ (chapter_matrix.csv) |
| value | CP-07 span length など | source_path/symbol/checksum | ❌ (future) |
| status | NOT_AUTHORIZED 等 | authorization_status + human_confirmation | ✅ (status code) |

## 7. 出力 (evidence in report)

- **summary**: `inputChecksum`(短縮8桁) + `generatedAt` + `appCommitSha` (CP-03/CP-21/CP-25)。
- **detailed**: R-12 EvidenceSummary full (CP-25) + per-chapter `data_source` (chapter_matrix.csv basis) + H-01..H-03 ステータス (CP-23)。
- **evidence_matrix.csv** (`phase1_continuous_bridge_report_inventory/evidence_matrix.csv`) は**Phase 1 成果**であり、Phase 2 report の canonical 証跡索引として参照。

## 8. 変更管理

- 証跡フィールドは Phase 2 で凍結。追加は `DEC-PHA-xxxx` 経由。
- `source_path` は **実装 phase (Phase 3) で実際のファイルパスを埋める**。Phase 2 は field を定義するのみ。

## 9. 状態

- HEAD: 854840b. local == origin/main. clean.
- 本節確定: report/chapter/value/status 4 粒度証跡 + future numeric result 計6フィールド。
