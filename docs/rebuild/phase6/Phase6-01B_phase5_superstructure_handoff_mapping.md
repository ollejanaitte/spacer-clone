# Phase 6-01 Step B: Phase 5 Bearing / Reaction Handoff Adapter（凍結案）

## 1. 目的

Phase 5 SuperstructureHandoff v1.0.0 ＋ support-interface v0.1.0互換DTOを下部工側で受領する
Adapterをfield-levelで凍結する。6課題の解決方針（Phase6-01B_handoff_six_issues_resolution.md）に従う。

- baseline: `b9e39d8bc2326e9f552174271b6c20523fe4665f`
- 日付: 2026-08-13

## 2. 入力（SuperstructureHandoff v1.0.0）

```ts
SuperstructureHandoff {
  handoffKind, schemaVersion, handoffId, bridgeId, documentReference, generatedAt,
  coordinateContext, superstructureType, structuralSystem,
  supports[ { supportId, supportType, station, position, tangentAzimuthRad, skewAngleRad,
              localFrame, bearingSeats[], reactionCases[] } ],
  girderBottomElevation, deckElevation, superstructureEnvelope, selfWeight, validation
}
```

## 3. field-level mapping（凍結・6課題解決後の正規形）

### 3.1 support基本

| Phase 5 field | conversion | target | unit | nullable | fallback | fail-closed |
|---|---|---|---|---|---|---|
| supportId | 直接 | `Support.supportId` | — | no | — | Bridge Layoutと一致必須 |
| supportType | 直接 | `Support.supportType` | — | no | — | enum一致 |
| station | 直接 | placement.station | m | no | — | finite |
| position {x,y,z} | 直接（Project-global XYZ） | geometry基準 | m | no | — | finite |
| tangentAzimuthRad | 直接 | placement azimuth | rad | yes | LINER委譲 | — |
| skewAngleRad | 直接（CCW） | `Support.skewRad` | rad | yes | null→0 | — |
| localFrame | **6課題5解決**（snapshot/LINER由来の実frame） | placement snapshot frame | — | yes | identityはVIEWER_PLACEHOLDERのみ | 正本frameはNOT_AVAILABLE許容 |

### 3.2 bearingSeats

| Phase 5 field | conversion | target | unit | nullable | fallback | fail-closed |
|---|---|---|---|---|---|---|
| seatId | **6課題3解決**（BRG-{support}-{girder}統一） | `BearingSeat.seatId` | — | no | — | 一意・dangling reject |
| girderId | 直接 | metadata | — | no | — | girderConfiguration存在 |
| position {x,y,z} | 直接（Project-global XYZ） | bearing seat geometry | m | no | — | finite |
| elevation | 直接 | seat高さ基準 | m | no | — | finite |
| localOffset {longitudinalM, transverseM} | **6課題2解決**（transverse→y・longitudinal→x） | bridge-local offset | m | yes | 0 | finite |
| orientation | **6課題5解決**（実frame） | placement frame | — | yes | VIEWER_PLACEHOLDER | — |
| bearingType | 直接 | `BearingSeat.bearing.type` | — | yes | null（UNDECIDED） | — |
| fixedOrMovable | 直接 | metadata | — | yes | UNDECIDED | — |
| longitudinalDirection/transverseDirection | 直接 | metadata | — | yes | null | — |

### 3.3 reactionCases

| Phase 5 field | conversion | target | unit | nullable | fallback | fail-closed |
|---|---|---|---|---|---|---|
| caseId | 直接 | `ReactionCaseData.caseId` | — | no | — | 一意 |
| combinationId | **6課題4解決**（caseKindマッピング表） | caseKind + metadata.combinationId | — | no | — | 未対応combination→caseKind=mapped or reject |
| seatId | 直接（BRG-） | metadata | — | no | — | 存在 |
| Fx/Fy/Fz | 直接（**up-positive**） | force | kN | no | — | finite |
| Mx/My/Mz | 直接 | moment | kNm | no | — | finite |
| unit/momentUnit | 直接（kN/kNm） | units | — | no | — | 一致 |
| signConvention | **6課題1解決**（up-positive統一） | sign規約 | — | no | — | 明示 |
| authorizationStatus | **維持（NOT_AUTHORIZED）** | designInputs | — | no | — | 正式設計へ自動採用しない |

### 3.4 ReactionCaseData型の拡張（凍結）
- 既存`ReactionCaseData`にはcombinationId/seatId/unit/signConvention/authorizationStatusが無い
- **新型を定義**（metadata拡張）: `Phase6ReactionCaseData = ReactionCaseData & { combinationId, seatId, unit, momentUnit, signConvention, authorizationStatus }`
- Contract（A）に明記し、Phase 6-02で実装

### 3.5 その他

| Phase 5 field | target | nullable | 扱い |
|---|---|---|---|
| girderBottomElevation | **Record<supportId, number\|null>をsupport単位に解決**（6課題6） | derived | yes | 宣言値から導出・無い場合はNOT_AVAILABLE |
| deckElevation | Record<supportId, number\|null>をsupport単位に解決 | derived | yes | 同上 |
| superstructureEnvelope | viewer参照 | yes | 表示用（正本にしない） |
| selfWeight | designInputs（参考） | yes | 未認証参照 |
| coordinateContext | coordinateContext | no | — |
| provenance | metadata | no | — |
| validation | validation | no | — |

## 4. 正規規約

- reaction sign: **up-positive**（支承が上部工を押し上げる方向=+z）。fixtureのdown-negativeは適用荷重表現（RB比較は|Fz|）
- bearing offset: x=longitudinal / y=transverse / z=相対標高（v0.1.0 schemaと一致）
- seat-ID: `BRG-{supportId}-{girderId}`（唯一）
- localFrame: 実frame（snapshot/LINER由来）・identityはVIEWER_PLACEHOLDERのみ
- 未認証Reaction: 正式設計計算へ自動採用しない（HOLD_NOT_AVAILABLE維持）

## 5. Adapter境界

```
Phase 5 SuperstructureHandoff（derived・transient）
  → superstructureHandoffAdapter（新・Phase 6-02 WP-C）
     ├─ supports → Support.placement / bearingSeats（canonical入力へ）
     ├─ reactionCases → designInputs（NOT_AUTHORIZED入力データとして保持）
     └─ girderBottom/deckElevation → derived高さ（NOT_AVAILABLE許容）
  → SubstructureDocument.bearingReactionReferences（derived・transient）
```

## 6. テスト（T6-ADP/BRG/RXN系）

- T6-ADP-010: support基本mapping
- T6-BRG-001: bearingSeats全受領・ID一意
- T6-BRG-002: localOffset axis（transverse→y）
- T6-RXN-001: reaction up-positive・authorization維持
- T6-RXN-002: combinationId→caseKindマップ
- T6-ELE-001: girderBottom/deckElevation導出（NOT_AVAILABLE許容）
- T6-LOC-001: localFrame実frame・identityはplaceholderのみ
