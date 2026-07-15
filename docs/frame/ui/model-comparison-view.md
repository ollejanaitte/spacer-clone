# A/Bモデル比較ビュー設計

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE FRAME REFERENCE
> This is subordinate feature/design evidence. Current implementation facts are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md), and target responsibilities and gaps by [`../../planning/stage6-10/stage6_target_architecture.md`](../../planning/stage6-10/stage6_target_architecture.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md). Partial or absent capabilities are not promoted to complete.
<!-- DOC-AUTHORITY:END -->

## 1. 目的

同一アプリ内で現行案 A と検討案 B を並べ、形状・解析結果・主要メトリクスを比較できる Viewer を提供する。橋梁モデルの支点条件、断面、荷重条件、動的解析条件などを変更した場合の影響を、通常 Viewer から大きく離れず確認できるようにする。

## 2. Phase1 の現状

Phase1 では、Web/Electron 共通の split-pane 型 Compare View を導入済み。

- 左側に A モデル、右側に B モデルを表示する。
- A から B へコピーする導線を持つ。
- B モデルは通常画面の project とは分離した React state として保持する。
- A/B それぞれに Viewer とメトリクス表示を持つ。
- カメラ同期の基礎機能はあるが、結果差分、同期再生、オーバーレイは未実装。

## 3. Bモデルが現在セッション内 state のみであること

現在の B モデルは、アプリ起動中または画面遷移中の React state に保持されるだけである。`project.json` には保存しないため、アプリ再起動、プロジェクト再読込、ページ更新により B モデルは失われる。

この方針は Phase1 の安全策である。既存の `ProjectModel` スキーマ、保存 payload、Backend API を変更せずに比較 UI を試せる一方で、実務利用では「比較案を後日再確認できない」という制約がある。

## 4. Bモデル永続保存案

### 案 A: project.json 内に comparison.modelB を追加

- `project.comparison.modelB` のような領域を追加し、B モデルを同一ファイルに保存する。
- A/B の関係が保持されるため、比較作業を再開しやすい。
- ただし project.json スキーマ変更、既存ファイル互換、保存・読込 UI の設計が必要。

### 案 B: B モデルを別 project として保存

- B を通常の project として別ファイル保存する。
- 既存スキーマを壊しにくい。
- A/B の関連付けは弱く、比較セットとして開き直す仕組みが別途必要。

### 案 C: 一時比較セッションファイル

- `.comparison.json` のような作業用ファイルに A/B 関係だけを保存する。
- project.json 変更を避けつつ復元できる。
- Electron と Web で保存先・権限・UX が分かれる。

最初の候補は案 A。ただし実装前に schemaVersion、マイグレーション、古いアプリで開いた場合の扱いを決める。

## 5. A/B差分表示案

差分表示は、形状差分と結果差分を分ける。

### 形状差分

- 節点座標差分。
- 部材追加・削除・接続変更。
- 支点条件、剛性、荷重条件の差分。

### 結果差分

- 最大変位差。
- 反力差。
- 部材端断面力差。
- 固有周期、応答スペクトル、時刻歴応答の主要値差。

初期実装では、数値テーブルの差分から始める。3D 上の差分ハイライトは誤読リスクが高いため後段にする。

## 6. 同期再生案

A/B で変形アニメーションまたは時刻歴アニメーションを同じ時刻で再生する。

- 親コンポーネントが共通 clock を持つ。
- 左右の ThreeViewport に同じ `externalAnimationClockSeconds` を渡す。
- A/B の時刻刻みや解析ケースが異なる場合は、補間または「同期不可」表示にする。

初期実装では、同一解析条件・同一時刻刻みの場合のみ同期する。

## 7. オーバーレイ表示案

A と B を同一 3D ビュー上に重ねて表示する。

- A を通常色、B を半透明または破線風にする。
- 節点・部材・変形形状の差を空間的に確認しやすい。
- ただし密な橋梁モデルでは重なりが増え、かえって読みづらくなる。

初期実装では split-pane を維持し、オーバーレイは別モードとして後段にする。

## 8. リスク

### Bモデル永続保存

- project.json スキーマ変更により既存データ互換が必要。
- A と B のどちらを編集対象にするか UX が複雑になる。
- 保存ファイルサイズが増える。

### A/B差分表示

- 成分名、座標系、荷重ケースが一致しない場合に誤差分を表示する恐れがある。
- 部材IDが異なるモデル同士では対応付けが難しい。

### 同期再生

- 固有モード番号、時刻歴ステップ、応答スペクトル選択が左右で一致しない可能性がある。
- 再生 clock の責務が Viewer と CompareView にまたがる。

### オーバーレイ表示

- 2モデル分の描画負荷が高い。
- 透明描画や depthTest により見え方が不安定になる可能性がある。
- 選択操作の対象判定が複雑になる。

## 9. 実装フェーズ分割

### Phase2-A: 比較状態の設計整理

- B モデル永続保存の schema 案を決める。
- A/B のケース対応、ID対応、結果対応のルールを文書化する。

### Phase2-B: 最小差分テーブル

- 同一 ID の節点・部材・結果だけを対象に、数値差分テーブルを表示する。
- 3D 差分ハイライトは行わない。

### Phase2-C: 同期再生

- 同一時刻刻みの時刻歴結果に限定して同期再生する。
- 不一致時は明示的に同期不可とする。

### Phase2-D: Bモデル保存

- schemaVersion 更新とマイグレーションを入れる。
- 保存・読込・破棄の UX を整える。

### Phase3: オーバーレイ / 別ウィンドウ

- 2モデル重ね描画。
- 必要なら Electron 別ウィンドウ化を検討する。

## 10. 最初に実装すべき最小スコープ

次に実装するなら、B モデル永続保存より先に「同一 ID の主要メトリクス差分テーブル」を推奨する。

理由:

- project.json スキーマを変えない。
- Backend API を変えない。
- 比較ビューの価値をすぐ確認できる。
- B 永続保存の前に、どの差分が実務上必要か確認できる。

対象は最大変位、最大反力、最大部材端断面力の差分に限定する。

## 11. 今回実装しないこと

Viewer Phase2 では以下を実装しない。

- `project.json` への modelB 保存。
- A/B 差分表示。
- 同期再生。
- オーバーレイ表示。
- 別ウィンドウ化。
- Backend API 変更。
- payload 形式変更。
