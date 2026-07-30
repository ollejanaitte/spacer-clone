APOLLO_3D_DATA_OWNERSHIP_VERDICT: FROZEN_FOR_POC
APOLLO_BRIDGE_DEFINITION_ROLE_VERDICT: PROVISIONAL_INTERMEDIATE_ONLY
APOLLO_3D_MISSING_DATA_POLICY_VERDICT: PASS
APOLLO_3D_DUAL_WRITE_GUARD_VERDICT: PASS
APOLLO_3D_POC_INPUT_READINESS_VERDICT: GO_WITH_CONDITIONS
RECOMMENDED_NEXT_STEP: STEP3_IMPLEMENTATION_PLAN_FREEZE

# Apollo Phase 1 3D/STL 不足データの正本決定 Freeze

## 1. 目的

- 本文書は、Apollo 3D表示および STL出力に必要な橋梁形状データについて、現行 runtime 上の ownership を Freeze する。
- 資料不足があっても、PoC を開始できる最低限の ownership と暫定正本を明示する。

## 2. ownership 原則

- `FROZEN`: node/member/support の既存 Apollo 編集データは `ProjectModel` と `project.apolloPhase1Unit2` の current SoR を維持する。
- `FROZEN`: Three.js scene、mesh、camera、visibility drawer state を SoR にしない。
- `FROZEN`: STL option は export-only とし、設計正本へ混入させない。
- `FROZEN`: bridge geometry に必要な値を viewer 内へハードコードしない。
- `FROZEN`: 同一データ項目を複数正本にしない。dual write を前提にしない。

## 3. current runtime SoR

- `CONFIRMED`: `ProjectModel` は project/name/units/nodes/materials/sections/members/supports/loadCases 等を保持する。`frontend/src/types.ts`
- `CONFIRMED`: `project.apolloPhase1Unit2` は Apollo Phase 1-NN の node/member/support/material shell と validation/navigation に接続する。`frontend/src/apollo/unit2Draft.ts`
- `CONFIRMED`: `BridgeDefinition` は span/girder/support/deck/bearing を含みうるが、Apollo SoR ではなく legacy intermediate model である。`frontend/src/bridgeDefinition/types.ts`

## 4. `BridgeDefinition` の位置づけ

- `PROVISIONAL`: `BridgeDefinition` は Step 2 時点で `AUTHORITATIVE` ではなく `FUTURE` または `AUTHORITATIVE_FOR_POC` 候補の参照源とする。
- `FROZEN`: `BridgeDefinition` を current Apollo SoR と誤認しない。
- `FROZEN`: `BridgeDefinition` 由来値を使う場合は、Visualization builder または future bridge geometry sidecar への一方向変換に限定する。

## 5. 項目別 ownership 表

| データ項目 | 現行データ | 状態 | 正本 | PoC方針 | 将来方針 | 備考 |
|---|---|---|---|---|---|---|
| span | `BridgeDefinition.spans` | AUTHORITATIVE_FOR_POC | `BridgeDefinition` | read-only 参照 | bridge geometry sidecar か Apollo SoR 拡張 | `ProjectModel` には span 概念なし |
| bridge axis | `BridgeDefinition.coordinatePolicy` / alignment refs | AUTHORITATIVE_FOR_POC | `BridgeDefinition` | X 軸基準で読取 | Apollo SoR 側へ昇格検討 | Step 1 座標系に接続 |
| transverse axis | `BridgeDefinition.coordinatePolicy` | AUTHORITATIVE_FOR_POC | `BridgeDefinition` | Y 軸基準で読取 | Apollo SoR 側へ昇格検討 | |
| vertical axis | `ProjectModel.nodes.z` / `BridgeDefinition.coordinatePolicy` | DERIVED | `ProjectModel` + Step1座標契約 | Z-up に正規化 | 同左 | 実高低は node 座標由来 |
| girder count | `BridgeDefinition.girders.length` | AUTHORITATIVE_FOR_POC | `BridgeDefinition` | read-only 参照 | bridge geometry sidecar か Apollo SoR 拡張 | |
| girder spacing | `BridgeDefinition.girders.offset` 差分 | DERIVED | `BridgeDefinition` | offset から算出 | explicit field を future 化 | |
| girder line | `BridgeDefinition.girders` | AUTHORITATIVE_FOR_POC | `BridgeDefinition` | read-only 参照 | explicit line geometry 追加検討 | |
| girder depth | なし | MISSING | 新規 bridge geometry sidecar 候補 | ASSUMED_FOR_POC または simple line fallback | authoritative geometry field 追加 | |
| flange width | なし | MISSING | 新規 bridge geometry sidecar 候補 | ASSUMED_FOR_POC | authoritative geometry field 追加 | |
| flange thickness | なし | MISSING | 新規 bridge geometry sidecar 候補 | ASSUMED_FOR_POC | authoritative geometry field 追加 | |
| web height | なし | MISSING | 新規 bridge geometry sidecar 候補 | ASSUMED_FOR_POC | authoritative geometry field 追加 | |
| web thickness | なし | MISSING | 新規 bridge geometry sidecar 候補 | ASSUMED_FOR_POC | authoritative geometry field 追加 | |
| cross beam positions | `BridgeDefinition.crossBeams.station` | AUTHORITATIVE_FOR_POC | `BridgeDefinition` | read-only 参照 | bridge geometry sidecar か Apollo SoR 拡張 | |
| cross beam section | `BridgeDefinition.crossBeams.sectionRefId` | FUTURE | `BridgeDefinition` + section catalog | PoC では simple block/cylinder | explicit section geometry 追加 | sectionRef の意味精査要 |
| bracing positions | なし | MISSING | 新規 bridge geometry sidecar 候補 | PoC では omit 可 | future geometry source | |
| bracing pattern | なし | MISSING | 新規 bridge geometry sidecar 候補 | PoC では omit 可 | future geometry source | |
| deck outline | `BridgeDefinition.deck` の width のみ | MISSING | 新規 bridge geometry sidecar 候補 | centerline + width の簡易形 | explicit polygon 追加 | outline 欠落 |
| deck width | `BridgeDefinition.deck.width` | AUTHORITATIVE_FOR_POC | `BridgeDefinition` | read-only 参照 | Apollo SoR 拡張検討 | |
| deck thickness | `BridgeDefinition.deck.thickness` | AUTHORITATIVE_FOR_POC | `BridgeDefinition` | read-only 参照 | Apollo SoR 拡張検討 | optional field |
| bearing location | `BridgeDefinition.bearings.supportId` + support station | DERIVED | `BridgeDefinition` | support 経由で導出 | explicit bearing geometry 検討 | |
| bearing type | `BridgeDefinition.bearings.type` | AUTHORITATIVE_FOR_POC | `BridgeDefinition` | read-only 参照 | 同左 | |
| bearing dimensions | なし | MISSING | 新規 bridge geometry sidecar 候補 | ASSUMED_FOR_POC | authoritative geometry field 追加 | |
| pier location | `BridgeDefinition.supports.station` + substructureKind | AUTHORITATIVE_FOR_POC | `BridgeDefinition` | station block 表示 | Apollo SoR 拡張検討 | |
| abutment location | `BridgeDefinition.supports.station` + substructureKind | AUTHORITATIVE_FOR_POC | `BridgeDefinition` | station block 表示 | Apollo SoR 拡張検討 | |
| support role | `BridgeDefinition.supports.kind` / `substructureKind` | AUTHORITATIVE_FOR_POC | `BridgeDefinition` | read-only 参照 | 同左 | |
| project name | `ProjectModel.project.name` | AUTHORITATIVE | `ProjectModel` | そのまま利用 | 同左 | |
| model revision | `ProjectModel.project.updatedAt` 等 | AUTHORITATIVE | `ProjectModel` | sourceRevision に投影 | revision token 強化検討 | |
| validation target ID | `StructuredMessage.entityType/entityId/path` | DERIVED | validation output | Visualization key に変換 | 同左 | `frontend/src/apollo/validationNavigator.ts` |
| display state | viewer visibility/camera/background | UI_ONLY | UI state | 保存しない | UI state のまま | SoR禁止 |
| export options | STL binary/visible-only/origin shift | EXPORT_ONLY | export option | manifest へ保持 | export contract 強化 | SoR禁止 |

## 6. データ流入方向

```text
ProjectModel / apolloPhase1Unit2 / BridgeDefinition
  -> Visualization builder
  -> ApolloVisualizationModel
  -> Viewer / STL exporter
```

禁止:

```text
Viewer state -> ProjectModel
STL option -> ProjectModel
Three.js mesh -> BridgeDefinition
```

## 7. derived 項目

- `DERIVED`: girder spacing
- `DERIVED`: bearing location
- `DERIVED`: validation target key
- `DERIVED`: visualization grouping
- `DERIVED`: STL inclusion set

## 8. UI-only 項目

- camera preset
- visibility toggle
- background / theme
- panel open state
- temporary selection highlight color

## 9. export-only 項目

- binary STL / ASCII STL choice
- visible-only option
- origin shift option
- export filename
- companion JSON manifest

## 10. PoC 仮定値

- `ASSUMED_FOR_POC`: girder depth / flange width / flange thickness / web height / web thickness / bearing dimensions は未正本のため、PoC では bridge geometry sidecar または constrained fixture から注入する。
- `ASSUMED_FOR_POC`: deck outline は bridge axis と deck width から簡易矩形近似を許可する。
- `ASSUMED_FOR_POC`: bracing が不足するケースでは omission を許可し、warning を出す。

## 11. dual-write 禁止

- `FROZEN`: `ProjectModel` と `BridgeDefinition` に同一 bridge geometry を同時更新する設計を採らない。
- `FROZEN`: temporary synchronization layer を正本にしない。
- `FROZEN`: Step 2 時点では「read ProjectModel / read BridgeDefinition / write neither」の derived builder を前提にする。

## 12. migration 影響

- `PROVISIONAL`: 将来 authoritative bridge geometry を Apollo SoR に持たせる場合、`BridgeDefinition` からの migration または sidecar 昇格が必要になる。
- `FROZEN`: Step 2 時点で `ProjectModel` 既存 schema を変更しない。

## 13. import/export 影響

- `FROZEN`: current import fail-closed behavior を維持する。
- `FROZEN`: Visualization / STL contract は current JSON project import/export と分離する。
- `PROVISIONAL`: companion manifest は export artifact としてのみ追加可能にする。

## 14. 未解決事項

- girder solid dimensions の authoritative source
- bearing dimensions の authoritative source
- deck outline polygon source
- bracing geometry source
- bridge geometry sidecar をどの schema / lifecycle で持つか

## 15. 将来見直し条件

- Apollo 本体に bridge geometry SoR が追加された場合
- `BridgeDefinition` に required geometry fields が増えた場合
- STL/GLB exporter の品質 gate が厳格化された場合
- Unit 3 以降で viewer-selection と bridge solid selection が拡張された場合

## 16. Freeze 判定

- `APOLLO_3D_DATA_OWNERSHIP_VERDICT: FROZEN_FOR_POC`
- `APOLLO_BRIDGE_DEFINITION_ROLE_VERDICT: PROVISIONAL_INTERMEDIATE_ONLY`
- `APOLLO_3D_MISSING_DATA_POLICY_VERDICT: PASS`
- `APOLLO_3D_DUAL_WRITE_GUARD_VERDICT: PASS`
- `APOLLO_3D_POC_INPUT_READINESS_VERDICT: GO_WITH_CONDITIONS`
- `RECOMMENDED_NEXT_STEP: STEP3_IMPLEMENTATION_PLAN_FREEZE`
