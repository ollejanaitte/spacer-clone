# Phase C1 実装計画

## 1. 実装フェーズ概要

```
Phase 0: 準備         → 既存コード把握・branch作成・環境確認
Phase 1: データ基盤   → Schema拡張・Support Placement Engine
Phase 2: 下部工3D     → Geometry Generator・SubstructureRenderer
Phase 3: 3D統合       → SceneGroups拡張・Viewer統合
Phase 4: 2D投影+Overlay → 2D Plan Projection・LINER Overlay Layer
Phase 5: 保存+検証    → JSON保存・Golden Case・回帰試験
Phase 6: PR+統合      → PR作成・レビュー・main merge
```

## 2. 作業順序と依存関係

### Phase 0: 準備（0.5日）

| # | 作業 | 依存 | 成果物 |
|---|------|------|--------|
| 0.1 | 調査結果確認・設計書レビュー | なし | 設計書承認 |
| 0.2 | feature branch 作成 | なし | `feature/phase-c1-substructure` |
| 0.3 | worktree または dev 環境準備 | なし | 作業環境 |

### Phase 1: データ基盤（1.5日）

| # | 作業 | 依存 | ファイル候補 |
|---|------|------|-------------|
| 1.1 | `StableIdNamespace` に `"substructure"` 追加 | なし | `contracts/stableEntityId.ts` |
| 1.2 | project.json `substructure` 拡張（型定義） | 1.1 | `contracts/ または liner/schema/` |
| 1.3 | Zod スキーマ追加 | 1.2 | `contracts/runtime/schemas/` |
| 1.4 | SupportPlacementEngine | 1.3 | `substructure/SupportPlacementEngine.ts` |
| 1.5 | SubstructureModel 型定義 | 1.2 | `substructure/types.ts` |
| 1.6 | データバリデーション（移行） | 1.5 | `substructure/validation.ts` |

**依存関係：** 1.1→1.2→1.3→1.4, 1.2→1.5→1.6

### Phase 2: 下部工 3D 形状生成（1.5日）

| # | 作業 | 依存 | ファイル候補 |
|---|------|------|-------------|
| 2.1 | SubstructureSolidGenerator（箱・円柱の生成） | 1.5, 1.4 | `substructure/SubstructureSolidGenerator.ts` |
| 2.2 | パラメトリック形状（柱・キャップ・フーチング） | 2.1 | 同上 |
| 2.3 | パラメトリック形状（杭・支承・橋台） | 2.1 | 同上 |
| 2.4 | 局部座標系への配置（skew 対応） | 1.4, 2.1 | 同上 |
| 2.5 | ApolloSolidGeometryParameter 形式出力 | 2.1 | 同上 |

**依存関係：** 1.4, 1.5 → 2.1 → 2.2 → 2.3, 2.4, 2.5

### Phase 3: 3D 統合（1.5日）

| # | 作業 | 依存 | ファイル候補 |
|---|------|------|-------------|
| 3.1 | SceneGroups 拡張（substructure 用 Group 追加） | なし | `viewer/types.ts` |
| 3.2 | SubstructureRenderer 実装 | 2.5, 3.1 | `viewer/renderers/SubstructureRenderer.ts` |
| 3.3 | SceneBuilder 拡張（下部工描画呼び出し） | 3.2 | `viewer/SceneBuilder.ts` |
| 3.4 | ViewerVisibility 拡張（下部工表示制御） | 3.1 | `viewer/types.ts` |
| 3.5 | 上部工＋下部工統合動作確認 | 3.3 | （手動確認） |

**依存関係：** 2.5 → 3.1 → 3.2 → 3.3, 3.1 → 3.4

### Phase 4: 2D 投影 + LINER Overlay（2日）

| # | 作業 | 依存 | ファイル候補 |
|---|------|------|-------------|
| 4.1 | 2D Plan Projection（3D→2D 投影計算） | 2.5 | `substructure/PlanProjection.ts` |
| 4.2 | DrawingPrimitive 生成 | 4.1 | 同上 |
| 4.3 | AffineTransform2 適用（LINER平面図座標系へ） | 4.1 | 同上 |
| 4.4 | Overlay Layer 追加関数 | 4.2 | `liner/drawing/builders/` または別ファイル |
| 4.5 | LINER 平面図での Overlay 表示確認 | 4.4 | （手動確認） |
| 4.6 | Overlay 表示/非表示トグル UI | 4.5 | React component |

**依存関係：** 2.5 → 4.1 → 4.2 → 4.3 → 4.4, 4.4 → 4.5 → 4.6

### Phase 5: 保存・読込・検証（1.5日）

| # | 作業 | 依存 | ファイル候補 |
|---|------|------|-------------|
| 5.1 | JSON 保存拡張（project.json substructure） | 1.2 | `contracts/persistence/` |
| 5.2 | JSON 読込拡張（substructure 復元） | 1.2, 1.6 | 同上 |
| 5.3 | Golden Case 定義（GC-01〜GC-05） | 1.4, 2.5 | `substructure/__tests__/golden/` |
| 5.4 | Golden Case 自動テスト | 5.3 | `substructure/__tests__/phase-c1-golden.test.ts` |
| 5.5 | Unit Test（全新規モジュール） | Phase 1-4 | 各モジュールのテストファイル |
| 5.6 | 3D/2D 一致確認テスト | 4.2, 5.3 | `substructure/__tests__/consistency.test.ts` |

**依存関係：** 1.2 → 5.1, 5.2 | 1.4, 2.5 → 5.3 → 5.4

### Phase 6: PR + 統合（1日）

| # | 作業 | 依存 | 成果物 |
|---|------|------|--------|
| 6.1 | Phase C1 全変更のステージング | Phase 0-5 | `git add` |
| 6.2 | 全テスト実行（npm run test:all） | 6.1 | テスト結果 |
| 6.3 | 型チェック（npx tsc --noEmit） | 6.1 | 型エラーなし |
| 6.4 | E2E テスト実行 | 6.1 | E2E 結果 |
| 6.5 | PR 作成（draft） | 6.2-6.4 | GitHub PR |
| 6.6 | コードレビュー依頼 | 6.5 | レビュー完了 |
| 6.7 | main マージ | 6.6 | Merge commit |

## 3. 合計工数見積もり

| Phase | 工数（人日） | 備考 |
|-------|-------------|------|
| Phase 0: 準備 | 0.5 | |
| Phase 1: データ基盤 | 1.5 | |
| Phase 2: 下部工 3D 形状 | 1.5 | |
| Phase 3: 3D 統合 | 1.5 | |
| Phase 4: 2D 投影+Overlay | 2.0 | 最も工数がかかる |
| Phase 5: 保存+検証 | 1.5 | |
| Phase 6: PR+統合 | 1.0 | |
| **合計** | **9.5 人日** | |

## 4. PR 分割案

### 案 A：単一 PR（推奨）

- 1 つの PR で全 Phase C1 を統合
- 利点：全体整合性の確認が容易、設計書との対応が明確
- 欠点：PR サイズが大きくなる
- 条件：Phase 1→6 を順次実装後、まとめて PR

### 案 B：2 分割 PR

| PR | 内容 | 影響範囲 |
|----|------|---------|
| PR #C1.1 | Phase 1（データ基盤）+ Phase 2（下部工 3D） | データ型・エンジン |
| PR #C1.2 | Phase 3（3D統合）+ Phase 4（Overlay）+ Phase 5（保存/検証） | Viewer・Drawing・永続化 |

- 利点：PR サイズが小さい
- 欠点：C1.1 単独では動作確認困難（3D 表示がない）

### 判定：**案 A（単一 PR）を推奨**

理由：
- Phase C1 全体の 9.5 人日は単一 PR として妥当な規模
- 分割すると中間状態で動作しない期間が発生する
- 設計書が単一であるため、実装との対応が明確

## 5. 新規ファイル・変更ファイル一覧

### 5.1 新規作成ファイル

```
frontend/src/substructure/
  ├── types.ts                     # SubstructureModel 型定義
  ├── validation.ts                # データバリデーション（移行＋拡張）
  ├── SupportPlacementEngine.ts    # 支点配置計算
  ├── SubstructureSolidGenerator.ts # 3D 形状生成
  ├── PlanProjection.ts            # 2D 平面投影
  ├── projectSubstructureAdapter.ts # project.json ↔ SubstructureModel 変換
  └── __tests__/
      ├── golden/
      │   ├── gc-01-straight.fixture.ts
      │   ├── gc-02-skew.fixture.ts
      │   ├── gc-03-curve.fixture.ts
      │   ├── gc-04-curve-skew.fixture.ts
      │   └── gc-05-multi-curve.fixture.ts
      ├── SupportPlacementEngine.test.ts
      ├── SubstructureSolidGenerator.test.ts
      ├── PlanProjection.test.ts
      ├── phase-c1-golden.test.ts
      └── consistency.test.ts

frontend/src/viewer/renderers/
  └── SubstructureRenderer.ts      # 下部工 3D 描画
```

### 5.2 変更ファイル

```
frontend/src/contracts/stableEntityId.ts
  → StableIdNamespace に "substructure" 追加

frontend/src/viewer/types.ts
  → SceneGroups に substructure 用 Group 追加
  → ViewerVisibility に substructure 要素追加

frontend/src/viewer/SceneBuilder.ts
  → rebuildApolloVisualizationScene 内で SubstructureRenderer を呼び出し

frontend/src/viewer/Viewer3D.tsx（または関連ファイル）
  → ViewerVisibility 初期値に substructure 追加

frontend/schemas/project.schema.json
  → substructure フィールド追加

frontend/src/contracts/persistence/
  → 保存/読込時に substructure フィールドを扱う処理追加
```

### 5.3 変更しないファイル

```
frontend/src/liner/ 全ファイル
frontend/src/apollo/ 全ファイル
frontend/src/viewer/ThreeViewport.tsx
frontend/src/viewer/renderers/ApolloVisualizationRenderer.ts
frontend/src/viewer/coordinateTransform.ts
backend/ 全ファイル
schemas/substructure/*.json（既存のものは変更しない）
```