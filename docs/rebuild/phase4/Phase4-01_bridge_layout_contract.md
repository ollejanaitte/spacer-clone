================================================================================
統合設計 Phase 4-01  Bridge Layout Contract（唯一の正本）
================================================================================
確定日: 2026-08-12
位置: 新統合システム（spacer-clone-next / rebuild/integrated-system）

--------------------------------------------------------------------------------
1. 目的
--------------------------------------------------------------------------------
Bridge Layoutの唯一の正本として BridgeLayoutDocument を定義する。

- Road / Terrain / Existingとの参照境界を確定
- 将来の下部工（Substructure）/ 上部工（Superstructure）へのhandoff境界を確定
- 配置validation（runtime）を定義
- Phase 4-02「橋梁区間設定」開始可否を判定

本Phaseでは配置ロジック（4-02以降）は実装しない。

--------------------------------------------------------------------------------
2. Bridge Layoutの責任
--------------------------------------------------------------------------------
責任を持つ（配置情報のみ）:
- どのRoad Alignment上の橋か（roadReference）
- 橋梁区間（bridgeRange: startStation / endStation）
- A1 / A2 橋台位置（station・skew）
- P1..Pn 橋脚位置（station・skew）
- 支間構成・支間長（spans）
- 配置上必要な skew / 交角
- Road / Terrain / Existing への参照
- 下部工・上部工へ渡す配置情報（handoff境界）
- 配置validation

責任を持たない（後続Module・本Phaseで実装しない）:
- 橋脚/橋台躯体詳細設計
- 杭・直接基礎設計 / 耐震設計
- 上部工主桁断面・床版・横桁設計 / FEM解析 / 詳細照査 / 製作図 / 詳細CIM形状

--------------------------------------------------------------------------------
3. Module接続境界
--------------------------------------------------------------------------------
Road Module ──> Road Alignment / Station / Coordinate / Elevation
                ──> Bridge Layout
                    ──> BridgeLayoutDocument
                        ├─ Terrain Module を参照（ID/reference）
                        ├─ Existing Conditions を参照（ID/reference）
                        ├─ Substructure Module へ handoff（配置情報）
                        └─ Superstructure Module へ handoff（配置情報）

原則:
- Road / Terrain / Existing の正本をBridge側へ複製しない（ID/reference接続）
- Project JSONをUIから直接変更しない（Module Core / Adapter経由）
- 配置計算（station→座標）は Road Module（liner core）へ委譲し再実装しない

--------------------------------------------------------------------------------
4. BridgeLayoutDocument（schema 0.1.0）
--------------------------------------------------------------------------------
BridgeLayoutDocument
├─ bridgeId            : string（必須）
├─ name                : string
├─ schemaVersion       : "0.1.0"
├─ metadata            : { createdBy?, createdAt?, updatedAt?, note? }
├─ roadReference       : { moduleId:"road", alignmentId, stationReferenceId?, coordinatePolicyId? }
├─ bridgeRange         : { startStation, endStation }   [m] physical distance
├─ abutments           : { A1: {supportId,station,skewAngleRad}, A2: {...} }
├─ piers               : P1..Pn [{supportId,station,skewAngleRad}]
├─ spans               : [{spanId,index,startSupportId,endSupportId,startStation,endStation,length}]
├─ skew                : { signConvention:"counterclockwise-positive"|"clockwise-positive", angleRad|null }
├─ terrainReference    : { moduleId:"terrain", surfaceReference?, coordinateContextId? }
├─ existingConditionsReference : { moduleId:"terrain", documentReferenceId? }
└─ validation          : { schemaVersion, validatedAt, ok, issues[] }

実装: frontend/src/next/modules/bridgeLayout/bridgeLayoutTypes.ts

--------------------------------------------------------------------------------
5. 参照境界（reference boundary）
--------------------------------------------------------------------------------
- roadReference.alignmentId  → Road Module の alignment id と一致すること
- terrainReference.surfaceReference → Terrain Module の surface reference と一致すること
- existingConditionsReference.documentReferenceId → Existing Conditions document と一致すること
- 参照切れ（dangling reference）は resolveBridgeLayoutReferences で検出（fail-closed）
- 実装: frontend/src/next/modules/bridgeLayout/bridgeLayoutReferences.ts

--------------------------------------------------------------------------------
6. 座標・station・skew規約
--------------------------------------------------------------------------------
- domain XYZ: X=道路軸 / Y=横断 / Z=標高（metric）… R3-00 freeze と同一
- station: Road Alignment上の physical distance [m]
- skew: rad、反時計回り正（counterclockwise-positive）を単一規約とする
  ※ 監査（Phase 4-00）で検出した旧資産の符号規約分散を本契約で統一
- Three表示変換: three.x=x / three.y=z / three.z=-y（共通Render Coordinate Adapter）

--------------------------------------------------------------------------------
7. 最小Validation（runtime）
--------------------------------------------------------------------------------
validateBridgeLayoutDocument / parseBridgeLayoutDocument（fail-closed）:
- bridgeId必須 / schemaVersion検証
- roadReference必須（moduleId:"road"）・alignmentId必須
- startStation < endStation
- A1/A2識別（supportId一致）
- pier ID重複禁止 / station順序（A1→P1..Pn→A2 単調増加）
- span length > 0 / span端点station整合 / span参照先の存在
- NaN / Infinity reject
- skew signConvention / angleRad finite

実装: frontend/src/next/modules/bridgeLayout/bridgeLayoutValidation.ts

--------------------------------------------------------------------------------
8. 下部工・上部工handoff境界
--------------------------------------------------------------------------------
- 下部工（Substructure）へ: A1/A2・P1..Pn の supportId / station / skew を配置情報として渡す
  （躯体・基礎・杭・耐震は下部工Moduleの責任）
- 上部工（Superstructure）へ: spans（支間構成・支間長）・skew を配置情報として渡す
  （主桁断面・床版・横桁は上部工Moduleの責任）
- handoffは ID/reference 経由（正本複製禁止）

--------------------------------------------------------------------------------
9. 対象ファイル
--------------------------------------------------------------------------------
新規:
- frontend/src/next/modules/bridgeLayout/bridgeLayoutTypes.ts
- frontend/src/next/modules/bridgeLayout/bridgeLayoutValidation.ts
- frontend/src/next/modules/bridgeLayout/bridgeLayoutReferences.ts
- frontend/src/next/modules/bridgeLayoutModule.ts
- frontend/src/next/modules/bridgeLayoutModuleAdapter.ts
- frontend/src/next/modules/bridgeLayout/__tests__/bridgeLayoutValidation.test.ts
- frontend/src/next/modules/bridgeLayout/__tests__/bridgeLayoutModule.test.ts

--------------------------------------------------------------------------------
10. 検証
--------------------------------------------------------------------------------
- bridgeLayout tests: 25 PASS（schema/validation/parser/reference resolution/adapter）
- src/next 全体: 317 PASS（289 + 28）
- typecheck: PASS
- シリアライズ可能性: JSON round-trip をテストで確認

--------------------------------------------------------------------------------
11. Phase 4-02 readiness
--------------------------------------------------------------------------------
Phase 4-02「橋梁区間設定」開始可能条件:
- 3D表示基盤（Phase 3-Fix）: COMPLETE（Terrain/Road/Existing同一座標・水平地表面）
- 既存資産監査（Phase 4-00）: COMPLETE（KEEP/ADAPT/REWRITE/DEFER確定）
- 唯一の正本・契約（Phase 4-01）: COMPLETE（本契約）
- Road / Terrain / Existing 参照境界: 確定
- 下部工 / 上部工 handoff境界: 確定

判定: Phase 4-02 開始可能（READY）
================================================================================
