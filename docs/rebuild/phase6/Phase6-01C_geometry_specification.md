# Phase 6-01 Step C: Geometry完全設計（凍結案）

## 1. 目的

Phase 6の下部工Geometryを既存資産（model.ts / geometryBase / SolidGenerator / SupportPlacementEngine）を最大利用して完全設計する。
各寸法のcanonical入力/derived/source/既定/禁則/validation/min-max/unitを凍結する。

- baseline: `261b2b068c336e374390b2e0ca6ffe01f9724a91`
- 日付: 2026-08-13

## 2. 共通規約

- 座標: domain = X道路軸 / Y横断 / Z標高（metric）。Three.js = renderCoordinate（x→x, y→z, z→-y）
- Project Origin / Local Origin分離・表示変換は正本を書き換えない
- skew: counterclockwise-positive（唯一）
- 下部工側でRoad geometry / Bridge Layout geometryを**再実装しない**（LINER正本・SupportPlacementEngine委譲）
- **frame規約**: base tangent frame（未skew）→ skewed support frame（skew適用は一箇所・二重適用禁止）を別名で管理
- support/bearing positionを再計算して別正本を作らない

## 3. Support共通

| 項目 | 規則 |
|---|---|
| supportId | A1/P1..Pn/A2（Bridge Layoutと一致・canonical） |
| station | physical distance [m]（canonical） |
| position XYZ | Project-global（derived参照・正本は複製しない） |
| tangent / transverse / vertical | local frame（実frame・6課題5解決） |
| skewRad | CCW（canonical） |
| bearing seat frame | support frame + skew適用 |

## 4. Abutment（橋台）

| 項目 | 寸法 | canonical/derived | min/max | unit |
|---|---|---|---|---|
| formType | inverted_t / cantilever_frame | canonical（enum） | — | — |
| backwall | height/thickness/width/seatElevation | canonical | >0 / >0 / >0 / finite | m |
| wingWall L/R | length/height/thickness | canonical | >0 | m |
| bridge seat | seatElevation | canonical | finite | m |
| bearing seats | 上部工Handoffから受領（BRG-ID） | derived | — | — |
| footing | length/width/thickness/topElevation | canonical | >0 | m |
| foundation | formType（spread/piled） | canonical | — | — |
| parapet | Phase 6-02では**OUT-OF-SCOPE**（DEFER） | — | — | — |
| stem/body | Phase 6-02ではOUT-OF-SCOPE（DEFER・概形のみ） | — | — | — |

- Terrain関係: ground elevation = terrainReferences参照（基礎高さ・根入れ計算入力）

## 5. Pier（橋脚）

| 項目 | 寸法 | canonical/derived | min/max | unit |
|---|---|---|---|---|
| formType | single_column_rect / wall / portal_frame | canonical（enum） | — | — |
| column | width（橋軸直角）/ depth（橋軸方向）/ height | canonical | >0 | m |
| columns（門型） | 同上・transverseOffset | canonical | >0 | m |
| cap | width/depth/height/overhangL/overhangR | canonical | >0 / >=0 | m |
| beam（門型） | width/depth/height/spanDirection | canonical | >0 | m |
| bearing seats | 上部工Handoffから受領 | derived | — | — |
| footing | length/width/thickness/topElevation | canonical | >0 | m |
| foundation | formType（spread/piled） | canonical | — | — |
| support center / bearing center relation | derived（frame + offset） | derived | — | — |

- Phase 6-02対象形式: **single_column_rect / wall / portal_frame**（既存solid生成の全形式）
- 詳細（柱断面鉄筋等）はOUT-OF-SCOPE（DEFER）

## 6. Footing（フーチング）

| 項目 | 規則 |
|---|---|
| id | canonical |
| length（橋軸方向）/ width（橋軸直角）/ thickness | canonical（>0 m） |
| topElevation | canonical（finite・derived基準可） |
| ground elevation | terrainReferences参照（derived） |
| 根入れ（embedment） | **derived = groundElevation - footingBottomElevation**（groundがfooting底より高い時正・単位m・統一） |

## 7. Foundation / Pile（基礎・杭）

| 項目 | 規則 |
|---|---|
| foundation formType | spread / piled（canonical） |
| pileType | bored_pile / steel_pipe（canonical enum） |
| diameter | canonical（>0 m） |
| pileCount | canonical（>=1） |
| spacing {x,y} | canonical（>0 m） |
| pileLength | canonical（>0 m） |
| pile head elevation | **derivedのみ（= footing bottom）**・入力欠落時はNOT_AVAILABLE |
| pile tip elevation | derived（= pile head - pileLength） |
| embedment | derived（terrain参照） |

- 杭配置（buildPileGrid / derivePileLayout）は既存KEEP資産を利用

## 8. 禁則・fallback（凍結）

- **寸法を発明しない**（MISSING許容・fallback値はallowed defaultのみ）
- allowed default: なし（全寸法はcanonical入力 or MISSING）
- forbidden fallback: 形状/寸法の勝手な推定・+0.25m等の発明値
- 配置/位置は正本（Bridge Layout/Superstructure Handoff）から再生成（再計算して別正本にしない）

## 9. 既存資産の再利用（Phase 6-02）

| 資産 | 利用 |
|---|---|
| model.ts（Support/PierData/AbutmentData/Footing/PileGroup/BearingSeat） | canonical型 |
| geometryBase / SolidGenerator / PierSolidGenerator / FoundationSolidGenerator | 3D solid生成 |
| PlanProjection | 2D計画図 |
| SupportPlacementEngine | placement・local frame |
| viewer3d | 3D表示（renderCoordinate統一） |

## 10. テスト（T6-GEO系）

- T6-GEO-001: support XYZ→3D基準
- T6-GEO-002: elevation→高さ基準
- T6-GEO-003: abutment形式（inverted_t/cantilever_frame）solid
- T6-GEO-004: pier形式（single/wall/portal）solid
- T6-GEO-005: footing/foundation/pile solid（既存tests再利用）
- T6-GEO-006: 寸法validation（>0・finite・MISSING許容）
- T6-GEO-007: 座標（renderCoordinate・Project/Local Origin分離）
