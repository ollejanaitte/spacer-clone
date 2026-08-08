# STEP-1 P05 — 3D Geometry Contract Design（凍結）

Status: FROZEN（Step2で backend 側データ契約のみ実装。Three.js/UI は Step3）

## 1. Purpose
道路中心線・道路端・横断面・Pier/Girder/Node を単一の座標系で3D描画するために、
backend から frontend（Three.js/UI）へ渡す immutable な3D Geometry ペイロード契約を
確定する。Step2 で backend 側のペイロード生成を、Step3 で描画を実装する。

## 2. Scope
- 3D ペイロードの Entity と契約（centerline / edge / section / pier / girder / node）
- 座標系・station / offset / elevation の定義
- immutable payload 契約
- frontend への受け渡し形式（JSON 互換）
- Three.js/UI への責務境界（本Stepでは描画実装しない）

## 3. Non-scope（本設計で実装しない）
- Three.js 描画・カメラ・インタラクション（Step3）
- STL 出力の最終仕様（既存 linerFrameStl は別途維持）
- UI コンポーネント

## 4. 既存正本（再利用）
- frontend/src/liner/core/coordinate3d.ts（PointAtStationOffsetValue / LocalFrame /
  ZProvenance / CrossSectionOffsetLineElevation）
- X4-D RoadGeometryResult（station / XY / Z / heading / tangent / normal /
  curvature / width / crossfall / left-right edge / section points）
- P01 VerticalResult（Z の producer）
- P03 BridgeGeometryResult（pier / girder / node / skew）

## 5. 3D Geometry ペイロード契約（凍結）

### 5.1 座標系
- グローバル右手系: X（道路起算点基準）、Y、Z 上向き（標高）
- azimuth は X 軸からの反時計回り（X4-A と同一）
- 全座標はメートル、float（JSON 互換で数値として保持）
- 3D 表示はこのグローバル系をそのまま使用（表示のみスケール/原点調整）

### 5.2 Centerline
```
{ type:"centerline", points:[{station,x,y,z,heading,curvature,elementId}], units:"m" }
```
- X4-D を station 列でサンプリング

### 5.3 Road Edge
```
{ type:"road-edge", side:"left"|"right", points:[{station,x,y,z}] }
```
- X4-D left/right edge を station 列でサンプリング

### 5.4 Cross Section
```
{ type:"cross-section", station, points:[{pointId,side,offset,x,y,z,segmentId}] }
```
- X4-C/D section points（P01 で Z を補完）

### 5.5 Pier
```
{ type:"pier", pierId, station, skewDeg, supports:[{nodeId,x,y,z}] }
```

### 5.6 Girder / Node
```
{ type:"girder", girderId, lineSide, transverseOffset, nodes:[{nodeId,pierId,station,x,y,z}] }
```

### 5.7 BridgeBundle（全体）
```
BridgeGeometry3dPayload {
  coordinateSystem: "global";
  units: "m";
  alignmentId: string;
  centerline: Centerline3d;
  edges: { left: Edge3d; right: Edge3d };
  sections: CrossSection3d[];
  piers: Pier3d[];
  girders: Girder3d[];
  nodes: Node3d[];
  provenance: { sourceVersion, generators:["x4d","vertical","bridge-geometry"], generatedAt };
}
```
- 全ての配列要素は immutable（生成後変更しない）
- JSON.stringify で frontend へ渡す

## 6. 責務境界
- backend: ペイロード生成（`backend/rule_engine/geometry3d/` 新設想定）
  - X4-D / Vertical / BridgeGeometry の結果を JSON 互換ペイロードへ整形
  - 数値計算は全て既存 layer に委譲（3D パッケージは整形のみ）
- frontend: ペイロード受領 → Three.js で描画（Step3）
  - 描画・カメラ・インタラクションは backend と無関係
- ペイロードは「描画の入力」であり、計算結果の primary source ではない
  （数値の正本は X4-D / Vertical / BridgeGeometry）

## 7. バリデーション / エラー契約
- 座標の finite チェック（NaN/inf はペイロード生成時に ERROR）
- pier/girder/node が bridge_geometry の結果と一致
- サンプリング station が alignment 範囲内
- エラー時は `{ok:false, error:{code, message}}`（frontend の coordinate3d 方式と互換）

## 8. Numeric tolerance
- 座標: 内部 float64、出力 JSON は表示桁 6桁（0.000001）を目安（P04 丸め規約の 3D 版）
- 描画用に更に丸めるのは frontend 側

## 9. Test strategy
- unit: 各 Entity ペイロード生成・immutable・finite チェック
- 統合: X4-D/Vertical/BridgeGeometry の結果がペイロードと一致
- JSON シリアライズ → deserialize で座標不変
- Golden: P06 replay で実案件の3Dペイロードを比較

## 10. Traceability
- frontend/src/liner/core/coordinate3d.ts
- X1-8 GEOMETRY_ENGINE_BOUNDARY.md（3Dは非責務）
- P01 / P03 / P04 設計書
- SRC-009 サンプル道路設計図（3D表示の参考）

## 11. Acceptance criteria（Step2用）
- [ ] backend/rule_engine/geometry3d/ が BridgeGeometry3dPayload を生成
- [ ] 全座標 finite・immutable・JSON 互換
- [ ] 既存 X4-D / Vertical / BridgeGeometry と数値一致
- [ ] 実案件 replay（P06）で 3D ペイロードも比較可能
- [ ] UI 変更なし（Step3 で描画）
