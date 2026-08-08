# Step2 Replay Fixtures — Inventory (STEP-2 S2-UX15)

## Fixture 一覧
| GM | 案件 | input.json | expected | 状態 |
|----|------|-----------|----------|------|
| GM-01 | Hランプ4号橋 (HCL) | gm01_hcl/input.json | 中心線長 + PDF標高 | READY |
| GM-02 | H28 西知多道路（東海JCT） | gm02_nishichita/input.json | R/A/CL (X1-5 FACT) | READY |
| GM-03 | サンプル道路線形計算例 (SRC-008) | — | — | DEFERRED (PDF数値要OCR) |
| GM-04 | 金沢IC Aランプ橋 縦断 (i=6.000%/VCL=100/i=0.100%) | — | — | DEFERRED (実数値要照合) |
| GM-05 | 鋼鈑桁橋 設計計算例 (SRC-005) | — | — | DEFERRED (主桁格点・張出し長 要OCR) |

## Golden Master 原則（Step1 P06 FROZEN）
- expected は実資料から転記（production code から自己生成しない）
- provenance 保持（source / page / item traceability）
- 項目別 tolerance 固定
- PASS / KNOWN / DEFERRED / FAIL 分類

## GM-01 / GM-02 の実数値
- GM-01: 中心線長 164.2476、PDF断面標高7点（X4B/C replay で確定済み）
- GM-02: R=1900 / A=450,550,500 / CL=81.71（X1-5 FACT で確定済み）

## DEFERRED（理由付き）
- GM-03/04/05: ローカルPDF（SRC-005/008）の数値OCRが必要。
  本Step2内で取得を試行し、不能なら DEFERRED を維持（根拠なく推定しない）。
- GM-01 道路幅員・縦断プロファイル: 元PDFに記載なし (UE-003/UE-004)
- GM-02 主要点 X/Y: PDF 参照のみで数値未取得

## 次の実装 (S2-UX16)
- replay_runner: fixture を読み込み production pipeline で計算 → expected と比較
- 判定: PASS/KNOWN/DEFERRED/FAIL
