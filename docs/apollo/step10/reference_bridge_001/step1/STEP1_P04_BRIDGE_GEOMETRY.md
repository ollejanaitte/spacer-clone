# STEP 1-P04 — BRIDGE_GEOMETRY（Phase 6-2）設計

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計（Phase 6-2 実装対象）
> **正本:** `phase6_0/mapping/reference_bridge_001_geometry_mapping.csv`（GM-008..022）・`phase6_0/coordinates/*`・`phase6_0/connectors/*`・Phase 6-1 Geometry Core 実装

## 1. Phase 6-2 スコープ（backlog 6.2A..6.2E）

| Item | entity | mapping | 実装（STEP2 PR） |
|------|--------|---------|------------------|
| 6.2A | grid/panel points（端点 + HOLD 伝播） | GM-008..013 | 2-01 |
| 6.2B | deck reference / boundary | GM-014 | 2-02 |
| 6.2C | member placement + cross girder | GM-020..021 | 2-03 |
| 6.2D | bearing points | GM-022 | 2-04 |
| 6.2E | transverse / section frames + elevation + skew | GM-015 | 2-05 |

## 2. 設計方針

- 全 entity は `GeometrySnapshot` の型（`types.ts`）に追加し、`DefaultGeometryEngine` が生成する。
- 座標は全て Alignment Connector（LINER）経由。Phase 6-1 の `placement.ts` / `crossSectionFrame.ts` を拡張。
- unresolved（HOLD 中間格点・CONF-P2II-001・HCR-001）は伝播し、補間・捏造しない。
- plane-grid→global 座標変換は変換行列として宣言し、`coordinate_conversion_matrix.csv` に追記（DUP-030 解消）。

## 3. 新規 entity 定義（`types.ts` 拡張案）

```ts
// grid/panel points (extension of existing GridPoint)
GridPanelPoint = GridPoint & {
  panelIndex: number;       // 格間番号 (1..26)
  role: "endpoint" | "intermediate";  // intermediate => HOLD 伝播
};

// deck reference
DeckReference (extend) {
  widthM, thicknessM,               // ResolvedValue (G-GEO-0017/0018)
  boundary: Vec3[],                 // 床版境界 (snapshot 座標系)
  edgeOffsetM: { left: number; right: number };
}

// member placement reference (GM-020)
MemberPlacementReference {
  id, memberId, kind,               // mainGirder | crossBeam | swayBracing | lateralBracing | stiffener
  fromPointId, toPointId,           // GeometrySnapshot 上の端点
  localFrame,                       // member-local axes
}

// cross girder (GM-021)
CrossGirderReference {
  id, crossGirderId, stationM, offsetSpanM, connectedGirderIds[];
}

// bearing point (GM-022)
BearingPoint (extend) { supportId, girderId, position, localFrame }
```

## 4. RB-001 既知値（Golden 由来・実装の入力）

| entity | 値 | Golden |
|--------|-----|--------|
| 格点（端点） | GRID-1001/1027 (AG1), GRID-2001/2027 (AG2) | G-GEO-0009..0016（plane-grid ローカル座標） |
| 中間格点 | GRID-1002..1026 / 2002..2026 | HOLD（補間禁止） |
| 床版 | 全幅 8.01 m / 厚 0.23 m | G-GEO-0017/0018 |
| 主桁 | AG1/AG2, spacing 4.5 m, 高さ 2.7 m | G-GEO-0007/0008 |
| 横桁 | GE1/GE2/C1..C7（駅間配置） | DWG-MEM-GE1; STRMOD |
| 支承 | support×girder 対応 | GM-022 |
| 断面フレーム | SECTION-DECK | GIN-0050..0052 |

## 5. plane-grid→global 変換（Phase 6-2 で定義）

- RB-001 格点の Golden は plane-grid ローカル座標（X=橋軸方向距離, Y=横断）。これは
  直線 ACL（azimuth 0, 原点=橋始点）上では `globalX = planeX + 端部距離`, `globalY = planeY` に
  対応（端部距離 = 橋長 − 格点終端X から導出）とし、変換行列を conversion matrix に宣言。
- 変換は Geometry Engine 内の定義ステップのみ。consumer は snapshot を読むのみ。
- 端部距離等の推測値は使用しない（Golden から導出可能な値のみ）。

## 6. 未解決伝播（Phase 6-2）

- 中間格点（GRID/NODE 1002..1026, 2002..2026）: `HOLD_INSUFFICIENT_SOURCE` + `stateReason` 維持。
- CONF-P2II-001（フランジ 680/700）: section 生成で candidates 保持・選択なし。
- HCR-001: 91 レコード humanConfirmationId 保持。

## 7. テスト

- unit: 各 placement 関数（端点/中間/HOLD 伝播）
- integration: Geometry Engine → snapshot（RB-001 fixture）
- parity: Golden 値（G-GEO-0017/0018 等）照合
- 既存 36 tests 回帰維持
