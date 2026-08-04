# 05 — Message style guide (JP1-C)

## Voice

- Short, concrete, action-oriented Japanese
- Prefer「〜してください」for next steps
- Avoid bureaucratic English calques

## Status line template

`{状態}。{理由}。{次の操作}。`

Example:「要再計算。入力が変わったため、3Dを再生成してください。」

## Authorization banner template

1. L1: 開発確認用・未検証 — 設計・施工への使用禁止
2. L2: 数値設計の正式認可はありません（正式認可なし）。
3. L3: NUMERIC_DESIGN_AUTHORIZATION=NOT_GRANTED

## Buttons

- Verb first or clear object+verb:「STLを出力」「詳細編集を開く」
- Destructive: name the object「現在の入力を置き換える」
- Keep allowlisted acronyms (STL, CSV) with Japanese verb

## Warnings vs errors

- 注意: continue possible; confirm
- エラー: stop; fix required
