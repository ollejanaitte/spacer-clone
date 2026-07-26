# Stage 4 Feature Extraction Report

## Verdict
```text
APOLLO_STAGE4_FEATURE_EXTRACTION_VERDICT: COMPLETE
PROCESS_DEVIATION: REMEDIATED
DEVIATION_IMPACT_ON_RESEARCH_OUTPUTS: NONE_CONFIRMED
```

## Process deviation（隠さない）
- MiMo（`MIMO-STAGE4-7-001`）による指定外ファイル作成が **1件** あった: `manual-research/work/stage4_7_process.py`
- Grok が検出した
- Grok が指定外ファイルを削除した
- 許可された成果物（CSV 3件）だけが残っていることを確認した
- 正式成果物を Grok が再検収した（是正クローズ時、MiMo再実行なし）
- 技術的成果物への影響は確認されなかった
- プロセス逸脱は是正済み（`logs/stage4_process_deviations.md` / DEV-S4-001）
- 再発防止策を同ファイルに記録した（出力許可リスト明示、スクリプト作成禁止）

## Part verdicts
| Part | Verdict |
|---|---|
| 1 | COMPLETE |
| 2 | COMPLETE |
| 3 | COMPLETE |
| 4 | COMPLETE |
| 5 | COMPLETE |
| 6 | COMPLETE |
| 7 integration + remediation closeout | COMPLETE（逸脱是正済み） |

## Integration counts
- feature_catalog rows: **281**
- classification: Evidence **240** / Interpretation **16** / Unknown **25**
- header: 36 columns（共通スキーマ一致）
- feature_id duplicates: **0**
- Grok re-verified Evidence samples: **30**（各Part 5件；是正クローズでは再実行せず結果を採用）
- alias links: `feature_aliases.csv`
- conflicts: `feature_conflicts.md`（未解消のまま保持）
- unknowns: `unresolved_features.md`（Blocking Unknown なし）

## MiMo delegated
- STAGE4-1..6 slim extracts
- STAGE4-7-001 duplicate/unknown/category aggregates（許可CSV 3件）
- 指定外: `stage4_7_process.py` → 削除・是正クローズ済み

## Handoff
- Stage5: `features/stage5_traceability_candidates.csv`
- Stage6: `oss-mapping/stage6_mapping_candidates.csv`
- Stage7 RB: `validation/stage7_reference_bridge_input_candidates.md`

## Originals / OSS / Git
- PDF size mismatch: **0**
- SHA-256 sample: **match**
- OSS/Git: untouched（`.git` absent）
