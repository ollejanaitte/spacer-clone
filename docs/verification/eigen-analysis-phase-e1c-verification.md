# 固有値解析 Phase E-1c 検証記録

## 検証目的

Phase E-1b で追加した以下の結果項目が、実務利用上信用できる状態であることを確認する。

- `totalMassByDirection`
- `effectiveMasses`
- `cumulativeEffectiveMassRatios`
- `eigen_modes.csv`

本フェーズでは新機能追加は行わず、有効質量・累積参加率・CSV 出力の信頼性を高めるための最小限の自動テスト追加と検証記録作成を目的とする。

## 検証対象

- `backend/engine/eigen.py`
- `backend/tests/test_eigen_analysis.py`
- `schemas/result.schema.json`
- `frontend/src/results/resultViewModel.ts`
- `frontend/src/components/ResultsPanel.tsx`
- `frontend/src/exports/resultCsvExport.ts`
- `docs/design/eigen-analysis.md`
- `docs/design/result-schema.md`

## 自動テストで強化した観点

### Backend

- 複数モードで `cumulativeEffectiveMassRatios` がモード順に累積されること。
- X/Y/Z 全方向で `effectiveMasses = effectiveMassRatios * totalMassByDirection` と整合すること。
- `totalMassByDirection` が 0 の方向で、有効質量比・有効質量・累積有効質量比が 0 となり、NaN/inf が出ないこと。
- backend の `eigen_modes.csv` ヘッダーが E-1b の列順を維持すること。

### Frontend

- 旧 result で `totalMassByDirection` / `effectiveMasses` / `cumulativeEffectiveMassRatios` が欠落しても ViewModel が壊れないこと。
- 旧 result の optional 欠落値を `eigen_modes.csv` で空欄として扱うこと。
- frontend の `eigen_modes.csv` ヘッダーが E-1b の列順を維持すること。

## 自動テスト結果

2026-06-08 に以下を実行した。

- `pytest -q`: PASS
- `npm.cmd test`: PASS
- `npm.cmd run build`: PASS

`npm.cmd run build` では Vite の chunk size warning が表示されたが、E-1c の検証対象機能に対する失敗ではない。

## 手動確認結果

ユーザー動作確認済み。

確認済み内容:

- 固有値解析実行
- 結果画面表示
- 方向別総質量表示
- 有効質量表示
- 有効質量比表示
- 累積有効質量比表示
- `eigen_modes.csv` 出力

## 未対応事項

本フェーズでは以下を実装しない。

- 応答スペクトル解析
- CQC
- PDF 出力拡張
- schema 変更
- UI 大改修
- 固有値解析ロジック変更

今後の課題:

- 応答スペクトル解析 E-2 の設計時に、E-1b/E-1c で確認した有効質量・累積参加率をモード採用判断へ接続する。
- 大規模モデル向けの sparse 固有値 solver 方針は別フェーズで検討する。

## 結論

Phase E-1c は完了と判定する。

E-1b で追加した有効質量・累積参加率・CSV 出力について、最小限の自動テスト補強と検証記録作成を完了した。

次工程として、Phase E-2「応答スペクトル解析設計」へ進行可能である。
