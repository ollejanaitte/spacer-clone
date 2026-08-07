# Phase C1 設計最終報告書

## 1. 調査結果サマリー

### 1.1 現状実装評価

| モジュール | 状態 | Phase C1 での扱い |
|------------|------|-------------------|
| LINER（線形計算・平面図） | 完成・安定 | 座標計算を正本として利用、変更なし |
| Apollo（上部工 3D） | 完成・安定 | 統合先として利用、変更なし |
| Substructure-planning（下部工 3D prototype） | 完成（独立） | frontend 統合・座標系統合が必要 |
| Viewer3D / Three.js | 完成 | SceneGroups 拡張のみ |
| Schema / Contract | 完成 | 拡張（namespace 追加）のみ |
| 保存・読込 | 完成 | project.json 拡張のみ |
| Testing | 完成（Vitest + Playwright） | Golden Case 追加 |

### 1.2 主要な発見事項

1. **substructure-planning は独立プロトタイプとして完成している**
   - 3D 形状生成（geometry.ts）：引数から Box/Cylinder 生成
   - 5 つの JSON Schema でデータモデル定義済み
   - 全 26 の Unit Test、10 の E2E テスト通過済み

2. **LINER は支点座標計算の正本として十分な機能を持つ**
   - `pointAtStationOffset(station, offset)` → 世界座標
   - `pierLineGeometry` → 斜角含む支点ジオメトリ
   - `bridgeLayoutEvaluation` → スパン・支点レイアウト

3. **Apollo は上部工ソリッド生成の正本として機能**
   - `ApolloSolidGeometryParameter` で 3D 形状を表現
   - localFrame（origin + 直交基底）で任意配置可能

4. **既存 Viewer3D は SceneGroups + Renderer の拡張で対応可能**
   - SceneGroups に substructure 用 Group を追加するのみ
   - SubstructureRenderer を新規作成

5. **LINER 平面図 DrawingDocument は Layer 追加で Overlay 可能**
   - 既存の Layer 配列に新しい layer を追加するだけでよい
   - SVG レンダラー / DXF マッパーの変更不要

## 2. 設計結果サマリー

### 2.1 アーキテクチャ

- **Support Placement Engine** を LINER と Substructure Model の間に配置
- 3D と 2D は同一の Substructure Model から派生（単一正本の原則）
- `ApolloSolidGeometryParameter` 形式で上部工と下部工を統合

### 2.2 データフロー

- LINER → SupportPlacement → SubstructureModel（正本）→ 3D / 2D
- JSON 正本：project.json 内 substructure 拡張
- Stable ID：既存 `StableEntityId` の namespace 拡張で対応
- constrain：上部工なしでも下部工単独で動作可能

### 2.3 座標系

- 世界座標：x-longitudinal / y-transverse / z-up（既存と同一）
- 支点局部座標：tangent / transverse（skew 反映）/ vertical
- 2D 投影：Z 無視 + StationAxis で図面座標変換
- 変換方式：localFrame Matrix4 による Three.js 配置

### 2.4 3D 統合

- ApolloSolidGeometryParameter の source フィールドで上部工/下部工を識別
- SceneGroups に substructure 用 7 グループを追加
- SubstructureRenderer を新規作成（ApolloVisualizationRenderer と同パターン）
- 色分け：既存 prototype の配色を踏襲

### 2.5 LINER Overlay

- 既存 DrawingDocument に独立レイヤとして追加
- 投影：3D → XY 平面 → StationAxis で図面座標変換
- 要素：フーチング矩形、柱矩形、杭十字、支承矩形、橋台線
- 表示制御：Layer.visible トグル

### 2.6 検証

- 5 Golden Cases（直橋/斜橋/曲線橋/曲線+斜角/複数スパン曲線）
- 3D/2D 一致確認自動テスト
- 既存テスト全通過を統合 Gate に設定

### 2.7 実装計画

- 7 Phase / 9.5 人日
- 単一 PR（案 A）を推奨
- 新規ファイル 10〜12、変更ファイル 5〜7

## 3. 未解決事項

| # | 事項 | 影響 | 推奨対応 |
|---|------|------|---------|
| 1 | prototype の既存 Unit Test どう移行するか | LOW | 移行後も元のテストは維持、frontend 側で同等テストを追加 |
| 2 | prototype の E2E（Playwright）を frontend に統合するか | LOW | 当面は prototype 側のみで維持。frontend E2E は別途追加 |
| 3 | フーチング投影で「隠れ線処理」が必要か | LOW | 上面のみ投影で十分。必要なら後日対応 |
| 4 | Overlay Layer の表示/非表示 UI をどこに配置するか | LOW | LINER Drawing Workspace のレイヤ管理 UI に追加推奨 |
| 5 | 杭配置のパターン（矩形配置以外）対応 | LOW | 矩形グリッドのみで Phase C1 は十分 |
| 6 | 曲線橋でのフーチング回転（線形曲率の影響）をどこまで考慮するか | MEDIUM | スパン中央の支点では曲率の影響は微小。skew 角のみで Phase C1 は対応可能 |
| 7 | 上部工の有無で表示をどう切り替えるか | LOW | ViewerVisibility で制御。上部工がない場合は下部工のみ表示 |
| 8 | 杭の 2D 投影で十字マーカーが縮尺上見えなくなるケース | LOW | 縮尺に応じて最小サイズ保証を追加検討 |

**重大な未解決事項はなし。**

## 4. 最終判定

```
PHASE_C1_SCOPE_VERDICT: FROZEN
CURRENT_IMPLEMENTATION_AUDIT: COMPLETE
ARCHITECTURE_READY: YES
DATA_CONTRACT_READY: YES
COORDINATE_MODEL_READY: YES
3D_INTEGRATION_DESIGN_READY: YES
SUBSTRUCTURE_PLAN_PROJECTION_READY: YES
LINER_OVERLAY_DESIGN_READY: YES
STABLE_ID_STRATEGY_READY: YES
VERIFICATION_PLAN_READY: YES
REGRESSION_PLAN_READY: YES
IMPLEMENTATION_SEQUENCE_READY: YES
PR_STRATEGY_READY: YES
UNRESOLVED_BLOCKERS: NONE
PHASE_C1_IMPLEMENTATION_GO_NO_GO: GO
```

## 5. 推奨事項

1. **実装は Phase 1（データ基盤）から開始すること**
   - 型定義とバリデーションが他の全 Phase の前提条件
2. **prototype からのコード流用を積極的に行うこと**
   - `geometry.ts` のパラメトリック生成ロジックは直接流用可能
   - `validation.ts` のバリデーションロジックも流用可能
   - 座標系統合と Three.js 版数統一のみ注意
3. **Golden Case は実装前に fixture データだけ先行作成すること**
   - テストファーストで実装の正しさを担保
4. **実装開始前に design review を完了させること**
   - 本設計書に基づくレビューを推奨
5. **実装中に発見された課題は本設計書に対する追記として管理すること**
   - 実装完了時の最終報告書に差分として含める