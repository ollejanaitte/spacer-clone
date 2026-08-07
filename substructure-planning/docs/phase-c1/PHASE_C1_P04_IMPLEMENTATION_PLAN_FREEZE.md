# Phase C1 P04 実装計画・変更境界・検証Gate Freeze

## 1. P00〜P03.5 設計書整合性レビュー

### 1.1 レビュー結果

| 設計書 | 状態 | 備考 |
|--------|------|------|
| PHASE_C1_SCOPE.md | CONSISTENT | スコープ確定。修正不要。 |
| PHASE_C1_CURRENT_STATE.md | CONSISTENT | 現状評価確定。修正不要。 |
| PHASE_C1_ARCHITECTURE.md | CONSISTENT | 全体構成確定。修正不要。 |
| PHASE_C1_DATA_FLOW.md | CONSISTENT | データフロー確定。修正不要。 |
| PHASE_C1_3D_INTEGRATION.md | CONSISTENT | 3D統合方式確定。修正不要。 |
| PHASE_C1_LINER_PLAN_OVERLAY.md | CONSISTENT | Overlay方式確定。修正不要。 |
| PHASE_C1_VERIFICATION_PLAN.md | CONSISTENT | 検証計画確定。修正不要。 |
| PHASE_C1_IMPLEMENTATION_PLAN.md | CONSISTENT | 基本計画確定。P04で具体化。 |
| PHASE_C1_DESIGN_FINAL_REPORT.md | CONSISTENT | 最終報告確定。 |
| PHASE_C1_P00_INTEGRATION_SURVEY.md | CONSISTENT | 実コード接続点調査確定。 |
| PHASE_C1_P01_STRUCTURE_TYPE_SURVEY.md | CONSISTENT | 形式調査確定。門型重点。 |
| PHASE_C1_P02_PLACEMENT_FREEZE.md | CONSISTENT | 配置方式確定。3段階。 |
| PHASE_C1_P03_UI_UX_FREEZE.md | CONSISTENT | UI設計確定。3ペイン。 |
| PHASE_C1_P03_5_INTERACTION_FREEZE.md | CONSISTENT | 操作体系確定。 |
| 補助ファイル9点 | CONSISTENT | CSV/MD補助資料。 |

**DESIGN_DOC_CONSISTENCY: PASS**
**BLOCKERS: NONE**
**MINOR_NOTES: NONE**

---

## 2. 実装ゴール再確認

Phase C1 実装完了条件（10項目：PHASE_C1_SCOPE.md 完了条件より）：

| # | 条件 | Gate名称 |
|---|------|---------|
| 1 | LINER線形座標から全支点位置計算 | LINER_PLACEMENT_WORKS |
| 2 | Apollo上部工＋下部工同一 Three.js Scene | UPPER_LOWER_3D_INTEGRATION |
| 3 | 橋脚/橋台/フーチング/杭/支承の3D生成 | STRUCTURE_TYPES_WORK |
| 4 | 上部工＋下部工全体3D表示 | UPPER_LOWER_3D_INTEGRATION |
| 5 | 下部工から2D平面形状生成 | PLAN_PROJECTION_WORKS |
| 6 | LINER平面図に下部工Overlay | LINER_PLAN_OVERLAY |
| 7 | 直橋/斜橋/曲線橋で3D/2D一致 | GOLDEN_CASES |
| 8 | JSON保存・読込・GLB出力維持 | SAVE_LOAD |
| 9 | 既存全テスト通過 | REGRESSION |
| 10 | PRレビュー完了後mainマージ | PR_MERGED |

---

## 3. C1_IMPLEMENT 対象（P01 Freeze確認）

| 区分 | 形式 | 備考 |
|------|------|------|
| 橋台 | 逆T式（inverted_t） | 現状維持 |
| 橋台 | ラーメン式（cantilever_frame） | formType追加 |
| 橋脚 | 単柱矩形（single_column_rect） | 現状維持 |
| 橋脚 | 壁式（wall） | 単柱の拡張 |
| 橋脚 | 門型（portal_frame） | **新規重点** |
| 基礎 | 直接基礎（spread） | 杭なしフーチング |
| 基礎 | 場所打ち杭（bored_pile） | 現状維持 |
| 基礎 | 鋼管杭（steel_pipe） | pileType追加 |

---

## 4. 配置方式（P02 Freeze確認）

| 優先順 | 方式 | 採用 |
|--------|------|------|
| PRIMARY | LINER線形+測点+Offset | **標準** |
| SECONDARY | LINER平面図から選択 | 補助（P03要件） |
| EXCEPTION | XYZ直接指定 | 例外（制限付き） |

**責任分界（再確認）：**

| データ | 正本 | 編集可否 |
|--------|------|---------|
| X/Y/tangent/transverse | LINER算出値 | **読取専用** |
| station/offset/skew | Substructure Model | 編集可 |
| Z | LINER縦断優先 | 手動override可 |
| supportId | Substructure Model | 編集可 |
| 形状寸法 | Substructure Model | 編集可 |

---

## 5. ファイル境界（FILES TO ADD / MODIFY / REUSE / NOT TO MODIFY）

### 5.1 FILES_TO_ADD（新規：17ファイル）

```
frontend/src/substructure/
  ├── model.ts                          # Substructure型定義
  ├── validation.ts                     # バリデーション
  ├── SupportPlacementEngine.ts          # 支点配置計算Connector
  ├── SubstructureSolidGenerator.ts      # 3D形状生成（単柱/壁式/門型/橋台/基礎）
  ├── PlanProjection.ts                 # 2D平面投影
  ├── sampleDefaults.ts                 # サンプルデフォルト値
  ├── sampleGenerator.ts                # サンプル自動生成
  ├── projectSubstructureAdapter.ts     # project.json ↔ SubstructureModel変換
  ├── state.ts                          # 選択状態管理（React context）
  ├── history.ts                        # Undo/Redo履歴管理
  ├── pages/SubstructurePlanningPage.tsx # メインページ
  ├── components/SubstructureTreePanel.tsx
  ├── components/SubstructurePropertyPanel.tsx
  ├── components/PierInputForm.tsx
  ├── components/PortalPierInputForm.tsx
  ├── components/AbutmentInputForm.tsx
  ├── components/FoundationInputForm.tsx
  ├── components/PileInputPanel.tsx
  ├── components/SubstructurePlanPreview.tsx
  ├── components/Substructure3DPreview.tsx
  ├── components/CoordinateTable.tsx
  ├── components/SampleCreationDialog.tsx
  ├── hooks/useSubstructureSelection.ts
  ├── hooks/useSubstructureHistory.ts
  ├── hooks/useSubstructureRealtimeUpdate.ts
  └── __tests__/*.test.ts              # テストファイル（後述）
```

**合計新規：25〜30ファイル**（内訳：model系4、engine系4、component系12、hook系3、page系1、test系〜8）

### 5.2 FILES_TO_MODIFY（変更：7ファイル）

| # | ファイル | 変更内容 | リスク |
|---|---------|---------|--------|
| 1 | `frontend/src/liner/uiPreparation.ts` | `LinerUiRouteId` に `"liner.substructure"` 追加、path定義 | LOW |
| 2 | `frontend/src/App.tsx` | ルーティング分岐追加（after line 1217） | MED |
| 3 | `frontend/src/viewer/types.ts` | `SceneGroups` に substructure 用 Group 追加、`ViewerVisibility` 拡張 | LOW |
| 4 | `frontend/src/viewer/SceneBuilder.ts` | `rebuildApolloVisualizationScene()` 内で SubstructureRenderer 呼出し | LOW |
| 5 | `frontend/src/liner/pages/LinerFormalDrawingWorkspacePage.tsx` | displayControls に Overlay トグル追加 | LOW |
| 6 | `frontend/src/liner/drawing/builders/formalBuilders.ts` | `planLayers` 配列に substructure レイヤ追加の呼出し | LOW |
| 7 | `schemas/project.schema.json` | `substructure` フィールド追加（optional） | MED（backward compat） |

### 5.3 FILES_TO_REUSE（再利用：15ファイル）

| # | ファイル | 再利用方法 |
|---|---------|-----------|
| 1 | `liner/core/coordinate3d.ts` | `pointAtStationOffset()` をSupportPlacementEngineから呼出し |
| 2 | `liner/core/bridge/pierLineGeometry.ts` | `pierLineDirectionFromSkew()` / `normalizeSkewAngleRad()` |
| 3 | `liner/core/bridge/bridgeLayoutEvaluation.ts` | `evaluateBridgeLayout()` |
| 4 | `liner/drawing/model/document.ts` | `DrawingLayer` 型 |
| 5 | `liner/drawing/model/primitives.ts` | `DrawingPrimitive` 型（2D投影の出力型） |
| 6 | `liner/drawing/rendering/DrawingDocumentSvg.tsx` | layer.visible フィルタ |
| 7 | `liner/drawing/transforms/affineTransform2.ts` | 2D座標変換 |
| 8 | `apollo/visualization/types.ts` | `ApolloSolidGeometryParameter` 型 |
| 9 | `apollo/visualization/builder.ts` | 上部工3D生成（変更せず利用） |
| 10 | `viewer/renderers/ApolloVisualizationRenderer.ts` | 上部工描画（変更せず利用） |
| 11 | `viewer/ThreeViewport.tsx` | 3DScene管理（変更せず利用） |
| 12 | `contracts/stableEntityId.ts` | `createStableEntityId()` |
| 13 | `substructure-planning/prototype/src/geometry.ts` | 3D生成ロジックの流用元 |
| 14 | `substructure-planning/prototype/src/validation.ts` | バリデーションロジックの流用元 |
| 15 | `schemas/substructure/*.json` | データ形式の設計根拠（変更せず参照のみ） |

### 5.4 FILES_NOT_TO_MODIFY（変更禁止：14ファイル）

| # | ファイル | 理由 |
|---|---------|------|
| 1 | `frontend/src/liner/core/*` | 線形計算ロジック変更禁止 |
| 2 | `frontend/src/liner/adapters/*` | 既存Draft更新ロジック変更禁止 |
| 3 | `frontend/src/liner/schema/*` | LINER Schema変更禁止 |
| 4 | `frontend/src/apollo/visualization/*` | 上部工可視化変更禁止 |
| 5 | `frontend/src/apollo/export/*` | STL出力変更禁止 |
| 6 | `frontend/src/apollo/bridgeStructure/*` | BSDD生成変更禁止 |
| 7 | `frontend/src/apollo/ApolloPhase1Shell.tsx` | Apollo Shell変更禁止 |
| 8 | `frontend/src/viewer/coordinateTransform.ts` | 座標変換ポリシー変更禁止 |
| 9 | `frontend/src/viewer/ThreeViewport.tsx` | Scene管理変更禁止 |
| 10 | `frontend/src/viewer/renderers/ApolloVisualizationRenderer.ts` | 上部工描画変更禁止 |
| 11 | `schemas/substructure/*.json` | 既存Schema変更禁止 |
| 12 | `backend/` 全ファイル | バックエンド変更禁止 |
| 13 | `substructure-planning/prototype/` | 独立プロトタイプ維持 |
| 14 | `desktop/electron/` 全ファイル | Electron変更禁止 |

---

## 6. モジュール構成

```
frontend/src/substructure/
├── model.ts                    # 全データ型定義（SupportType, Pier, Abutment, Footing...）
├── validation.ts               # バリデーション（P02 FATAL/WARNING判定）
├── SupportPlacementEngine.ts   # Connector 1: LINER→Substructure
├── SubstructureSolidGenerator.ts # 3D形状生成（全形式対応）
├── PlanProjection.ts           # 2D平面投影（共通DrawingPrimitive出力）
├── sampleDefaults.ts           # サンプルデフォルト寸法（技術検証用）
├── sampleGenerator.ts          # サンプル+LINER支点自動生成
├── projectSubstructureAdapter.ts # Connector 5: project.json↔SubstructureModel
├── state.ts                    # 選択状態 (React Context)
├── history.ts                  # Undo/Redo履歴
├── pages/
│   └── SubstructurePlanningPage.tsx  # メインページ（3ペイン構成）
├── components/
│   ├── SubstructureTreePanel.tsx     # 左ペイン：部材ツリー
│   ├── SubstructurePropertyPanel.tsx # 右ペイン：プロパティ編集
│   ├── PierInputForm.tsx             # 単柱/壁式 入力
│   ├── PortalPierInputForm.tsx       # 門型 入力
│   ├── AbutmentInputForm.tsx         # 逆T式/ラーメン式 入力
│   ├── FoundationInputForm.tsx       # 基礎形式 入力
│   ├── PileInputPanel.tsx            # 杭入力（平面図連動）
│   ├── SubstructurePlanPreview.tsx   # 2D SVG プレビュー
│   ├── Substructure3DPreview.tsx     # 3D R3F Canvas プレビュー
│   ├── CoordinateTable.tsx           # 座標表
│   └── SampleCreationDialog.tsx      # サンプル作成
├── hooks/
│   ├── useSubstructureSelection.ts   # 選択同期
│   ├── useSubstructureHistory.ts     # Undo/Redo操作
│   └── useSubstructureRealtimeUpdate.ts # リアルタイム更新(debounce)
└── __tests__/                       # テスト
```

---

## 7. Connector実装計画

### 7.1 Connector #1: LINER → Substructure Placement

| 項目 | 内容 |
|------|------|
| 入力 | `PierResult[]` + `CanonicalLinerIntermediateResult` |
| 出力 | `SupportPlacement[]` |
| 正本 | LINER `coordinate3d.ts:pointAtStationOffset()` |
| ファイル | `frontend/src/substructure/SupportPlacementEngine.ts` |
| 主処理 | ①station→pointAtStationOffset→XYZ ②skew適用→localFrame ③bearingSeat位置計算 |
| エラー | station範囲外→clamp+warning、linar未定義→FATAL |
| トリガー | station/offset/skew変更時、LINER線形変更時 |

### 7.2 Connector #2: Apollo → Substructure Support（参照のみ）

| 項目 | 内容 |
|------|------|
| 入力 | `BsddSupport[]` |
| 出力 | supportId 対応表 |
| 正本 | Apollo BSDD（参照のみ） |
| 方針 | 下部工はApollo BSDDを変更しない。supportIdの対応のみ管理 |

### 7.3 Connector #3: Substructure → Unified 3D

| 項目 | 内容 |
|------|------|
| 入力 | `SubstructureModel` + `SupportPlacement[]` |
| 出力 | `ApolloSolidGeometryParameter[]`（source="substructure"） |
| ファイル | `frontend/src/substructure/SubstructureSolidGenerator.ts` |
| 処理 | ①寸法→Box/Cylinder ②localFrame→Matrix4配置 ③Apollo形式に変換 |

### 7.4 Connector #4: Substructure → LINER Plan Overlay

| 項目 | 内容 |
|------|------|
| 入力 | `SubstructureModel` + `SupportPlacement[]` |
| 出力 | `DrawingPrimitive[]`（substructure-overlayレイヤ用） |
| ファイル | `frontend/src/substructure/PlanProjection.ts` |
| 処理 | ①3D→XY投影 ②AffineTransform2でLINER座標変換 ③DrawingPrimitive生成 |

### 7.5 Connector #5: Project Save/Load

| 項目 | 内容 |
|------|------|
| 入力 | `SubstructureModel` |
| 出力 | `project.json.substructure` |
| ファイル | `frontend/src/substructure/projectSubstructureAdapter.ts` |
| 保存 | `SubstructureModel` を project.json 互換JSONへ変換 |
| 読込 | project.json から SubstructureModel へ復元 |

---

## 8. 実装順序（14 Stage）

### Stage 1: Data Model / Schema（基盤）

| 項目 | 内容 |
|------|------|
| 入力 | P01形式定義、P02配置定義 |
| 出力 | `model.ts`, `validation.ts` |
| ファイル | model.ts, validation.ts |
| テスト | model 型チェック、validation FAIL/PASS |
| Gate | 全C1形式が型定義できていること |
| 依存 | なし |

### Stage 2: Placement Connector / Coordinate

| 項目 | 内容 |
|------|------|
| 入力 | model.ts、LINER coordinate3d.ts |
| 出力 | `SupportPlacementEngine.ts` |
| ファイル | SupportPlacementEngine.ts |
| テスト | 直橋 station→XYZ一致、skew→localFrame一致、範囲外FATAL |
| Gate | 直橋/斜橋/曲線橋で配置計算が成立 |
| 依存 | Stage 1 |

### Stage 3: Geometry Generators

| 項目 | 内容 |
|------|------|
| 入力 | model.ts、SupportPlacementEngine.ts |
| 出力 | `SubstructureSolidGenerator.ts` |
| ファイル | SubstructureSolidGenerator.ts |
| テスト | 単柱/門型/逆T式のBox個数、dimensions一致、stableId |
| Gate | 全C1形式の3D Meshが生成できる |
| 依存 | Stage 1, 2 |

### Stage 4: 2D Plan Projection

| 項目 | 内容 |
|------|------|
| 入力 | model.ts、SupportPlacementEngine.ts |
| 出力 | `PlanProjection.ts` |
| ファイル | PlanProjection.ts |
| テスト | フーチング投影矩形、杭十字位置、skew回転、寸法 |
| Gate | 全形式の2D投影が成立 |
| 依存 | Stage 1, 2 |

### Stage 5: State / Selection / History

| 項目 | 内容 |
|------|------|
| 入力 | model.ts |
| 出力 | `state.ts`, `history.ts` |
| ファイル | state.ts, history.ts |
| テスト | 選択同期、Undo/Redoのstate復元 |
| Gate | 選択状態がReact Contextで管理できている |
| 依存 | Stage 1 |

### Stage 6: State/Selection Hooks

| 項目 | 内容 |
|------|------|
| 出力 | `useSubstructureSelection.ts`, `useSubstructureHistory.ts`, `useSubstructureRealtimeUpdate.ts` |
| ファイル | hooks/配下3ファイル |
| テスト | Debounce動作、選択同期、history push/pop |
| Gate | 3 hookが独立して動作確認済み |
| 依存 | Stage 5 |

### Stage 7: UI Shell / Routing / Main Entry

| 項目 | 内容 |
|------|------|
| 入力 | state.ts |
| 出力 | `SubstructurePlanningPage.tsx` |
| ファイル | SubstructurePlanningPage.tsx、uiPreparation.ts、App.tsx |
| テスト | ルーティング成立、project handoff |
| Gate | メイン画面から下部工ページへ到達しデータ引き継ぎ完了 |
| 依存 | Stage 5, 6 |

### Stage 8: 3D Preview（R3F Canvas）

| 項目 | 内容 |
|------|------|
| 入力 | SubstructureSolidGenerator |
| 出力 | `Substructure3DPreview.tsx` |
| ファイル | Substructure3DPreview.tsx |
| テスト | Orbit操作、選択ハイライト、地盤表示ON/OFF |
| Gate | 3D表示+基本操作+選択が成立 |
| 依存 | Stage 3, 5 |

### Stage 9: 2D Preview（SVG）

| 項目 | 内容 |
|------|------|
| 入力 | PlanProjection.ts |
| 出力 | `SubstructurePlanPreview.tsx` |
| ファイル | SubstructurePlanPreview.tsx |
| テスト | 投影図形表示、選択ハイライト |
| Gate | 2D表示+選択が成立 |
| 依存 | Stage 4, 5 |

### Stage 10: Property Panel + Input Forms

| 項目 | 内容 |
|------|------|
| 出力 | 全InputForm + PropertyPanel |
| ファイル | SubstructurePropertyPanel.tsx, Pier/PortalPier/Abutment/Foundation/PileInputForm.tsx |
| テスト | 数値変更→state更新確認 |
| Gate | 全形式のパラメータ編集がUIから可能 |
| 依存 | Stage 5, 7 |

### Stage 11: Sample Generation

| 項目 | 内容 |
|------|------|
| 出力 | `sampleDefaults.ts`, `sampleGenerator.ts`, `SampleCreationDialog.tsx` |
| ファイル | 3ファイル |
| テスト | サンプル生成→全形式成立、LINER支点→自動生成 |
| Gate | 9種+LNER支点のサンプル生成が成立 |
| 依存 | Stage 1, 3, 4, 7 |

### Stage 12: LINER Overlay

| 項目 | 内容 |
|------|------|
| 入力 | PlanProjection.ts |
| 出力 | formalBuilders.ts 拡張、LinerFormalDrawingWorkspacePage.tsx 拡張 |
| ファイル | formalBuilders.ts（MODIFY）、LinerFormalDrawingWorkspacePage.tsx（MODIFY） |
| テスト | Overlayレイヤ追加確認、トグル表示/非表示 |
| Gate | LINER平面図に下部工が表示されトグルで制御可能 |
| 依存 | Stage 4, 7 |

### Stage 13: Unified 3D Integration

| 項目 | 内容 |
|------|------|
| 入力 | ApolloSolidGeometryParameter |
| 出力 | viewer/types.ts 拡張、SceneBuilder.ts 拡張 |
| ファイル | viewer/types.ts（MODIFY）、SceneBuilder.ts（MODIFY） |
| テスト | 上部工+下部工同一Scene表示、選択同期 |
| Gate | Apollo上部工と下部工が同一座標系で3D表示される |
| 依存 | Stage 3, 8 |

### Stage 14: Save/Load + Integration Tests

| 項目 | 内容 |
|------|------|
| 出力 | `projectSubstructureAdapter.ts`, project.schema.json 拡張 |
| ファイル | projectSubstructureAdapter.ts, project.schema.json（MODIFY） |
| テスト | JSON round-trip、既存データ互換、Golden Case全件 |
| Gate | save→load→再生成→値一致、既存regression全PASS |
| 依存 | Stage 1-13（全ステージ統合） |

---

## 9. 実装単位とCommit計画

| ID | 内容 | ファイル数 | 依存 |
|----|------|-----------|------|
| C1-I01 | Data model + validation | 2 | なし |
| C1-I02 | Placement engine | 1 | I01 |
| C1-I03 | Solid geometry generator | 1 | I01-I02 |
| C1-I04 | 2D plan projection | 1 | I01-I02 |
| C1-I05 | State + history + hooks | 5 | I01 |
| C1-I06 | UI shell + routing | 3 | I05 |
| C1-I07 | 3D preview (R3F) | 1 | I03, I05 |
| C1-I08 | 2D preview (SVG) | 1 | I04, I05 |
| C1-I09 | Property + input forms | 6 | I05-I06 |
| C1-I10 | Sample generation | 3 | I01, I03-I04 |
| C1-I11 | LINER overlay | 2(MODIFY) | I04 |
| C1-I12 | Unified 3D integration | 2(MODIFY) | I07 |
| C1-I13 | Save/Load + project schema | 2 | I01 |
| C1-I14 | Integration tests + Golden | 〜8 | I01-I13 |

---

## 10. PR戦略

### 10.1 判定：**単一PR（PR #C1）を推奨**

| 方式 | 評価 |
|------|------|
| 単一PR | **推奨**。全Stageが相互依存。中間状態で動作しない期間が発生するが、全体整合性の確認が容易。 |
| 複数PR | 非推奨。Stage 1-6 は画面なしで動作確認不可。Stage 7-13 はmodelなしで動作不可。 |

**単一PRの方針：**
- 全14 Stage を feature/phase-c1-3d-liner-integration に逐次commit
- 全Stage完了後にPR作成（Draft → Review → Merge）
- PRレビューではStage単位でレビュー可能（1commit=1Stage）

### 10.2 PR情報

| 項目 | 内容 |
|------|------|
| Branch | `feature/phase-c1-3d-liner-integration`（既存継続） |
| Base | `main` |
| 変更行数 | 見込み 〜5000行追加 / 〜100行変更 |
| 新規ファイル | 25〜30 |
| 変更ファイル | 7 |
| CI必須 | unit test / typecheck / regression / E2E |
| レビュー | 2 approvals required |
| Merge方式 | `--merge`（squash/rebase禁止） |

---

## 11. テスト戦略

### 11.1 テスト一覧

| 層 | フレームワーク | テスト数見込 | カバレッジ対象 |
|----|--------------|------------|--------------|
| Unit (model) | Vitest | 20 | validation、型安全、stableId |
| Unit (placement) | Vitest | 15 | station→XYZ、skew、range外 |
| Unit (geometry) | Vitest | 20 | Box個数、dimensions、stableId |
| Unit (projection) | Vitest | 15 | 矩形投影、杭配置、skew回転 |
| Unit (state/history) | Vitest | 10 | 選択同期、Undo/Redo |
| Unit (sample) | Vitest | 10 | サンプル生成確認 |
| 2D/3D parity | Vitest | 5 | XY投影一致確認 |
| Golden Case | Vitest | 6 | PC-01〜PC-06 |
| Integration | Vitest | 10 | LINER→Substructure→3D/2D接続 |
| Regression | Vitest | 既存全件 | LINER/Apollo/Contracts/Viewer |
| E2E | Playwright | 3 | 画面遷移、サンプル生成、保存/読込 |
| **合計** | | **〜100新規** | |

### 11.2 Golden Case 定義（再確認）

| Case | 橋種 | station | offset | skew | 確認項目数 |
|------|------|---------|--------|------|-----------|
| PC-01 | 直橋 | 3点 | 0 | 0° | 13 |
| PC-02 | 直橋+斜角 | 3点 | 0 | 30° | 13 |
| PC-03 | 曲線橋R=300 | 2点 | 0 | 0° | 13 |
| PC-04 | 曲線橋+斜角 | 2点 | 0 | 15° | 13 |
| PC-05 | XYZ直接指定 | N/A | N/A | 30° | 10（LINER関連除く） |
| PC-06 | LINER支点一括生成 | LINER PierResult | - | - | 10 |

---

## 12. Completion Gate（全19 Gate）

| # | Gate | 判定基準 | FAIL時 |
|---|------|---------|--------|
| G01 | MAIN_ENTRY_WORKS | /pro/liner/substructure に到達 | 実装継続不可 |
| G02 | ROUTING_WORKS | ルーティング成立 | 実装継続不可 |
| G03 | PROJECT_HANDOFF_WORKS | データ引継ぎ成立 | 実装継続不可 |
| G04 | LINER_PLACEMENT_WORKS | 線形+station+offset配置成立 | Blocking |
| G05 | DIRECT_XYZ_WORKS | 例外モード配置成立 | Minor |
| G06 | STRUCTURE_TYPES_WORK | 全C1形式生成可 | Blocking |
| G07 | PORTAL_PIER_WORKS | 門型橋脚生成可 | Blocking |
| G08 | PILE_FOUNDATION_WORKS | 杭基礎生成可 | Major |
| G09 | SAMPLE_GENERATION_WORKS | サンプル生成成立 | Major |
| G10 | PARAMETRIC_2D_UPDATE | 値変更→2D即時更新 | Major |
| G11 | PARAMETRIC_3D_UPDATE | 値変更→3D debounce更新 | Major |
| G12 | DIMENSION_DISPLAY | 2D/3D寸法表示 | Minor |
| G13 | LINER_PLAN_OVERLAY | LINER平面図Overlay | Blocking |
| G14 | UPPER_LOWER_3D_INTEGRATION | 上部工+下部工同一Scene | Blocking（Phase C1必須） |
| G15 | SELECTION_SYNC | Tree/2D/3D/LINER/Property同期 | Major |
| G16 | UNDO_REDO | 規定操作で成立 | Major |
| G17 | SAVE_LOAD | JSON round-trip | Blocking |
| G18 | GOLDEN_CASES | 全6Case PASS | Blocking |
| G19 | REGRESSION | 既存全テストPASS | Blocking |

**Phase C1 COMPLETE条件：** G01-G19 全 PASS

---

## 13. Risk Register

| # | リスク | Severity | Likelihood | 対策 |
|---|--------|----------|------------|------|
| R1 | degree/radian mismatch | HIGH | MED | SupportPlacementEngineで統一(radian)、UI表示のみdegree |
| R2 | skew定義不一致 | HIGH | LOW | P02でLINER定義(normal→tangent)に確定済み |
| R3 | Z source混乱 | MED | MED | LINER縦断優先、手動override可、fallback=0 |
| R4 | supportId衝突 | HIGH | LOW | validation.tsで重複チェック |
| R5 | stage間依存の連鎖 | MED | MED | Stage単位でrollback可能な設計 |
| R6 | LINER平面図regression | HIGH | LOW | 独立レイヤ追加で既存に影響なし |
| R7 | Apollo Scene競合 | MED | LOW | 新規SceneGroup追加のみ |
| R8 | R3F性能（杭多数時） | MED | LOW | 杭>100本でinstancing検討（Phase C1では対象外） |
| R9 | 選択desync | MED | MED | supportId唯一キー＋React contextで管理 |
| R10 | save/load後方互換 | HIGH | LOW | substructure fieldはoptional、default値補完 |
| R11 | mainとの並行開発競合 | MED | LOW | 変更7ファイルのみ。専用worktreeで分離 |
| R12 | main入口追加忘れ | HIGH | LOW | Completion Gate G01で検出 |

---

## 14. Rollback / Failure Boundary

| 状況 | Rollback範囲 | 方法 |
|------|-------------|------|
| Stage 1 (model) 失敗 | 新規ファイルのみ削除 | model.ts/validation.ts 削除 |
| Stage 2 (placement) 失敗 | 新規2ファイル | 同上 |
| Stage 3-4 (geom/proj) 失敗 | 新規ファイルのみ | 同上 |
| Stage 5-6 (state/hooks) 失敗 | 新規ファイルのみ | 同上 |
| Stage 7 (UI shell) 失敗 | 新規 + 変更2ファイル | git checkout uiPreparation.ts App.tsx |
| Stage 8-11 (UI) 失敗 | 新規ファイルのみ | substructure/components/ 削除 |
| Stage 12 (Overlay) 失敗 | 変更2ファイル | git checkout formalBuilders.ts LinerFormalDrawingWorkspacePage.tsx |
| Stage 13 (3D統合) 失敗 | 変更2ファイル | git checkout viewer/types.ts viewer/SceneBuilder.ts |
| Stage 14 (save/load) 失敗 | 新規1 + 変更1ファイル | git checkout project.schema.json |

**全Stageで新規ファイルは切り離し可能。既存LINER/Apolloへの影響は最小。**

---

## 15. 最終報告

```
BASE_MAIN_SHA: d36da3e53de36afdc5513d06d893f00d80b6913e
WORKTREE_PATH: /tmp/spacer-clone-phase-c1
FEATURE_BRANCH: feature/phase-c1-3d-liner-integration
WORKTREE_STATUS: clean

DESIGN_DOC_COUNT: 23（9設計書 + 5Freeze文書 + 9補助資料）
DESIGN_DOC_CONSISTENCY: PASS（BLOCKER: NONE, MINOR: NONE）

SCOPE_READY: YES（10完了条件確定）
FILE_BOUNDARY_READY: YES（ADD: 17+ / MODIFY: 7 / REUSE: 15 / NOT: 14）
MODULE_STRUCTURE_READY: YES（substructure/ 配下 4ディレクトリ）
DATA_MODEL_PLAN_READY: YES（model.ts 1ファイル）
SCHEMA_PLAN_READY: YES（project.json 1フィールド追加）
PLACEMENT_CONNECTOR_PLAN_READY: YES（SupportPlacementEngine.ts）
APOLLO_CONNECTOR_PLAN_READY: YES（supportId対応のみ、参照専用）
LINER_OVERLAY_PLAN_READY: YES（PlanProjection.ts → formalBuilders.ts拡張）
PLAN_PROJECTION_PLAN_READY: YES（PlanProjection.ts）
THREE_D_PLAN_READY: YES（Substructure3DPreview.tsx、R3F Canvas）
UI_IMPLEMENTATION_PLAN_READY: YES（12 component + 1 page）
MAIN_ENTRY_PLAN_READY: YES（uiPreparation.ts + App.tsx）
SAMPLE_GENERATION_PLAN_READY: YES（sampleDefaults.ts + sampleGenerator.ts）
DIMENSION_PLAN_READY: YES（PlanProjection.ts内で共用）
INTERACTION_PLAN_READY: YES（P03.5準拠）
UNDO_REDO_PLAN_READY: YES（history.ts）

FILES_TO_ADD_COUNT: 25〜30
FILES_TO_MODIFY_COUNT: 7
FILES_TO_REUSE_COUNT: 15
FILES_NOT_TO_MODIFY_COUNT: 14

IMPLEMENTATION_STAGE_COUNT: 14
IMPLEMENTATION_SEQUENCE_READY: YES（依存関係グラフ確定）
COMMIT_PLAN_READY: YES（C1-I01〜C1-I14）
PR_STRATEGY_READY: YES（単一PR、feature/phase-c1-3d-liner-integration → main）

UNIT_TEST_PLAN_READY: YES（〜100新規）
SCHEMA_TEST_PLAN_READY: YES（validation.tsで担保）
INTEGRATION_TEST_PLAN_READY: YES（10 integration tests）
UI_TEST_PLAN_READY: YES（3 E2E tests）
GOLDEN_CASES_READY: YES（6 Cases × 13確認項目）
REGRESSION_PLAN_READY: YES（既存全件PASS必須）
COMPLETION_GATE_READY: YES（19 Gate）
RISK_REGISTER_READY: YES（12 Risks）
ROLLBACK_PLAN_READY: YES（Stage単位で切り離し可能）

SOURCE_CODE_CHANGED: NO
SCHEMA_CHANGED: NO
UI_CODE_CHANGED: NO
TEST_CODE_CHANGED: NO

UNRESOLVED_BLOCKERS: NONE

PHASE_C1_IMPLEMENTATION_READY: YES
PHASE_C1_P04_VERDICT: FROZEN / GO
```

---

## 16. 実装開始チェックリスト

Phase C1 実装開始前に確認すべき事項：

```
□ 14 Stage の実装順序を理解している
□ 変更禁止14ファイルを把握している
□ 25+ 新規ファイルの責務を理解している
□ 7 変更ファイルの変更内容を把握している
□ Connector #1-#5 の入出力を理解している
□ 19 Completion Gate の通過条件を理解している
□ 6 Golden Cases の確認項目を理解している
□ P02配置方式（PRIMARY/SECONDARY/EXCEPTION）を理解している
□ P03.5 Interaction Design（直接ドラッグ禁止/数値入力正本）を理解している
□ 単一PR 戦略を理解している
```

全て ✓ の場合、Phase C1 実装を開始してよい。`/tmp/spacer-clone-phase-c1` が作業ディレクトリ。