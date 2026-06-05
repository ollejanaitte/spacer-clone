# 移動荷重・影響線設計レビュー報告書

## 1. レビュー対象

対象文書:

- `docs/investigation/spacer-moving-load.md`
- `docs/design/influence-moving-load.md`
- `docs/design/live-load-preset.md`
- `docs/design/influence-engine.md`
- `docs/design/envelope-result.md`
- `docs/design/loading-surface-grid.md`

レビュー観点:

- ドメイン矛盾
- 循環参照
- データ構造重複
- 責務重複
- 将来拡張性
- MVP実現性
- 性能リスク

## 2. 採用推奨

### StructuralModelとLoadingSurfaceModelの分離

判定: 採用推奨

理由:

- 固定載荷解析と移動荷重解析の責務が明確になる。
- 構造節点と載荷格子を独立に扱える。
- SPACERのSTATICSとINFLOADを分ける思想と整合する。
- 既存解析エンジンを汚さず、上位の影響線エンジンとして追加しやすい。

### 影響線作成と移動荷重解析の段階分離

判定: 採用推奨

理由:

- 単位荷重法の結果を再利用できる。
- 単一集中荷重、複数軸、分布荷重へ自然に拡張できる。
- 影響線グラフと包絡結果を別々に検証できる。

### LiveLoadPresetによる荷重値管理

判定: 採用推奨

理由:

- 道路橋示方書R7の荷重値をソースへ埋め込まない方針と整合する。
- 版、出典、改訂番号を結果へ残せる。
- A活、B活、T荷重、L荷重、群集荷重の将来拡張に対応できる。

### MVPの単一LoadingLine限定

判定: 採用推奨

理由:

- station生成、単位荷重、K行列再利用、包絡処理を最小単位で検証できる。
- 複数車線や規準荷重を後回しにできる。
- 既存解析エンジンとの接続リスクを抑えられる。

### K行列再利用

判定: 採用推奨

理由:

- stationごとの解析で最も重い処理を削減できる。
- 線形解析の前提と整合する。
- 将来の複数target抽出でも効果が大きい。

### memberInterpolationをMVP標準にする

判定: 採用推奨

理由:

- `nearestNode` と `explicitNode` は載荷位置を節点へ吸着させ、影響線が階段状になりやすい。
- 既存のEuler-Bernoulli梁要素を持つため、部材上任意位置の集中荷重を等価節点荷重として扱える。
- 移動荷重解析で必要な位置依存性をMVPから検証できる。

### StationPointによるstation管理

判定: 採用推奨

理由:

- `StationPoint` を解析時の派生データとすることで、永続ドメインモデルを増やさずにstation情報を統一できる。
- `lineId + station` を基本キーにし、`stationIndex` を補助情報に限定できる。
- 旧来の影響線載荷点エンティティを廃止でき、荷重方向や分配結果との責務混在を避けられる。

### DistributionRuleの独立化

判定: 採用推奨

理由:

- `LoadingLine` は経路幾何だけに集中できる。
- 荷重分配方式をMVPの `memberInterpolation` から将来の `gridInterpolation`、`surfaceInterpolation`、`laneDistribution` へ拡張しやすい。
- 構造モデルへの変換責務が明確になる。

## 3. 保留

### 変位をMVP対象に含めるか

判定: 保留

論点:

- 変位影響線は実装上は可能だが、初期UIとCSVの対象が増える。
- 部材端力と反力だけで橋梁実務上の価値は出しやすい。

推奨:

- データ構造には `displacement` を残す。
- MVP UIの初期対象は部材端力と反力を優先する。

### 影響線履歴の標準返却

判定: 保留

論点:

- 履歴は可視化に必要だが、station数とtarget数に比例して大きくなる。
- APIレスポンス肥大化の原因になる。

推奨:

- `includeHistory` オプションを設ける。
- UI表示用は必要targetに絞って返す。

### 格子補間の精度保証

判定: 保留

理由:

- 格子補間は荷重保存、モーメント保存、構造部材への分配精度に影響する。
- MVPでは `memberInterpolation` を標準とし、格子補間はPhase 2以降に送る。

必要な決定:

- Phase 2以降で優先する補間方式。
- 許容誤差。
- 載荷点が格子外にある場合の扱い。
- 等価節点荷重の検証ケース。

### 同時性結果の出力範囲

判定: 保留

理由:

- 全部材端力と全反力の同時性を常時出すと結果サイズが大きくなる。
- MVPでは `InfluenceResult`、`MovingLoadHistory`、`EnvelopeResult` を優先し、同時性断面力と同時性反力はPhase 2で扱う。

必要な決定:

- Phase 2で対象target周辺だけにするか。
- APIオプションで全部材を返すか。
- CSV出力の標準セクションに含めるか。

### R7プリセットの承認フロー

判定: 保留

理由:

- 出典情報の保持だけでは、数値登録ミスを防げない。
- 道路橋示方書R7の正式な表、節、適用条件を誰が確認するかを決める必要がある。

必要な決定:

- プリセット登録者。
- レビュー者。
- 承認済みプリセットの変更手順。
- 結果再現のためのプリセットスナップショット保存範囲。

## 4. 要再検討

### LoadingGridの本格利用時期

判定: 要再検討

理由:

- `LoadingGrid` はSPACERの格子形状思想を取り込む重要要素だが、MVPでは `LoadingLine` と `memberInterpolation` で十分に成立する。
- 早期に格子補間まで実装すると、MVPの焦点がぼやける。

必要な決定:

- Phase 2で格子補間を導入する条件。
- `LoadingGrid` を保存専用から解析利用へ昇格させるタイミング。
- 車道、歩道、軌道から生成される格子との関係。

### 複数車線・面荷重時の結果サイズ管理

判定: 要再検討

理由:

- 複数車線、群集荷重、分布荷重、同時性結果を同時に扱うと、履歴と包絡結果が急増する。
- MVPの `targetResults` 形式は単一ラインでは扱いやすいが、複数車線時の結果圧縮方針は追加検討が必要である。

必要な決定:

- 結果をtarget単位で返すか、載荷ケース単位で返すか。
- 履歴の間引き、保存、CSV分割の方針。
- UI表示用と帳票用の結果取得APIを分けるか。

## 5. ドメイン矛盾レビュー

結論: 重大な矛盾なし。

確認結果:

- `StructuralModel` は移動荷重モデルを参照しない。
- `LoadingSurfaceModel` が構造モデルを所有しない。
- `LiveLoadPreset` はプロジェクト固有エンティティを参照しない。
- `MovingLoadCase` が `LoadingLine`、`LiveLoadModel`、`DistributionRule` を参照する方向は妥当。

注意:

- `DistributionRule` が構造部材IDを参照する場合、載荷モデルと構造モデルの結合が強くなる。MVPでは `targetMembers` を任意の絞り込みとして扱い、分配処理本体はアダプタ層で行う。

## 6. 循環参照レビュー

結論: 循環参照は回避できている。

禁止すべき参照:

- `StructuralNode -> LoadingGridPoint`
- `Member -> LoadingLine`
- `LiveLoadPreset -> MovingLoadCase`
- `InfluenceResult -> MovingLoadCase -> InfluenceResult`

設計上の対策:

- 結果は入力ケースIDを文字列で保持する。
- プリセットは解析ケースを知らない。
- 構造モデルは載荷モデルを知らない。
- `StationPoint` は解析時の派生データとし、永続参照元にしない。

## 7. データ構造重複レビュー

結論: 重複リスクは低減された。

重複しやすい項目:

- station座標が `StationPoint` と `InfluenceResult` に現れる。
- 荷重方向が `LiveLoadModel` と `MovingLoadCase` に現れる可能性がある。

推奨:

- `LoadingLine` は生成ルールを持つ。
- `StationPoint` は解析時の派生データとして扱い、永続化しない。
- `InfluenceResult` は解析時スナップショットとしてstation座標を持つ。
- 荷重方向は原則として `LiveLoadModel` が持ち、ケース固有の上書きが必要な場合のみ `MovingLoadCase` で扱う。

## 8. 責務重複レビュー

結論: 現時点では許容範囲。

注意点:

- `LiveLoadModel` と `MovingLoadCase` の責務が近い。
- `LoadingGrid` と `LoadingLine` のstation管理が重なる可能性がある。

推奨:

- `LiveLoadModel` は荷重の形、大きさ、方向を持つ。
- `MovingLoadCase` はどこへ、何を、どのtargetに対して動かすかを持つ。
- `LoadingLine` は一次元経路、`LoadingGrid` は二次元載荷点集合として分ける。
- `DistributionRule` は載荷点から構造モデルへの変換責務を持つ。

## 9. 将来拡張性レビュー

結論: 拡張性は良好。

対応可能な拡張:

- 複数軸荷重。
- 分布荷重。
- 複数車線。
- 車道、歩道、軌道。
- R7以外のプリセット。
- 同時性断面力、同時性反力。
- 格子補間。

条件:

- MVPの `memberInterpolation` を標準とし、`nearestNode` と `explicitNode` を初期候補に戻さない。
- プリセットの版管理を初期から入れる。
- 結果に使用プリセット情報を残す。

## 10. MVP実現性レビュー

結論: MVPは実現可能。

最小実装で必要な要素:

- 単一ライン入力。
- station生成。
- `StationPoint` 生成。
- `memberInterpolation` によるstationごとの等価節点荷重ベクトル作成。
- 既存解析エンジンのK行列再利用。
- 対象レスポンス抽出。
- 単一集中荷重との積。
- 最大最小包絡。
- CSV出力。

MVPで避けるべき要素:

- 示方書荷重プリセットの本実装。
- 複数車線。
- 面荷重。
- 衝撃係数。
- 複雑な格子補間。
- 同時性断面力と同時性反力。

## 11. 性能リスクレビュー

結論: K行列再利用を実装すればMVP性能リスクは管理可能。

主要リスク:

- station数が増えるとsolve回数が増える。
- target数が多いと結果サイズが増える。
- Phase 2で同時性結果を全部材で出すとレスポンスが肥大化する。

対策:

- 分解済みsolver再利用。
- 複数targetを1回のsolve結果から抽出。
- 履歴をオプション化し、同時性結果はPhase 2で出力範囲を設計する。
- station数の上限または警告。
- 結果CSV生成を必要時だけ行う。

## 12. 総合判定

総合判定: 採用推奨

理由:

- ドメイン分離が明確で、既存3D骨組解析を壊さずに追加できる。
- 旧来の影響線載荷点エンティティを廃止し、`StationPoint` と `DistributionRule` へ責務を分離したことで、用語とデータ構造の整合性が上がった。
- `memberInterpolation` をMVP標準にしたことで、移動荷重解析の位置依存性を初期から検証できる。
- 将来の道路橋示方書R7活荷重プリセット、車道、歩道、軌道、連行荷重へ拡張できる。

次フェーズの優先事項:

1. MVPの `LoadingLine` とstation生成仕様を確定する。
2. `memberInterpolation` の対象部材検索、許容距離、等価節点荷重式を確定する。
3. 影響線targetの初期対象を部材端力と反力に絞る。
4. `LiveLoadPreset` の承認フローを決める。
