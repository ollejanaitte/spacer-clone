# Phase C1 検証計画

## 1. 検証方針

Phase C1 の検証は以下 4 層で構成する：

1. **単体テスト**（Vitest）：各新規モジュールの Unit Test
2. **統合テスト**（Vitest）：モジュール間結合の確認
3. **Golden Case テスト**（Vitest）：直橋/斜橋/曲線橋の 3D/2D 一致確認
4. **回帰テスト**（Vitest + Playwright）：既存機能の非破壊確認

## 2. Golden Case 定義

### 2.1 テストケース一覧

| Case ID | 橋種 | 線形 | スパン | 斜角 | 下部工 |
|---------|------|------|--------|------|--------|
| GC-01 | 直橋 | 直線 R=∞ | 3@30m | 0° | P1,P2 + A1,A2 |
| GC-02 | 直橋＋斜角 | 直線 R=∞ | 3@30m | 30°（P1,P2） | P1,P2 + A1,A2 |
| GC-03 | 単純曲線橋 | 円弧 R=300 | 2@30m | 0° | P1 + A1,A2 |
| GC-04 | 曲線橋＋斜角 | 円弧 R=300 | 2@30m | 15°（P1） | P1 + A1,A2 |
| GC-05 | 複数スパン曲線 | 円弧 R=500 | 4@25m | 10°（P1,P2,P3） | P1,P2,P3 + A1,A2 |

### 2.2 各ケースの確認項目

| # | 確認項目 | GC-01 | GC-02 | GC-03 | GC-04 | GC-05 |
|---|----------|-------|-------|-------|-------|-------|
| 1 | 支点中心位置が LINER 座標と一致 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 | 下部工の向き（tangent 方向）が正しい | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 | 斜角が正しく反映されている | - | ✓ | - | ✓ | ✓ |
| 4 | 各部材寸法がパラメータと一致 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 | フーチング外形が正しい | ✓ | ✓ | ✓ | ✓ | ✓ |
| 6 | 杭位置が正しい | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7 | 支承位置が正しい | ✓ | ✓ | ✓ | ✓ | ✓ |
| 8 | Stable ID が一意で追跡可能 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 9 | 3D 表示と 2D 投影が一致 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 10 | JSON 保存→読込で再現性あり | ✓ | ✓ | ✓ | ✓ | ✓ |

### 2.3 Golden Case テスト構造

各 Golden Case は以下の形式で定義する：

```typescript
// Golden Case 定義例
interface GoldenCase {
  id: string;                         // "GC-01"
  description: string;                // "直橋"
  linerInput: BuildIntermediateInput; // LINER Pipeline 入力
  substructureInput: {                // 下部工パラメータ
    supports: SubstructureSupport[];
  };
  expected: {
    supportPositions: ExpectedPosition[];
    footingOutlines: ExpectedOutline[];
    boundingBox: ExpectedBBox;
    stableIds: string[];
  };
  tolerance: number;                  // 許容誤差（m）
}
```

テスト実行：

```typescript
function runGoldenCase(gc: GoldenCase): void {
  // 1. LINER パイプライン実行
  const linerResult = runPipeline(gc.linerInput);

  // 2. Support Placement Engine
  const placements = computeSupportPlacements(linerResult);

  // 3. 下部工 3D 生成
  const solidParams = generateSubstructureSolids(gc.substructureInput, placements);

  // 4. 下部工 2D 投影
  const planPrimitives = projectTo2D(gc.substructureInput, placements);

  // 5. 検証
  expect(placements).toMatchPositions(gc.expected.supportPositions, gc.tolerance);
  expect(solidParams).toHaveStableIds(gc.expected.stableIds);
  // ... 各検証
}
```

## 3. 単体テスト計画

### 3.1 新規モジュール

| モジュール | テスト項目 | テスト数 |
|------------|-----------|---------|
| SupportPlacementEngine | station → 位置計算の正しさ | 10 |
|  | skew 角反映の正しさ | 5 |
|  | 支承位置計算 | 5 |
| SubstructureSolidGenerator | 各要素の BoxGeometry 生成 | 10 |
|  | パラメータ範囲（最小・最大） | 5 |
|  | 不正パラメータ検出 | 5 |
| SubstructureRenderer | SceneGroup への追加 | 5 |
|  | Stable ID 設定 | 5 |
| 2D Plan Projection | フーチング投影形状 | 5 |
|  | キャップ投影形状 | 5 |
|  | skew 角あり投影 | 5 |
| Overlay Layer | DrawingLayer 追加 | 3 |
|  | 既存レイヤ非破壊確認 | 3 |
| project.json substructure 拡張 | 保存→読込ラウンドトリップ | 10 |
|  | 既存データ互換 | 5 |
|  | Zod スキーマ検証 | 5 |

### 3.2 既存モジュール（変更なし）

| モジュール | 確認内容 |
|------------|---------|
| LINER core | 変更しないため既存テストで担保 |
| Apollo visualization | 変更しないため既存テストで担保 |
| Viewer3D | SceneGroups 拡張のみのため影響範囲限定 |

## 4. 3D/2D 整合テスト

### 4.1 自動一致確認

```typescript
// 3D/2D 一致確認の擬似コード
function verify3D2DConsistency(solidParams: ApolloSolidGeometryParameter[], planPrimitives: DrawingPrimitive[]): void {
  for (const solid of solidParams) {
    // 同じ Stable ID を持つ 2D プリミティブを検索
    const planPrimitive = planPrimitives.find(p => p.stableId === solid.stableId);
    expect(planPrimitive).toBeDefined();

    // 3D の XY 投影範囲と 2D の図形が一致することを確認
    const solidBounds = computeXYBounds(solid);
    const primitiveBounds = computePrimitiveBounds(planPrimitive);
    expect(solidBounds).toApproxEqual(primitiveBounds, 0.001);
  }
}
```

### 4.2 手動確認（開発中）

- Viewer3D 画面キャプチャと SVG 平面図の目視比較
- 直橋・斜橋・曲線橋それぞれでスクリーンショット保存

## 5. 回帰試験計画

### 5.1 回帰試験範囲

| テスト群 | 実行コマンド | 期待結果 | Phase C1 影響 |
|----------|-------------|----------|---------------|
| LINER Unit Tests | `npx vitest run src/liner/` | ALL PASS | 変更なしのため影響なし |
| Apollo Unit Tests | `npx vitest run src/apollo/` | ALL PASS | 変更なしのため影響なし |
| Contracts Tests | `npx vitest run src/contracts/` | ALL PASS | substructure namespace 追加のみ |
| Viewer Tests | `npx vitest run src/viewer/` | ALL PASS | SceneGroups 拡張のテスト追加 |
| Drawing Tests | `npx vitest run src/liner/drawing/` | ALL PASS | Overlay Layer のテスト追加 |
| Golden Regression | `npm run test:regression` | ALL PASS | Golden Case 追加 |
| Backend Tests | `cd backend && pytest` | ALL PASS | 変更なし |
| E2E Tests | `npm run test:e2e` | ALL PASS | 下部工 E2E 追加 |

### 5.2 main 統合 Gate

| Gate | 条件 | 失敗時対応 |
|------|------|-----------|
| 全 Unit Test 通過 | `npm run test` が exit 0 | PR 差し戻し |
| Golden Regression 通過 | `npm run test:regression` が exit 0 | Golden 更新 or パッチ |
| E2E 全通過 | `npm run test:e2e` が exit 0 | PR 差し戻し |
| Lint 通過 | `npx tsc --noEmit` | PR 差し戻し |
| コードレビュー | 2 approvals | 修正依頼対応 |

## 6. テストデータ管理

### 6.1 Golden データ保存

Golden Case データは以下の場所に保存する：

```
substructure-planning/verification/golden/
  ├── gc-01-straight/
  │   ├── input.json          # LINER + substructure 入力
  │   ├── expected.json       # 期待値
  │   └── snapshot.png        # 3D キャプチャ（参考）
  ├── gc-02-skew/
  │   └── ...
  ├── gc-03-curve/
  │   └── ...
  ├── gc-04-curve-skew/
  │   └── ...
  └── gc-05-multi-curve/
      └── ...
```

または、既存 LINER Golden と同じく TypeScript fixture として定義する。

### 6.2 テストユーティリティ

```typescript
// テスト用ヘルパー
function createTestSupportPlacement(opts: {
  station: number;
  skewDeg: number;
  column?: ColumnParams;
  cap?: CapParams;
  footing?: FootingParams;
  piles?: PileParams;
}): { linerInput: BuildIntermediateInput; substructureInput: SubstructureSupport };
```