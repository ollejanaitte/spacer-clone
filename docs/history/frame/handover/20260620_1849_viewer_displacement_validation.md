# 作業報告書：Viewer変位表示総点検・固有値モード表示修正

## 実施概要

3D Viewerにおける固有値解析結果の変位表示不具合を調査・修正し、全解析種別での変位表示整合性を確認した。また、将来の回転DOF（RX/RY/RZ）可視化拡張に向けた設計書を作成した。

## 調査結果

### 原因

`frontend/src/viewer/animation.ts` の `resolveAnimationDisplacementMap` 関数が、常にデモモード形状（`computeDemoModeShape`）を返していた。

```typescript
// 修正前
export function resolveAnimationDisplacementMap(
  project: ProjectModel,
  options: AnimationOptions,
): Map<string, DisplacementVector> {
  return computeDemoModeShape(project, options.demoDirection); // 常にデモ
}
```

`AnimationOptions` 型に `useDemo` フラグと `modeNo` が定義されていたが、実際に使用されることはなかった。`EigenShapeLookup` 型（line 53）も定義されていたが接続されていなかった。

### 影響範囲

- 固有値解析後のアニメーション（振動表示）が、常に仮想のデモモード形状を表示していた
- 静的変形図（黄色いオブジェクト）は正しく動作していた（`createDisplacementMap` は固有値データを正しく使用）
- `useDemo` トグルをOFFにしても効果がなかった

## 修正内容

### 1. `frontend/src/viewer/animation.ts`

- `resolveAnimationDisplacementMap` に `result?: AnalysisResult | null` と `selectedEigenMode?: number` パラメータを追加
- `useDemo === false` で `result.eigenResult` が存在する場合、指定モードの実際のモード形状を使用
- モードが存在しない場合はデモモードにフォールバック
- `withNodeDisplacement` に同パラメータを追加し、`resolveAnimationDisplacementMap` に渡す

### 2. `frontend/src/viewer/ThreeViewport.tsx`

- `animationOverrideFor` 関数で `props.result` と `props.selectedEigenMode` を `withNodeDisplacement` に渡すよう修正

### 3. テスト追加（`frontend/src/viewer/animation.test.ts`）

- `useDemo: true` の場合にデモマップを返す
- `useDemo: false` で結果なしの場合にデモマップを返す
- `useDemo: false` で固有値結果なしの場合にデモマップを返す
- `useDemo: false` で固有値結果ありの場合に実際のモード形状を返す
- `useDemo: false` で存在しないモード番号の場合にデモにフォールバック
- `withNodeDisplacement` で固有値データを使用する

### 4. 変位表示総点検

| 解析種別 | UX | UY | UZ | 状態 |
|---------|----|----|-----|------|
| 静的解析 | ✅ | ✅ | ✅ | `createDisplacementMap` → `result.displacements` から正しく抽出 |
| 固有値解析 | ✅ | ✅ | ✅ | `createDisplacementMap` → `eigenResult.modes[].shape` から正しく抽出。アニメーションも修正後は正しく動作 |
| 応答スペクトル解析 | ✅ | ✅ | ✅ | `createDisplacementMap` → `getResponseSpectrumDisplacements` から正しく抽出 |
| 時刻歴解析 | ✅ | ✅ | ✅ | `timeHistoryNodeOverride` 経由で正しく表示 |

### 5. SPACER座標系との整合性

- 静的変形図: `createDisplacementMap` で `applySpacerAxisSwap(ux, uy, uz, swap)` を適用済み ✅
- アニメーション: `createNodeMap` で座標変換適用済み。変位ベクトルも同じ座標系で加算される ✅
- 回転DOF: 将来設計で `docs/design/rotation-visualization-design.md` を作成

## 変更ファイル一覧

| ファイル | 変更種別 |
|---------|---------|
| `frontend/src/viewer/animation.ts` | 修正 |
| `frontend/src/viewer/ThreeViewport.tsx` | 修正 |
| `frontend/src/viewer/animation.test.ts` | テスト追加 |
| `docs/design/rotation-visualization-design.md` | 新規作成 |
| `docs/history/frame/handover/2026-06-next-tasks.md` | 更新 |
| `docs/history/frame/handover/20260620_1849_viewer_displacement_validation.md` | 本報告書 |

## テスト結果

```
 Test Files  40 passed (40)
      Tests  439 passed (439)
   Duration  12.36s
```

## ビルド結果

```
✓ built in 13.69s
dist/index.html                     0.40 kB
dist/assets/index-z5xpE_Sg.css     45.42 kB
dist/assets/index-qrtIxor4.js   1,802.49 kB
```

## Git情報

- ブランチ: main
- 作業ブランチ: feature/displacement-validation
- コミット: 後述

## 今後の課題

### 回転DOF可視化（設計完了、未実装）

- `docs/design/rotation-visualization-design.md` で設計完了
- 推奨案: 回転矢印表示（案A）
- Phase 1: RX/RY/RZ矢印表示、rotationScale、SPACER変換
- Phase 2: 部材剛体回転（将来拡張）

### その他残課題

- Line2 / LineMaterial による確実な線幅制御
- ラベル衝突回避
- A/B比較：差分テーブル、同期再生、Bモデル永続保存
- ビルドサイズ最適化（1.8MB → code splitting）
