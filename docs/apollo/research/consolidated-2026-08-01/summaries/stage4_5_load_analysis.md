# Stage 4 Part 5 — Load / Analysis / Analyzer

## Verdict
```text
APOLLO_STAGE4_PART5_LOAD_ANALYSIS_VERDICT: COMPLETE
```

## Counts
- rows: 51
- Evidence (exact/keyword verified): 32
- Interpretation: 11
- Unknown category placeholders: 8 → ['dead_load', 'load_case', 'load_combination', 'section_force_interpolation', 'reaction', 'displacement', 'warning', 'error']

## Key Evidence
- 解析データ作成 / 構造解析 / 断面力変換 の一連 — MAN-007, MAN-002
- 面/線/点荷重 — MAN-005
- たわみ剛比 — MAN-010

## Non-blocking unknowns
- Analyzer 物理ファイル形式（拡張子未記載）
- load_case / load_combination / reaction / displacement の独立章抽出不足（関連機能は存在）
