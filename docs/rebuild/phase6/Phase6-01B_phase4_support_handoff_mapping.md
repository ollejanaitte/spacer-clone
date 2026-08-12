# Phase 6-01 Step B: Phase 4 Support Handoff Adapter（凍結案）

## 1. 目的

Phase 4 Bridge Layout（Support Handoff）から下部工への正式入力をfield-levelで凍結する。
各fieldのsource→conversion→target→unit→nullable→fallback→validation→fail-closed→testまで確定。

- baseline: `b9e39d8bc2326e9f552174271b6c20523fe4665f`（Step A merge後）
- 日付: 2026-08-13

## 2. 入力（Support Handoff・供給元: buildSupportHandoff）

```ts
SupportHandoffItem {
  supportId, supportType, label, station,
  position { domainX, domainY, elevation },
  tangentAzimuthRad, skewAngleRad, skewSource,
  terrainElevation, roadReferenceId, coordinateContextId
}
```

## 3. field-level mapping（凍結）

| Phase 4 field | conversion | target（substructure側） | unit | nullable | fallback | validation | fail-closed | test |
|---|---|---|---|---|---|---|---|---|
| supportId | 直接 | `Support.supportId` | — | no | — | A1/P1..Pn/A2・一意・Bridge Layoutと一致 | 不一致reject（write reject） | T6-ADP-001 |
| supportType | kindマップ（abutment/pier。virtual_pierはpierへ） | `Support.supportType` | — | no | virtual_pier→pier（明示） | enum一致 | 不明kind reject | T6-ADP-002 |
| label | 直接 | （表示用） | — | yes | 空許容 | string | — | — |
| station | 直接（physical distance m） | `Support.placement.station` | m | no | — | finite・>=0 | NaN/Infinity reject | T6-ADP-003 |
| position.domainX | **新ConnectorでProject-global XYZ→placement基準へ**（表示/3D用・正本は複製しない） | geometry（3D） | m | no | — | finite | — | T6-GEO-001 |
| position.domainY | 同上 | geometry（3D） | m | no | — | finite | — | T6-GEO-001 |
| position.elevation | **support基準高**（road標高） | `Support.zOverride`候補 or derived高さ基準 | m | no | — | finite | — | T6-GEO-002 |
| tangentAzimuthRad | 直接 | placement azimuth（SupportPlacementEngine参照） | rad | yes | なし（LINER再計算可） | finite or null | nullはLINER由来に委譲 | T6-ADP-004 |
| skewAngleRad | 直接（CCW正） | `Support.skewRad` | rad | yes | null→0（CCW・明示） | finite or null | nullは0へ（自動・明示） | T6-ADP-005 |
| skewSource | 直接 | metadata | — | yes | "automatic"既定 | enum | — | — |
| terrainElevation | **新ConnectorでTerrain参照**（基礎高さ計算） | `terrainReferences` groundElevation | m | yes | null（Terrain未設定時） | finite or null | nullはwarning（embedment保留） | T6-TER-001 |
| roadReferenceId | alignmentIdへマップ | `roadReference.alignmentId` | — | yes | — | road module存在 | 未存在reject | T6-ADP-006 |
| coordinateContextId | 直接 | `coordinateContext` | — | yes | null | — | — | — |

## 4. 正規規約

- station: physical distance [m]（Bridge Layoutのstation体系そのもの）
- skew: **counterclockwise-positive**（唯一）
- position: Project-global XYZ（domain = 道路軸/横断/標高）。下部工側は**再計算せず**配置基準として受領
- terrainElevation: Terrain Module参照（複製しない）
- **下部工側でRoad geometryを再実装しない**（LINER単一正本・SupportPlacementEngine委譲）

## 5. Adapter境界（Compatibility Adapter）

```
Phase 4 Support Handoff（derived・transient）
  → supportHandoffAdapter（新・Phase 6-02 WP-B）
     ├─ supportId/supportType/station/skew → Support.placement（canonical）
     ├─ position/azimuth → geometry基準（3D・配置）
     └─ terrainElevation → terrainReferences（基礎高さ計算入力）
  → SubstructureDocument.supportReferences（derivedキャッシュ・transient）
```

- **別正本を作らない**（Support HandoffはBridge Layout正本由来のderived）
- fail-closed: Handoff ok=falseならderived更新不可（readonly参照可）

## 6. validation / fail-closed 統合

1. supportIdがBridge Layoutと不一致 → reject
2. station非有限 → reject
3. unknown supportType → reject
4. road module未存在 → reject
5. terrain未設定 → warning（geometry生成可・embedment保留）
6. 層別fail-closed: parser/validator=ok=false / binding=typed exception

## 7. 既存資産との関係

| 既存資産 | 扱い |
|---|---|
| `buildBoundSubstructure` | 旧経路（CBDM）。新Adapter（WP-B）で置換候補（旧はcompatibility維持） |
| `linerPiersToSupportHandoff` | 旧LINER fallback。新経路ではPhase 4 SupportHandoffを正とする |
| `SupportPlacementEngine` | LINER正本としてKEEP（placement計算） |

## 8. テスト（T6-ADP系）

- T6-ADP-001: supportId整合（一致PASS・不一致reject）
- T6-ADP-002: supportTypeマップ（virtual_pier→pier明示）
- T6-ADP-003: station受領（finite検証）
- T6-ADP-004: azimuth null→LINER委譲
- T6-ADP-005: skew null→0（CCW）
- T6-ADP-006: roadReference整合
- T6-GEO-001/002: position→3D基準・elevation→高さ基準
- T6-TER-001: terrainElevation参照（null=warning）
