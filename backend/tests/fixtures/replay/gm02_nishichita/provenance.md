# GM-02 H28 西知多道路（東海JCT）— Provenance

## Source
- docs/liner/research/phase-x1-5-project-evidence/ROAD_CALC_MAPPING.csv (SRC-010)
- 元資料: H28 西知多道路 線形計算書（本線 1732-1810 / ランプIP計算書 3869-3960）

## Traceability
| 項目 | 値 | 由来 (ROAD_CALC_MAPPING) |
|------|-----|------|
| 本線 R | 1900 m | RC-001 (本線主要点) |
| ランプ R | 520 / 320 / 1983 / 1000 | RC-002 (専用ONランプ主要点) |
| 緩和 A | 450 / 550 / 500 | RC-003 (本線主要点 KA/KE) |
| ランプ CL | 81.71 (R=520, IA=9-00-12) | RC-004 (IP計算書) |
| 測点体系 | 測点ピッチ20, 開始24+19.95 | RC-005 |
| ブレーキ測点 | 112+15.121→112+14.868 (-0.253) | RC-006 |

## Discrepancy 分類
- 主要点 station/X/Y 実測値: DEFERRED (PDF 参照のみで数値未取得)
- 縦断・横断勾配: DEFERRED (別資料)

## 検証方針
- R / A / CL は X1-5 で CONSISTENT (FACT) 確定 → replay 照査対象
- 主要点 X/Y は PDF 数値取得後に追加 (Step2 内で取得不能なら DEFERRED 維持)
