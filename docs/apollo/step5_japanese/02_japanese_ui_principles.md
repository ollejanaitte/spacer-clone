# 02 — Japanese UI principles (JP1-B)

## Goal

General-user Apollo surfaces use **Japanese as the primary language**. Internal enums, schema keys, diagnostic codes, and persisted values remain English.

## Layers

| Layer | Audience | Content |
|-------|----------|---------|
| L1 | General user | Short Japanese; next action clear |
| L2 | General user | Reason, impact, remedy |
| L3 | Technical | English enum / code / field path (collapsed) |

## Non-negotiables

1. Do not rename English enums or schema keys.
2. Do not delete diagnostic codes.
3. Do not put L3 technical tokens at the top of L1 screens.
4. Do not change formal authorization posture (`NOT_GRANTED`, `PROHIBITED`, etc.).
5. `CROSS_BEAM` ≠ `CROSS_FRAME` (横桁 ≠ 対傾構).
6. Distinguish 上横構 vs 下横構.
7. Never translate `STALE` as merely「古い」.
8. Never translate `BLOCKED` as「ブロック済み」.
9. Never translate `NOT_GRANTED` as「不合格」.
10. `PROHIBITED` must state 設計・施工への使用禁止 (not vague「使用不可」 alone).

## Term status values

- `ADOPTED_UI_LABEL` — use in L1/L2
- `TECHNICAL_ONLY` — L3 / allowlist only
- `DEFERRED` — intentionally postponed (owner required)

## Current-code deltas (do not change code in JP1)

| Internal | Current UI (code) | JP1-B adopted |
|----------|-------------------|---------------|
| BLOCKED | 中断 | 先に必要な作業があります |
| AVAILABLE | 開始可能 | 操作可能 |
| INCOMPLETE | 入力途中 | 入力不足 |
| READY | 実行可能 | 準備完了 |
| STALE | 要再生成 | 要再計算 |
| WARNING | 警告あり | 注意 |
| NOT_AUTHORIZED | 未認可 | 正式認可なし |
| OUT_OF_SCOPE | 範囲外 | 対象外 |

JP2 must adopt glossary labels; JP1 only defines them.

## Deliverables

- `apollo_japanese_glossary.csv` (master)
- `workflow_status_glossary.csv`
- `structural_member_glossary.csv`
- `workflow_step_glossary.csv`
- `authorization_glossary.csv`
- `prohibited_translation.csv`
- `terminology_decision_register.csv`
