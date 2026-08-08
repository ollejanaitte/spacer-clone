# STEP-1 P06 — Project Replay / Golden Master Design（凍結）

Status: FROZEN（Step2で fixture 構築・自動化）

## 1. Purpose
実案件の線形計算書を案件単位で丸ごと再現する Project Replay と、
その検証に使う Golden Master の仕様を確定する。

単点テストではなく、BP / KA / KE / BC / EC / EBC / EP の station・X / Y / Z / R / A / L
を実資料と突き合わせて PASS / KNOWN / DEFERRED / FAIL で判定する。

## 2. Scope
- Golden Master 候補（実案件）
- fixture 構成
- input provenance（入力の由来・ページ・traceability）
- expected output
- 項目別 tolerance
- 比較方法・判定分類
- whole-project replay 手順
- discrepancy 分類

## 3. Non-scope（Step2で実装しない）
- 自動取込の完全自動化（PDF OCR は半自動・人確認を前提）
- 実測値の無い項目の推定

## 4. Golden Master 候補（確定）

| GM ID | 案件 | 内容 | 由来 | 優先度 |
|-------|------|------|------|--------|
| GM-01 | サンプル LINER 計算書（高架橋） | 水平・縦断・横断・橋梁入力/出力 | SRC-004（リポジトリ内 PDF） | P0 |
| GM-02 | H28 西知多道路（東海JCT）本線・ランプ | BP/KA/KE/BC/EC/EP、R/A/L | SRC-010（X1-5 ROAD_CALC_MAPPING） | P0 |
| GM-03 | サンプル道路線形計算例 | 主要点 station/X/Y/R/A/L | SRC-008（ローカル PDF） | P0 |
| GM-04 | 金沢IC Aランプ橋 縦断 | i=6.000% / VCL=100 / i=0.100% | 監査資料（数値は要照合） | P1 |
| GM-05 | 鋼鈑桁橋 設計計算例 | 主桁格点・支間・張出し長 | SRC-005（ローカル PDF） | P1 |

※ ローカル PDF（SRC-005/008/009）は GitHub 収録不可（著作権）。fixture は数値化した
CSV/JSON のみリポジトリへ収録し、provenance で PDF 所在を記録（既存 X1.5 方針と同様）。

## 5. Fixture 構成（Step2 で確定）
```
backend/tests/fixtures/replay/
  gm01_liner_sample/input.json          … 線形要素・縦断・横断・橋梁設定（実資料由来）
  gm01_liner_sample/expected.json       … 主要点・測点・縦断・橋梁の期待値
  gm01_liner_sample/provenance.md       … 各値のページ・項目 traceability
  gm02_nishichita/... / gm03_road_sample/...
```
- input.json は「実資料から転記した値」のみ。production code から自己生成しない
- expected.json も同様（実資料記載値）
- provenance.md: `[項目] <- 資料ID:ページ:項目名` 形式

## 6. 比較項目と Tolerance（凍結）

| 項目 | 比較 | Tolerance | 備考 |
|------|------|-----------|------|
| station（主要点） | 実資料 vs 計算 | 1e-3 m（表示丸め後一致） | ブレーキ測点は補正を考慮 |
| X / Y | 実資料 vs 計算 | 1e-3 m | 丸め値と内部値を区別 |
| Z（計画高） | 実資料 vs 計算（P01） | 1e-3 m | 縦断区間一致 |
| R | 実資料 vs 計算 | 表示値一致（整数m） | curvature→R逆変換 |
| A（緩和パラメータ） | 実資料 vs 計算 | 1e-3 | クロソイド |
| L（要素長） | 実資料 vs 計算 | 1e-3 | 区間長 |
| grade | 実資料 vs 計算 | 0.001% | 縦断勾配 |
| 格点間距離 / 張出し長 | P03 vs 実資料 | 3e-3 m | GM-05 |

原則:
- 内部計算値は float64 のまま比較（厳密）
- 実資料が表示丸め値（例 X=1234.567）の場合は「丸め後一致」で判定
- 出力丸め値と内部計算値の両方を保持し、どちらで判定したかを記録

## 7. 判定分類（凍結）
| 判定 | 定義 |
|------|------|
| PASS | 全比較項目が tolerance 内 |
| KNOWN | 実資料の記載方法・丸め差が判明しており許容（理由記録） |
| DEFERRED | 実資料/入力が未確定（OCR不明・資料欠落）で後続に持ち越し |
| FAIL | tolerance 外（実装バグ or 入力誤り。要調査） |

- 判定は項目単位で付与し、案件全体サマリを出力
- KNOWN / DEFERRED は必ず理由を ledger に記録

## 8. 比較方法（Step2 想定）
```
backend/tests/replay_runner.py
  for each GM:
     input = load_input(gm)
     result = pipeline(input)          # X4-D + Vertical + Rule + BridgeGeometry
     diff = compare(result, expected, tolerances[gm])
     classify(diff) → PASS/KNOWN/DEFERRED/FAIL
     write report (JSON + human-readable)
```
- pipeline は production API をそのまま使用（別実装しない）
- replay_runner は pytest からも単体でも実行可能

## 9. 自動テスト化
- 各 GM は `test_replay_gmXX.py` として pytest 化
- CI（pytest）で常時実行
- fixture 変更は PR 単位でレビュー

## 10. Discrepancy 分類と対応
- X1-5 DISCREPANCY_LEDGER / UNRESOLVED_EVIDENCE を踏襲
- 新規発生は ledger（CSV）に追記
- BLOCKING は Step2 を止める / NON_BLOCKING は DEFERRED

## 11. Traceability
- SRC-004 サンプルLINER計算書 / SRC-008 サンプル道路線形計算例 /
  SRC-005 鋼鈑桁橋設計計算例 / SRC-010 西知多道路主要点
- X1-5 ROAD_CALC_MAPPING / EVIDENCE_CHAIN_MATRIX
- X4B-P06 / X4C-P06 の既存 replay テスト（拡張元）

## 12. Acceptance criteria（Step2用）
- [ ] GM-01〜05 の fixture（input/expected/provenance）が整備
- [ ] replay_runner が全 GM を PASS/KNOWN/DEFERRED/FAIL で判定
- [ ] 実資料からの自己生成なし（provenance 保証）
- [ ] 全 GM が pytest で実行可能
- [ ] 出力丸め値と内部計算値の区別が明記
