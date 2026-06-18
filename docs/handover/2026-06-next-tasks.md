# 次回開発タスク

## 最優先：不具合確認・修正

### 固有値解析モード変位表示不具合

モード別変位が表示されない問題を次回調査対象とする。

確認観点:

- 入力データの問題か
- Backend結果生成の問題か
- Frontend描画の問題か
- 原因特定手順の整理

### 変位表示総点検

以下の解析種別について、6自由度の変位表示が正しく行われるか確認する。

対象解析:

- 静的解析
- 固有値解析
- 応答スペクトル解析
- 時刻歴解析

対象成分:

- UX
- UY
- UZ
- RX
- RY
- RZ

### 解析結果と3D表示の整合確認

以下について、数値結果と3D表示が一致しているか確認する。

- 変位方向
- 荷重方向
- 支点反力方向
- SPACER座標系表示

### コミット 490e046 実施後の残課題

- RX、RY、RZは数値結果として表示されるが、3D変形図および時刻歴アニメーションには反映されていない。
- 3D変形図および時刻歴アニメーションは、並進自由度のUX、UY、UZのみを対象としている。
- 今後、回転自由度を可視化する場合は、回転量の表現方法、節点・部材への適用方法、表示倍率などの表示仕様設計が必要である。

### Frontend環境再構築手順

Frontendの再実行環境で`node_modules`が不足している場合は、以下の手順で依存関係を再構築する。

```powershell
cd frontend
npm ci
npm run build
npm test -- --run
```

`npm ci`がレジストリ、プロキシ、またはセキュリティポリシーによるエラーで失敗する場合は、npmレジストリへの接続設定と組織のパッケージ取得許可を確認してから再実行する。

## 新機能：モデルA/B比較ビュー

### 概要

別ウィンドウでモデル比較を行う機能を検討する。

### パターンA

- AモデルをBへコピー
- Bのみ編集可能
- 荷重条件変更可能
- 支点条件変更可能
- 部材変更可能

### パターンB

- A/B完全独立モデル

### 比較対象

- 静的解析
- 固有値解析
- 地震時応答解析

### 表示内容

- 変形図
- モード形状
- 時刻歴アニメーション

### 将来拡張

- 差分表示
- 同期再生
- オーバーレイ表示

## 3D表示・操作性改善

### 表示サイズ調整

ユーザーが以下を調整できるようにする。

- 節点サイズ
- 支点サイズ
- 荷重矢印サイズ
- ラベルサイズ
- 部材線幅

### UI候補

- スライダー
- +/-ボタン
- リセットボタン

## 未実装・今後の宿題

### 解析

- 断面力表示強化
- 反力表示強化
- モード図改善
- 時刻歴結果表改善

### 帳票

- PDF帳票強化
- 動的解析結果出力

### 入力支援

- 入力エラーチェック強化
- バリデーション強化

### 検証

- SPACER比較モデル整備
- 回帰試験追加

## Viewer Phase Next 実施記録（2026-06-18）

### ベースライン

- `npm ci`: 成功（467 packages、監査上の既存脆弱性はlow 1件/high 1件）。
- `npm run test -- --run`: 27 files / 338 tests成功。
- `npm run build`: 成功。Vite 1632 modules transformed、生成JS 959.87 kB。
- `npm run electron:compile`: 成功。
- `python -m pytest backend/tests -q`: 443 tests成功。
- `npm run typecheck` / `npm run lint`: ベースラインではscript未定義。Phase Nextでscriptを追加し、最終検証を成功させた。

### 実装結果

#### 3D Viewer表示サイズ

- 節点、支点、荷重矢印、ラベル、部材線幅の倍率設定を追加。
- localStorageキーは `spacer-clone:viewer:displaySize:v1`。
- 範囲外値をクランプし、破損JSONは既定値へフォールバックする。
- 通常ViewerとA/B比較Viewerで同じ設定stateを利用する。

#### 断面力・反力可視化フェーズ1

- 支点位置にRFX/RFY/RFZ数値ラベルを表示できる。
- 部材i端・j端にFX数値ラベルを表示できる。
- ラベルサイズ設定とSPACER表示専用座標変換を適用する。
- 値と符号は既存API/ViewModelを再利用し、payloadは変更していない。

#### A/B比較ビュー パターンAフェーズ1

- 通常画面のナビゲーションから `/compare` 相当の比較ワークスペースへ遷移する。
- Aは読取専用、明示操作でAをBへディープコピーし、BのみPropertyPanelで編集できる。
- A/Bは個別に既存静的解析APIを実行し、左右のViewerへ独立結果を表示する。
- Bはセッション内stateであり、project.jsonへは保存しない。

### 最終検証

- `npm run typecheck`: 成功、0 errors。
- `npm run lint`: 成功、Frontend source hygiene check passed。
- `npm run test -- --run`: 31 files / 348 tests成功。
- `npm run build`: 成功。Vite 1636 modules transformed、生成JS 967.72 kB。
- `npm run electron:compile`: 成功。
- `npm run electron:build`: 成功（Web build、icon生成、Electron compile、成果物コピー）。
- `python -m pytest backend/tests -q`: 443 tests成功。
- 新規ロジック対象coverage: lines 72.13%（閾値70%を通過）。

### 検証項目チェック

- [x] 表示サイズ5項目の即時反映、リセット、永続化、クランプ、破損値復旧。
- [x] SPACER座標系、静的変形、固有値結果、時刻歴overrideと表示サイズstateが独立。
- [x] 反力ラベルON/OFF、RFX/RFY/RFZ成分選択。
- [x] 軸力FXの部材端ラベル、符号整形、ラベル倍率反映。
- [x] A/B比較画面への遷移、A→Bディープコピー、A読取専用、B編集可能。
- [x] A/B個別解析ボタンと独立result state。
- [x] Web buildとElectron build。

### 自律判断

- 状態管理ライブラリは導入せず、既存React stateの階層に表示設定とA/B名前空間を追加した。既存実装の慣習と最小スコープを優先した。
- 部材線幅は既存 `LineBasicMaterial.linewidth` 方針を維持した。プラットフォーム差を解消する追加描画ライブラリ導入はフェーズ2以降とした。
- A/B比較はrouter依存を追加せずHistory APIと画面stateを使用した。Electron/Webの共通実装を優先した。
- PRはGitHub側のmerge commit方式（`gh pr merge --merge`）を使用し、mainへ反映する方針とした。

### 残課題・未決事項

- FY/FZ、MX/MY/MZ、RMX/RMY/RMZのラベル・矢印・分布図・カラーマップ。
- モーメント円弧の右手系表現、ローカルy/z軸凡例、ラベル衝突回避。
- WebGLで確実に太さが変わる部材線描画方式。
- A/B差分、同期再生、オーバーレイ、並列一括解析、Bモデル永続保存、別ウィンドウ表示。
- jsdomはCanvas 2D contextを実装しないため、ラベル生成テスト時に警告が出るがテスト結果は成功する。

## Viewer Phase2 安定拡張 実施記録（2026-06-18）

### 実装した内容

- 反力数値ラベルに RMX/RMY/RMZ を追加した。表示はラベルのみで、単位は `kN·m`。
- 既存の RFX/RFY/RFZ ラベルと同じ反力ラベル表示 UI に統合した。
- 部材端断面力ラベルを FX に加えて FY/FZ/MX/MY/MZ まで選択可能にした。
- 力成分は `kN`、モーメント成分は `kN·m` で表示する。
- 部材端断面力ラベルは解析結果の部材ローカル座標系成分として表示する。SPACER座標系表示ON時も表示位置だけがViewer座標変換され、成分名と符号は解析結果の部材座標系のまま扱う。
- Backend解析ロジック、Backend API、project.jsonスキーマ、payload形式は変更していない。

### 設計だけに留めた内容

- `docs/design/viewer-rendering-improvements.md` を追加し、Line2 / LineMaterial、ラベル衝突回避、優先度ベース非表示、引き出し線、クラスタリングを設計のみ記載した。
- `docs/design/model-comparison-view.md` を更新し、Bモデル永続保存、A/B差分表示、同期再生、オーバーレイ表示をPhase2計画として整理した。
- A/B比較の永続保存、差分表示、同期再生、オーバーレイ、別ウィンドウ化は実装していない。

### 実行したテスト

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run test -- --run`
- `npm run build`
- `npm run electron:compile`
- `python -m pytest backend/tests -q`
- 可能なら `npm run electron:build`

### 残課題

- ラベル衝突回避は未実装。
- Line2 / LineMaterial による確実な線幅制御は未実装。
- 断面力分布図、カラーマップ、モーメント円弧矢印は未実装。
- A/B比較の永続保存、差分表示、同期再生、オーバーレイは未実装。

### 次に実装すべき順番

1. 同一ID同士のA/B主要メトリクス差分テーブル。
2. Viewerラベル優先度付けと選択中対象の強制表示。
3. Line2 / LineMaterial による部材線幅改善。
4. Bモデル永続保存のschema設計とマイグレーション。
5. 同期再生、オーバーレイ、別ウィンドウ化。
