# Phase 3-6 Main 3D Viewer 統合

> **対象:** `bridgeProject/integratedScene3d.ts` + `liner/samples/mountain-viaduct-500/viewer.tsx`

## データ経路

```
① LINER draft
  → buildBridgeProjectAlignment → buildBridgeProjectGeometry → buildCommonBridgeModel (CBDM)
  → buildBoundGeometryInput → DefaultGeometryEngine → GeometrySnapshot
  → buildSnapshotVisualizationModel → superstructure solids (②, global origin)
  → buildBoundSubstructure → makePlacementSnapshots → buildAllSupportSolids (③ SolidGroup, global origin)
  → buildIntegratedScene3d → terrain + road + ② + ③ を同一 three-space に融合
  → MountainViaduct3dViewer（integrated prop）で描画
```

## 座標系

| 系 | 定義 | 変換 |
|----|------|------|
| domain | x-east / y-north / z-up | — |
| three.js | x / y=height / z | `domainToThree: (x, z, -y)` |
| ③ SolidGroup | origin+basis は domain、part は support-local | origin・basis を domainToThree |
| ② girder/bearing | origin は global（snapshot 由来） | domainToThree |

- **deck/cross-beam の bridge-local origin は対象外**（文書化 limitation）。girder/bearing は global。

## 整合性検証（データ証明）

`verifyIntegratedConsistency`:
- 各 support の ③ solid origin（domain）== CBDM bridgeGeometry.supports の x/y/z
- ② bearing solid origin（three）== snapshot bearingPoint の domainToThree

## layer / viewer

- 既存 layer（terrain/road/superstructure/substructure/frame）・camera・selection・layer toggle を維持。
- `integrated` prop で ②③ solid を追加描画（SolidBoxLayer、basis→quaternion）。
