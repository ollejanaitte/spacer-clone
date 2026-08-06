# Phase 3 — 連続橋計算書用 Report Model 仕様凍結 (docs-first)

> **Authority:** STEP 9 — Phase 3 (Report Model specification freeze)
> **Phase 2.5 正本入力:** `docs/apollo/step9/phase2_5_phase3_blocker_resolution/` (COMPLETE); `final_report.txt` Phase 2.5 block.
> **結果:** 仕様凍結のみ / Report Model 実装・TypeScript型追加・変換ロジック・HTML/PDF/印刷/UI/図面/数値解析へは着手しない。

## Phase 3 の目的

STEP 9 / Phase 2.5で解除された Phase 3 開始前ブロッカーの判断結果を正本入力として、**連続橋（continuous girder）の設計計算書**用 **Report Model の仕様**—責務・エンティティ・章ペイロード契約・ステータス・認可・validation・欠損データ・単位・精度・証跡・legacy・summary/detail projection・validation rules—を**文書として凍結**する。

- **Report Model の実装、TypeScript 型定義の追加、変換関数実装、HTML/PDF/印刷実装、UI 変更、図面出力、数値解析機能追加は行わない (docs-first)。**
- 生データ (`value`) と表示値 (`display`) を**必ず分離**し、数値未承認状態を**絶対的に維持**する。

## docs-first の意味

- Report Model の**型・変換契約・検証契約**を文書で先に凍結する。
- 実装は Phase 4 (STEP 9 / Phase 4: Report Model 型・変換器・validator実装) で行う。Phase 4 は本 Phase 3 仕槰を正本に実装する。
- Phase 4 開始前に、Phase 3 仕様が完全に凍結されていなければならない。

## 対象

- 対象ブリッジ System: `BridgeSystem.CONTINUOUS`（2–5 spans）。
- 帳票種別: **非数値確認帳票**（入力条件確認／構造モデル確認）。将来の数値設計計算書枠も定義する。
- データソース: `frontend/src/apollo/` (`apolloBridgeStructureInput`, `apolloBsdd`, visualization/STL, `reportModel.ts` scaffold, `sectionProperties.ts`, `layoutValidation.ts`, `generateBsdd.ts`, `artifactBundle.ts`) および `backend/` (IF3 result export)。**現行実装**を正本とする。

## 非対象

- Report Model 実装 / TypeScript 型実装 / 変換関数実装。
- HTML/CSS/PDF/印刷実装 (`render*` は Report Model の外)。
- UI 変更。図面出力 (continuous design drawings 含む)。
- 数値解析結果・加工・照査実行・設計成立判定の実装。
- Phase 1/2/2.5 成果物の根拠なき上書き（矛盾は `CONFLICTING_EVIDENCE` として記録）。
- `BridgeSystem.SIMPLE_SINGLE` / `SIMPLE_MULTIPLE` の帳票仕様（別ケース）。

## 成果物一覧

| No. | ファイル | フェーズ | 役割 |
|----|----------|----------|------|
| 00 | `README.md` | A | 本ファイル |
| 01 | `01_phase2_5_input_review.md` | A | Phase 2.5 判定確認 + GO/NO-GO |
| 02 | `02_report_model_responsibility.md` | B | 責務境界 (do/do-not) |
| 03 | `03_domain_to_report_mapping.md` | C | domain→Report Model 変換境界 |
| 04 | `report_entity_matrix.csv` | C/D | entity 一覧 + source mapping |
| 05 | `04_report_model_entity_spec.md` | D | エンティティ仕様 (R-01..R-12相当) |
| 06 | `05_chapter_payload_contract.md` | E | CP-* 章ペイロード契約 + projection |
| 07 | `chapter_payload_matrix.csv` | E | CP-* × fields machine-readable |
| 08 | `06_status_and_authorization_contract.md` | F | status code + 認可契約 |
| 09 | `status_code_matrix.csv` | F | status code 一覧 |
| 10 | `07_validation_and_missing_data_contract.md` | G | validation + 欠損表現 |
| 11 | `08_units_precision_and_display_contract.md` | H | unit/precision/display |
| 12 | `09_traceability_and_versioning_contract.md` | I | 証跡・バージョン |
| 13 | `10_legacy_and_compatibility_contract.md` | J | legacy JSON / compatibility |
| 14 | `11_summary_detail_projection_contract.md` | K | summary/detail projection |
| 15 | `12_report_model_validation_rules.md` | L | Report Model validation rules |
| 16 | `13_phase4_acceptance_criteria.md` | M | Phase 4 受入条件 |
| 17 | `14_phase4_handoff.md` | N | Phase 4 引き継ぎ |
| 18 | `completion_report.md` | O | 最終 |

## 読み順

00 → 01 → 02 → 03(+04 csv) → 05(+04 csv update) → 06(+07 csv) → 07(06 status_code_matrix) → 08 → 09 → 10 → 11 → 12 → 13 → 14 → completion_report

## CP-* canonical / CH-* deprecated

- **CP-\*** (`chapter_matrix.csv` CP-01..CP-25 + CP-30..34) が Report Model の**正本章ID**。
- **CH-\*** (`reportModel.ts:25-42` scaffold, 16 章) は**deprecated alias**。Phase 4 実装で CP-* に移行し、CH-* を新規 canonical ID に**使用しない**。CH-*→CP-* 移行表は `03_domain_to_report_mapping.md` / `06_status_and_authorization_contract.md` に記録。

## 非数値制約 (維持)

- 帳票に掲載するすべての数値は `NOT_AUTHORIZED`/`NOT_GRANTED`/`UNVERIFIED`/`NOT_AVAILABLE`/`NOT_IMPLEMENTED` のいずれか。
- `ADOPTED`/`AUTHORIZED` といった承認済み数値を**新規作成・入力・表示しない**。
- `07_warning_and_status_message_spec.md` (Phase 2-G) で凍結する警告文により、利用者が「非数値確認帳票」であることを見間違えないようにする。

## 明示的禁止 (Phase 2.5 で再確認済)

- `formal PDF` の生成: **PROHIBITED** (`assertFormalReportRejected` 維持)。
- `continuous design drawings` の出力: **PROHIBITED** (until Phase 6; H-03 ADOPTED).
- 数値結果 (CP-15/16/30..34, O-19..O-30): PROHIBITED / NOT_AVAILABLE。

## 作業方式

- `main` ブランチ直 push。`git add` は対象ファイルのみ明示。1 章/サブステップごとに 1 commit / 1 push。
- `git diff --check` を各コミット前に実施。local main と origin/main の一致を各コミット後に確認。
- `final_report.txt` を各サブステップ完了時に更新。
- AGENTS.md 破棄操作全禁止を厳守。

## 仕様凍結の意味

- **freeze** = 仕様として記述・相互整合を取り、今後**変更はドキュメントレビューでのみ**行う (コード実装による裏からけはない)。
- Report Model の責務・エンティティ・章契約・ステータス・validation・単位・証跡・legacy・projection は **Phase 3 で決定した値を Phase 4 実装の正本**とする。
- 数値未承認状態 (`NOT_AUTHORIZED`/`NOT_GRANTED`/`PROHIBITED`/`NOT_AVAILABLE`/`NOT_IMPLEMENTED`) は**凍結対象に含まれない**。常に未承認のまま維持する。

## 状態

- HEAD: 89b01ae (Phase 2.5 COMPLETE)。
- Baseline: 89b01ae (local == origin/main, clean)。
- 本Phase: IN_PROGRESS。
