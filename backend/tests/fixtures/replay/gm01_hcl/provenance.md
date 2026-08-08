# GM-01 Hランプ4号橋 (HCL) — Provenance

## Source
- 001_サンプル_LINER計算書_高架橋_入力結果_出力結果.PDF (SRC-004)
- frontend/src/liner/importer/sample/builtInSampleDataset.ts

## Traceability
| 項目 | 値 | 由来 |
|------|-----|------|
| 中心線長 | 164.2476 m | SRC-004 PDF 中心線長 / builtInSampleDataset.ts |
| 断面標高 PH12 | 17.6595 @ 0.0000 | SRC-004 PDF 横断面1 |
| 断面標高 GE1 | 17.6550 @ 0.5897 | SRC-004 PDF 横断面2 |
| 断面標高 S1 | 17.6304 @ 0.6399 | SRC-004 PDF 横断面3 |
| 断面標高 C1 | 17.5903 @ 8.3121 | SRC-004 PDF 横断面5 |
| 断面標高 C2 | 17.5200 @ 16.2403 | SRC-004 PDF 横断面6 |
| 断面標高 C3 | 17.4500 @ 24.1779 | SRC-004 PDF 横断面7 |
| 断面標高 C4 | 17.3800 @ 32.1547 | SRC-004 PDF 横断面8 |

## Discrepancy 分類
- 道路幅員: DEFERRED (OCR_LIMITED 標準横断図 UE-004)
- 縦断プロファイル: DEFERRED (縦断図は別資料 UE-003)

## 既存replay実績
- X4B-P06 test_alignment_p06_replay.py
- X4C-P06 test_crosssection_p06_replay.py
