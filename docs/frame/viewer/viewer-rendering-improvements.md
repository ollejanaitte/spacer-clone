# Viewer 描画基盤改善 設計メモ

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE VIEWER REFERENCE
> Viewer behavior is presentation/session behavior, not Frame domain or result truth, and Viewer is not formal Frame.DRAFT. Current facts and target gaps are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md).
<!-- DOC-AUTHORITY:END -->

## 1. 現状の描画課題

Viewer Phase1/Phase2 では、節点・部材・支点・荷重・変形形状・反力ラベル・部材端断面力ラベルを同一 Three.js シーン上に重ねて表示している。機能は増えたが、表示対象が多いモデルでは次の問題が出やすい。

- 部材線、荷重矢印、結果図、ラベルが重なり、読み取りにくい。
- ラベル数が増えると画面密度が高くなり、節点番号・部材番号・結果値が衝突する。
- WebGL の標準 `LineBasicMaterial.linewidth` は実行環境によって線幅が効かないため、表示サイズ UI の「部材線幅」が期待どおり見えない場合がある。
- 結果ラベルは常時同じ優先度で描画されるため、重要な数値と補助的な番号が同時に混雑する。

## 2. 部材線幅が WebGL 環境で効きにくい問題

Three.js の通常線分は、多くのブラウザ・GPU ドライバ環境で線幅 1px 相当に固定される。現在の `createLine` / `LineBasicMaterial` ベースでは、`memberLineWidth` を大きくしても見た目が変わらない環境がある。

この制約はアプリ側のバグではなく WebGL 実装依存の制限であるため、線幅を確実に制御するには別方式の線描画が必要になる。

## 3. Line2 / LineMaterial 導入状況

**導入済み**: `three/examples/jsm/lines/Line2`、`LineGeometry`、`LineMaterial` は `createLine` 関数に統合済み。

- `width > 1` の場合に Line2 を使用
- `LineMaterial` の `linewidth` パラメータで線幅を制御
- `worldUnits: false` で画面空間ベースの線幅を維持
- `LineMaterial.resolution` は ThreeViewport の `updateWideLineResolution` で viewport サイズに同期

残課題:
- Electron 環境での線幅テスト
- GPU ドライバ依存の表示差異の確認

## 4. ラベル衝突回避

**導入済み**: `labelCollisionAvoidance.ts` モジュールを実装。

### 4.1 優先度ベース非表示

ラベルに優先度を持たせ、表示密度が高い場合は低優先度ラベルから隠す。

優先度:
1. `selected` (選択中): 常に表示
2. `hovered` (ホバー中): 常に表示
3. `force` (断面力値): 高優先度
4. `reaction` (反力値): 中優先度
5. `node` (節点番号): 低優先度
6. `member` (部材番号): 最低優先度

### 4.2 実装方式

- 各ラベルに `userData.labelPriority` と `userData.labelPriorityRank` を付与
- `cullOverlappingLabels` 関数で2D投影後の矩形衝突を検出
- 選択中・ホバー中のラベルは常に表示（強制表示）
- 衝突した低優先度ラベルは `visible = false` に設定

### 4.3 利点

- 実装が比較的軽い
- 選択中ラベルは必ず表示される
- 既存UIを壊さない

### 4.4 欠点

- 「どのラベルが消えたか」がユーザーに伝わりにくい
- カメラ回転時に再計算が必要（現在はrebuildModelScene内で実行）

## 5. 今後の改善候補

### 5.1 引き出し線案

ラベルを節点・部材端から少し離して配置し、対象点とラベルを細線で結ぶ。

利点:
- 結果値が対象位置に対応していることを保ちやすい
- 反力ラベルや部材端断面力ラベルと相性がよい

欠点:
- 引き出し線自体が増え、密なモデルではさらに混雑する
- 3D カメラ回転時の配置更新が必要

### 5.2 クラスタリング案

画面空間で近接するラベルをまとめ、代表ラベルや「+N」表示に集約する。

利点:
- 大規模モデルの初期表示が読みやすくなる
- ズームイン時に詳細表示へ展開できる

欠点:
- 3D 座標から画面座標への投影、カメラ変更時の再計算が必要
- クリック・選択との整合がやや複雑

## 6. 実装フェーズ分割

### Phase A: 表示優先度の内部モデル化 ✅ 完了

- ラベル生成時に `userData.priority`、`userData.ownerType`、`userData.ownerId` を付与する。
- 選択中対象のラベルを優先表示する。
- UI 変更は最小限に留める。

### Phase B: Line2 / LineMaterial 導入 ✅ 完了

- `createLine` で width > 1 に Line2 を使用。
- `LineMaterial.resolution` を viewport resize 時に更新。
- 通常線分と Line2 を共存。

### Phase C: ラベル密度制御 ✅ 完了

- 2D投影後の矩形衝突検出で低優先度ラベルを非表示。
- 選択中対象は常に表示。

### Phase D: 引き出し線・クラスタリング検証

- 反力・部材端断面力ラベルを対象に小さく試験実装する。
- 効果が薄い場合は採用しない。

## 7. テスト方針

- ラベル優先度付与のユニットテスト（`labelCollisionAvoidance.test.ts`）
- 表示設定から renderer へ渡る props のコンポーネントテスト
- Line2 導入時は geometry 生成、resolution 更新、dispose 処理のテスト
- Electron 実機で、線幅・ズーム・カメラ回転・SPACER座標系表示ON/OFFを手動確認する。

## 8. 今回実装したこと

- ✅ Line2 / LineMaterial の導入（`createLine` 内で width > 1 時に使用）
- ✅ ラベル衝突回避（優先度ベース非表示 + 選択中対象の強制表示）
- ✅ 引き出し線の実装は見送り（効果検証が必要）
- ✅ クラスタリングの実装は見送り（大規模モデルでの検証が必要）
