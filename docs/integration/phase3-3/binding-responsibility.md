# Phase 3-3 Binding 責任（①道路線形 → ②上部工）

> **Phase:** P5 (docs)
> **対象:** `frontend/src/bridgeProject/superstructureBinding.ts` + `apollo/geometry/{geometryInputAdapter,placement,engine}.ts`

## 1. データ経路（正規ルート）

```
①LINER draft (Coordinate3dInput, project.liner 由来)
  → buildBridgeProjectAlignment   (Phase 3-1: BridgeProject.Alignment)
  → buildBridgeProjectGeometry    (Phase 3-2: BridgeProject.BridgeGeometry)
  → buildCommonBridgeModel        (CBDM: alignments + bridgeGeometry 数値)
  → CommonModelGeometryInputAdapter (拡張)  → spanLengthsM / bridgeLengthM / deckSpecs / support station・skew
  → buildBoundGeometryInput       (binding facade: 数値 GeometryEngineInput + fail-closed)
  → DefaultGeometryEngine(実線形)  (support station/skew を正準採用 → snapshot)
  → 3D / Replay / Output
```

**②は①の LINER domain を直接参照しない。** 数値（support/span/skew/width/bridgeLength）は
BridgeProject（CBDM）から受け取る。実線形の評価（station→XYZ 等）のみ engine 内部の
`LinerAlignmentConnector` が行う（単一線形 source = LINER）。

## 2. 責任

| モジュール | 責任 |
|------------|------|
| `CommonModelGeometryInputAdapter` | CBDM → GeometryEngineInput の数値抽出（invent しない） |
| `buildBoundGeometryInput` | bound モードの完全性検証 + girder（SUPERSTRUCTURE 入力）合成 |
| `placement.ts` / `engine.ts` | 明示 support station（global）/ per-support skew を正準採用（無ければ legacy 挙動） |
| `SuperstructurePipelinePanel` | SAMPLE（RB-001）と BridgeProject bound を明示分離して実行 |

## 3. legacy / sample fallback 方針

- **SAMPLE（RB-001）**: 既存デモ。`RB001_ALIGNMENT` / `buildRb001GeometryInput` の
  ハードコードを維持（明示的 SAMPLE mode）。
- **BRIDGEPROJECT_BOUND**: 実線形 + CBDM が正規入力。不足時は **fail-closed**。
- **暗黙 sample fallback 禁止**: bound 対象の値（support/span/skew/width）は、
  bound mode で欠落した場合に RB-001 や他 sample 値へ黙って戻さない。
- 明示 mode toggle（`pipeline-mode-sample` / `pipeline-mode-bound`）で分離。

## 4. WF-01 alignment-binding

- `capabilityRegistry.ts`: `alignment-binding` → **IMPLEMENTED** / `gatingGuard: "ACTIVE"`。
- WF-01 は実ステップ化（`linerEvidence` により liner 有無を評価）。空プロジェクトでは
  推奨工程の先頭（RECOMMENDED）になる。
- 依存ガード（`BINDING_PREREQUISITE_GUARD`）は `PENDING_STEP_4E` のまま
  （WF-02 の gating は不変。ワークフロー全体の再配線は Phase 3-4 以降のスコープ）。

## 5. source / status / provenance

- support station/skew: CONFIRMED（入力・CBDM 由来）
- span length / bridge length / support XYZ / deck width: DERIVED（導出）
- deck thickness: NOT_AVAILABLE（共有モデルに無い SUPERSTRUCTURE 入力）→ fail-closed ではなく明示待ち
- girder offset: SUPERSTRUCTURE 入力（CBDM から来ない）。invent 禁止
- 未認証（NOT_AUTHORIZED）値は設計に使用しない（`NOT_GRANTED` / `PROHIBITED` を維持）
