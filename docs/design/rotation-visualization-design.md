# 回転自由度（RX/RY/RZ）可視化拡張 設計メモ

## 1. 現状構成

### 1.1 データフロー

```
Backend API
  → result.displacements[].{rx, ry, rz}
  → result.eigenResult.modes[].shape[].{rx, ry, rz}
  → result.responseSpectrumResult.combinedResult.displacements[].{rx, ry, rz}
      ↓
Frontend resultViewModel.ts
  → DisplacementViewModel.items[].{rx, ry, rz}
      ↓
Viewer createDisplacementMap() (threeUtils.ts)
  → Map<nodeId, THREE.Vector3>   ← UX, UY, UZ のみ抽出
      ↓
DeformedShapeRenderer / Animation
  → node.position = base + displacement * scale
```

### 1.2 現在の制限

- `createDisplacementMap` (`threeUtils.ts:226-255`) は `ux, uy, uz` のみ抽出し、`rx, ry, rz` は無視
- `DisplacementVector` (`animation.ts:51`) は `{ux, uy, uz}` のみ
- `DeformedShapeRenderer` は並進変位のみ適用
- `withNodeDisplacement` (`animation.ts`) も並進変位のみ
- 回転DOFの数値結果は `DisplacementViewModel` として表示されるが、3D可視化には未反映

### 1.3 対象解析

| 解析種別 | rx/ry/rz データ | 3D可視化 |
|---------|----------------|---------|
| 静的解析 | backend が返す | 未実装 |
| 固有値解析 | `eigenResult.modes[].shape[].{rx,ry,rz}` | 未実装 |
| 応答スペクトル解析 | `combinedResult.displacements[].{rx,ry,rz}` | 未実装 |
| 時刻歴解析 | `displacement history.{rx,ry,rz}` | 未実装 |

## 2. 問題点

### 2.1 回転量の視覚的表現方法

並進変位は節点座標に直接加算できるが、回転は「どのオブジェクトを、どのように回転させるか」が曖昧。

候補：

1. **矢印による回転方向表示**: 節点に回転軸方向の矢印を配置。矢印の長さが回転量を表す。
   - 利点: 直感的、実装が容易
   - 欠点: 部材の実際の回転が見えない

2. **部材の剛体回転**: 部材要素を i 端・j 端の回転で剛体回転させる。
   - 利点: 実際の変形状態が見える
   - 欠点: 回転の表現が複雑、ビジュアルが乱れやすい

3. **回転円弧矢印**: 節点周辺に回転方向の円弧矢印を描画。
   - 利点: 回転の方向と大きさが明確
   - 欠点: 3Dでの描画が複雑、他のオブジェクトと衝突しやすい

### 2.2 表示倍率の問題

- 並進変位はメートル単位で `deformationScale` に比例
- 回転はラジアン単位（通常 1e-3 ～ 1e-5 オーダー）
- 回転用の独立した `rotationScale` パラメータが必要

### 2.3 SPACER座標系との整合性

- 並進変位: `applySpacerAxisSwap(ux, uy, uz, swap)` で Y/Z が入れ替わる
- 回転: ベクトル回転のため、軸入れ替えルールが並進と異なる
  - RX → RY (swap ON)
  - RY → RX (swap ON)
  - RZ → RZ (swap ON)

## 3. 候補案

### 案 A: 回転矢印表示（推奨）

- 節点位置に回転軸方向の矢印を配置
- 矢印の色: RX=赤, RY=緑, RZ=青（軸色と統一）
- 矢印の長さ: `rotationValue * rotationScale`
- ユーザーが ON/OFF 切り替え可能
- 表示サイズUIに「回転矢印サイズ」を追加

### 案 B: 部材剛体回転

- 部材の i 端・j 端の回転で部材全体を回転
- 実際の変形状態が最も近い
- しかし実装が複雑で、密なモデルでは描画が不安定

### 案 C: 回転円弧矢印

- 節点周辺に円弧矢印を描画
- 回転の方向と大きさが明確
- しかし3Dでの描画が複雑

## 4. 推奨案

**案 A（回転矢印表示）** を推奨する。

理由:

1. 実装が比較的容易（既存の荷重矢<quote>描画と同じパターン）
2. 直感的に回転方向が分かる
3. 他の表示（並進変位、部材力）と衝突しにくい
4. 段階的に拡張可能（まず RX のみ → RY/RZ 追加 → 部材回転追加）

### 4.1 実装計画

#### Phase 1: 回転矢印表示（最小実装）

- `RotationArrowRenderer.ts` を新規作成
- 節点位置に回転軸方向の矢印を描画
- RX=赤, RY=緑, RZ=青
- `ViewerVisibility` に `rotationArrows`, `rotationArrowRx`, `rotationArrowRy`, `rotationArrowRz` を追加
- `ViewerScales` に `rotationScale` を追加
- `ViewerControls` に回転矢印表示ON/OFFトグルとrotationScaleスライダーを追加
- SPACER座標系変換を適用

#### Phase 2: 部材回転表示（将来拡張）

- 部材の i 端・j 端の回転で部材要素を剛体回転
- 実装の複雑さと利便性を検証してから採用判断

### 4.2 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/viewer/renderers/RotationArrowRenderer.ts` | 新規作成 |
| `frontend/src/viewer/types.ts` | `ViewerVisibility` に回転フラグ追加、`ViewerScales` に `rotationScale` 追加 |
| `frontend/src/viewer/SceneBuilder.ts` | `renderRotationArrows` 呼び出し追加 |
| `frontend/src/viewer/ViewerControls.tsx` | 回転矢印表示UI追加 |
| `frontend/src/viewer/coordinateTransform.ts` | 回転ベクトルのSPACER変換関数追加 |
| `frontend/src/viewer/threeUtils.ts` | 回転データ抽出関数追加 |

### 4.3 テスト方針

- `RotationArrowRenderer` のユニットテスト（矢印生成、色、サイズ）
- `coordinateTransform` の回転ベクトル変換テスト
- `ViewerControls` の回転表示トグルテスト
- E2E: 回転矢印の表示/非表示切替テスト

## 5. まとめ

回転DOFの3D可視化は、まず「回転矢印表示」から始める。並進変位と同様に、解析結果から回転データを抽出し、3Dシーンに矢印として描画する。SPACER座標系変換、表示倍率、ON/OFF制御を既存パターンに合わせて実装する。
