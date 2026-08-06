# SOURCE_REFERENCE_INDEX

調査成果物（本ディレクトリ配下）の出所を、元調査ホーム
`~/Projects/liner-future-research` の対応パスと対応付けます。
この統合ディレクトリ内のファイルは、元調査ホームからの「文献的複製」であり、
逐次管理は `INTEGRATION_MANIFEST.csv`(sha256) で行っています。

## 対応表

| 統合先ファイル(本ディレクトリ相対) | 出所(調査ホーム) |
|---|---|
| `origin-README.md` | `README.md` |
| `STATUS.md` | `STATUS.md` |
| `research_log.md` | `research_log.md` |
| `open_questions.md` | `open_questions.md` |
| `final_report.txt` | `final_report.txt`（パス汎化済み） |
| `source_manifest.csv` | `source_manifest.csv`(パス汎化済み) |
| `evidence_register.csv` | `evidence_register.csv` |
| `matrices/current_system_inventory.csv` | `matrices/current_system_inventory.csv` |
| `matrices/gap_matrix.csv` | `matrices/gap_matrix.csv` |
| `matrices/jip_liner_feature_inventory.csv` | `matrices/jip_liner_feature_inventory.csv` |
| `research/00_preflight_report.md` | `research/00_preflight_report.md`(パス汎化済み) |
| `research/01_jip_liner/jip_liner_data_entities.md` | 同左 |
| `research/01_jip_liner/jip_liner_feature_inventory.md` | 同左 |
| `research/01_jip_liner/jip_liner_inputs_outputs.md` | 同左 |
| `research/01_jip_liner/jip_liner_workflow.md` | 同左 |
| `research/02_current_system/current_system_audit.md` | 同左 |
| `research/03_gap_analysis/gap_analysis.md` | 同左 |
| `research/04_user_workflow/user_workflow.md` | 同左 |
| `research/05_gui_concepts/external_reference_review.md` | 同左 |
| `research/05_gui_concepts/future_ux_concepts.md` | 同左 |
| `research/06_editor2d/editor2d_architecture.md` | 同左 |
| `research/07_upper_structure_integration/upper_structure_integration.md` | 同左 |
| `research/08_special_alignment/special_alignment.md` | 同左 |
| `research/09_integration/consistency_and_quantitative.md` | 同左 |
| `roadmap/roadmap.md` | `roadmap/roadmap.md` |

## コピー判定の分類

- **COPY**: 内容そのまま取り込み（sha256 一致）。
- **COPY_WITH_REDACTION**: ローカル絶対パス/ユーザー名を汎化・削除して取り込み。

分類は `INTEGRATION_MANIFEST.csv` の `copy_decision` 列に一覧掲載済み。