# Phase 5-01 Step D-02: Bearing / Reaction Handoff 設計（凍結案）

## 1. 目的

Phase 6下部工へ渡す正式Handoff Contractを凍結する。
既存KEEP資産（`support-interface.schema.json` / `superstructureInterface.ts` /
`superstructureEnvelope.ts` / `designTypes.ts`）を優先再利用する。

- baseline: `9fb58d5aa096567bc9a570d7800445c81bf9876c`
- 日付: 2026-08-12

## 2. 位置づけ（凍結）

- Handoffは **derived snapshot**（非永続正本）。SuperstructureDocument（正本）＋解析結果から毎回再生成
- 正本を二重保持しない（ID/reference）
- 消費側: Phase 6下部工（support-interfaceアダプタ・superstructureEnvelope）
- 生成元: SuperstructureDocument（bearingConfiguration / geometryReference / reactionResults）

## 3. Handoff 構造（凍結）

```ts
interface SuperstructureHandoff {
  handoffKind: "superstructure-handoff";
  schemaVersion: string;            // "1.0.0"（新規・support-interface v0.1.0の拡張位置づけ）
  handoffId: string;                // `SH-${bridgeId}`（安定）
  bridgeId: string;
  documentReference: string;        // SuperstructureDocument参照（複製しない）
  generatedAt: string;              // ISO-8601 UTC
  coordinateContext: {
    coordinatePolicyId: string | null;
    axisConvention: "x-along/y-transverse/z-up";
    unitSystem: "metric";
    signConvention: { reactionZ: "up-positive"; skew: "counterclockwise-positive" };
  };
  superstructureType: string;       // plate_girder_rc_slab_non_composite
  structuralSystem: { spanSystem: "simple"|"continuous"; bridgeSystem: "SIMPLE_SINGLE"|"CONTINUOUS" };
  supports: SupportHandoffEntry[];  // A1/P1..Pn/A2（station順）
  girderBottomElevation: Record<string, number|null>; // supportId → 桁下縁標高
  deckElevation: Record<string, number|null>;         // supportId → 床版上面標高
  superstructureEnvelope: EnvelopeSummary;            // 全体包絡（3D表示用）
  selfWeight: SelfWeightSummary;                      // 死荷重総量（構造体）
  validation: { ok: boolean; issues: readonly { path: string; message: string }[] };
}

interface SupportHandoffEntry {
  supportId: string;
  supportType: "abutment" | "pier";
  station: number;                  // m
  position: { domainX: number; domainY: number; elevation: number }; // global XYZ（LINER由来）
  tangentAzimuthRad: number;
  skewAngleRad: number | null;      // counterclockwise-positive
  bearingSeats: BearingSeatEntry[];
  reactionCases: ReactionCaseEntry[];
}

interface BearingSeatEntry {
  seatId: string;                   // BRG-{supportId}-{girderId}
  girderId: string;
  position: { x: number; y: number; z: number };   // global XYZ（bearing point）
  elevation: number;                // z（global標高）
  localOffset: { longitudinalM: number; transverseM: number }; // 支持点基準からのoffset
  orientation: { longitudinalAxis: Vec3; transverseAxis: Vec3; verticalAxis: Vec3 };
  bearingType: "rubber"|"fixed"|"movable"|null;
  fixedOrMovable: "FIXED"|"MOVABLE"|"UNDECIDED";
  longitudinalDirection: "+station"|"-station"|null;
  transverseDirection: "L"|"R"|null;
}

interface ReactionCaseEntry {
  caseId: string;                   // RC-{combinationId}-{supportId}
  combinationId: string;            // COMBO-1
  Fx: number; Fy: number; Fz: number;
  Mx: number; My: number; Mz: number;
  unit: "kN"; momentUnit: "kNm";
  signConvention: { force: "up-positive"; moment: "right-hand-rule" };
}
```

## 4. 各項目の供給元・規則（凍結）

| 項目 | 供給元 | 規則 |
|---|---|---|
| supportId / supportType / station / skew | Support Handoff（BridgeLayout正本由来） | 変更・再計算しない |
| position（domainX/Y/elevation） | Support Handoff（LINER由来） | 再計算しない |
| tangentAzimuthRad | Support Handoff | — |
| bearingSeats[].position | GeometrySnapshot.bearingPoints（global XYZ） | support×girder全交点 |
| bearingSeats[].localOffset | 支持点（SupportPoint）からのoffset | derived |
| bearingSeats[].orientation | snapshot localFrame | derived |
| bearingSeats[].bearingType / fixedOrMovable / 方向 | SuperstructureDocument.bearingConfiguration（上部工所有） | Phase 5-02既定 null/UNDECIDED |
| girderBottomElevation / deckElevation | SuperstructureDocument（design model・MISSING許容） | 発明しない |
| reactionCases[].Fz等 | analysis結果（grillage reactions） | **NOT_AUTHORIZED**（Phase 6では入力データとして受領） |
| superstructureEnvelope | `superstructureEnvelope.ts`（KEEP・bearing位置/標高から生成） | 3D表示用 |
| selfWeight | SuperstructureDocument.loadModel（死荷重総量） | 実装（構造体のみ） |

## 5. 既存support-interfaceとの関係（凍結）

- 既存`support-interface.schema.json`（v0.1.0）は per-support のファイル契約
- 新`SuperstructureHandoff`（v1.0.0）は**全support一括**のdocument契約
- 互換: 新Handoffから per-support のsupport-interfaceを**導出可能**（後方互換）
  - Phase 6の`superstructureInterface.ts`（KEEP）は、新Handoff由来のJSONを
    `bearingSeatsToModel` / `interfaceToReactions` でそのまま受領可能な形にする
- 新Handoffはsupport-interfaceの**型をコピーせず**、同一フィールド名・単位・符号を保証する
  （既存アダプタ互換のための設計）

## 6. validation・fail-closed（凍結）

- supportId一意・A1<P1<…<A2順序・station有限
- bearingSeats重複なし・girderId存在（girderConfigurationと一致）
- reactionCases: combinationId参照整合・数値有限
- girderBottomElevation/deckElevationはnull許容（MISSING）・発明しない
- reactionStatus NOT_AUTHORIZED のまま（Phase 6でauthorized扱いしない）
- malformedは fail-closed（throwしない・ok=false + issues）

## 7. Phase 6への受け渡し（凍結）

- 新Handoff → Phase 6下部工module（`modules.substructure`）へ
  - 既存`superstructureInterface.ts`（bearingSeatsToModel）で受領
  - `superstructureEnvelope.ts`（buildSuperstructureEnvelope）で3D envelope生成
  - reactionCasesは `SupportReactions` として入力データ化（設計照査はPhase 6で判断）
- 受け渡し経路: derived生成 → Phase 6 module adapterがread（ID/reference）。非保存

## 8. 検証・tests観点（WP-H）

- bearingSeats全交点・ID一意・座標/標高整合（snapshotとのparity）
- girderBottomElevation/deckElevationのMISSING扱い
- reactionCasesの符号規約・NOT_AUTHORIZED維持
- 新Handoff → support-interface互換（導出）
- superstructureEnvelope生成（既存test流用）
- Phase 6 `superstructureInterface.test.ts`（既存KEEP）との整合
