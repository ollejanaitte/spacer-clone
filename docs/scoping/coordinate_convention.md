# 座標規約

**Generated**: 2026-07-15  
**Git HEAD**: `fd21e30`

---

## 経路別 座標規約

### LINER Path

| 項目 | 値 | 根拠 |
|------|-----|------|
| X意味 | 線形面上：経路方向距離（累積） | `liner/core/types.ts:20-25` |
| Y意味 | 線形面上：直交距離 | `liner/core/grid/gridGeneration.ts:124` |
| Z意味 | 高程 = profileElevation + templateElevation + crossfallOffset | `gridGeneration.ts:127` |
| 単位 | m (length), rad (angle) | `CoordinateSystemMarker` |
| handedness | right | `liner/core/types.ts:22` |

### Legacy Bridge Wizard Path

| 項目 | 値 | 根拠 |
|------|-----|------|
| X意味 | 橋軸方向距離（span累積） | `bridge_fem_generator.py:89-96` |
| Y意味 | 断面方向距離（対称配置） | `bridge_fem_generator.py:35-86` |
| Z意味 | **0.0（全ノード同一高程）** | `bridge_fem_generator.py:167` |
| 単位 | m, kN | `bridge_fem_generator.py:367-374` |

### BridgeDefinition Generator Path

| 項目 | 値 | 根拠 |
|------|-----|------|
| X意味 | station * signX | `structuralModelGenerator.ts:244-248` |
| Y意味 | offset * signY | 同上 |
| Z意味 | 0 * signZ | 同上 |
| Sign flip | policy.sign.x/y/z に応じて | `structuralModelGenerator.ts:218-220` |

### Solver Path

| 項目 | 値 | 根拠 |
|------|-----|------|
| 座標 | project.json の nodes.x/y/z をそのまま | `backend/engine/model.py:184-239` |
| 変換 | なし（field-by-field parsing） | 同上 |

### Three.js Viewer Path

| 項目 | 値 | 根拠 |
|------|-----|------|
| OFF | model(x, y, z) → viewer(x, y, z) | `coordinateTransform.ts:66-76` |
| ON general | model(x, y, z) → viewer(x, z, y) | 同上 |
| ON liner | model(x, y, z) → viewer(x, z, -y) | `coordinateTransform.ts:86-98` |
| 重要 | **display-only**。JSON保存/API入力/解析結果に影響なし | `coordinateTransform.ts:7-16` |

---

## swap/sign flip 実測値

### テストケース: `{x=10, y=2, z=3}`

| 経路 | swap | 結果 | 根拠 |
|------|------|------|------|
| LINER + on | ON | `{x=10, y=3, z=-2}` | `test_asymmetric_coords.mjs` |
| General + on | ON | `{x=10, y=3, z=2}` | 同上 |
| Legacy FEM + off | OFF | `{x=10, y=2, z=0}` | `bridge_fem_generator.py:167` |
| Legacy FEM + on | ON | `{x=10, y=3, z=2}` | swap only（z=0 ため sign flip 不要） |

---

## Legacy FEM z=0

`bridge_fem_generator.py:167`:
```python
nodes.append({"id": nid, "x": float(x), "y": float(y), "z": 0.0, "label": nid})
```

- 構造的挙動（2D planar model を 3D に投影）
- Bug ではない

---

## Viewer 表示変換と保存値の分離

| 項目 | 表示変換 | 保存値 |
|------|----------|--------|
| 座標 | `applyViewerDisplayTransform` | project.json の nodes.x/y/z |
| 変形 | `applyViewerDisplayTransform` | 解析結果 ux/uy/uz |
| ロード | `modelNodalLoadToViewer` | `NodalLoad.fx/fy/fz` |
| swap設定 | localStorage | — |

**重要**: Viewer の軸 swap は表示のみ。保存データには影響しない。

---

## 単位

| 使用箇所 | 単位 | 根拠 |
|----------|------|------|
| LINER core | m, rad | `CoordinateSystemMarker` |
| FEM Model | m, kN | `project.schema.json` |
| DXF default | meters | `liner/dxf/model/units.ts:3` |
| DXF optional | millimeters | 同上 |
| Drawing paper | mm | viewportTransform |
| BridgeDefinition angle | "deg" or "rad" | `bridgeDefinition/types.ts:47` |
| DXF mapper | rad → deg | `mapDrawingPrimitive.ts:18` |

---

## Crossfall 符号規約

- `right_down_positive` 固定（`CrossSlopeDraft.signConvention`）
- `applyCrossSlope()`: `-(slopePercent/100) × offset`
- offset > 0（右側）+ slope > 0（右下がり）→ deltaZ negative（下がる）
