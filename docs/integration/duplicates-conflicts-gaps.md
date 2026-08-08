# 重複・競合・不足一覧

> **Phase:** P1
> **目的:** 「同じ値をどこが正本として持つのか」を曖昧にしないための実測一覧。
> **凡例:** [重複]=同じ値を複数保持 / [競合]=同一値に複数 source / [不足]=後続接続に欠落 / [境界]=責任分界の判定が必要

## A. 重複保持（同じ値を①②③が別々に持つ）

| # | 項目 | 保持箇所 | 現状の食い違い |
|---|------|----------|----------------|
| A1 | 橋長 / 支間 | ②`AlignmentReference.bridgeLengthM/spanLengthsM`（geometry/types.ts:61-68）、②BSDD spans、①`SpanDraft`（schema/types.ts:518-524）、CBDM `bridgeGeometry.spans` | RB001 は 134.001/40.201+51+40.2 で一致。ただし CBDM fixture は `spans=[]`（空） |
| A2 | 支持位置 / 支持線 | ②`SupportLine`（geometry/types.ts:70-77）、②BSDD supports、③`Support`（model.ts:134-144）、CBDM `bridgeGeometry.supports` | ③は①の handoff（station+skew）または support-interface 手動入力から生成。同一 support に複数流入経路 |
| A3 | 斜角 | ①`PierDraft.skewAngleRad`（schema/types.ts:530-536）、②`SupportLine.skewRad`、③`SupportPlacement.skewRad`（model.ts:134-144）、CBDM | ①は左法線基準、②/③は rad 正準。角度符号の統一確認が必要 |
| A4 | 主桁線 / 主桁間隔 | ②`GirderLine.offsetM`、②`ApolloBridgeStructureInputDraft.girderSpacing`（bridgeStructure/types.ts:82）、CBDM `bridgeGeometry.girders`、①`crossBeam` 候補 | ②は `(index-(n-1)/2)*spacing` で offset 導出（geometryFormulas.ts:108-119） |
| A5 | 床版 | ②`DeckReference`（geometry/types.ts:164-186）、②BSDD deck | RB001 幅8.01/厚0.23 は deck.ts にハードコード＋golden CSV（GIN-0045）両方 |
| A6 | 支点反力 | ③`SupportReactions`（designTypes.ts:24-30）、BFAD result resource（`supportReaction`）、（②designResult は NOT_AUTHORIZED） | ③は入力としてのみ保持。BFAD/result は未参照 |
| A7 | 3D 生成 | ②`ApolloVisualizationModel`、①`BridgeGeometry3dPayload`（RESEARCH）、③`SolidGroup`（geometryBase.ts）、汎用 `Viewer3D` | 座標系: ②/③は domain（x-longitudinal, z-up）、Three.js 表示は y-up 変換。①RESEARCH は three.y=domain.z。変換規約が2系統 |
| A8 | 位置座標 | ①`Coordinate3dInput.pointAtStationOffset`、②`GeometrySnapshot`、③`SupportPlacementSnapshot`（model.ts:36-44） | ③実行時 host は実線形未使用（buildHostCoordinates 直線） |

## B. 競合（同一値に複数 source / 値が分かれる）

| # | 項目 | 競合の内容 |
|---|------|-----------|
| B1 | CBDM schema version | `contractVersionRegistry.ts:38` は `COMMON_BRIDGE_DATA_MODEL_SCHEMA_VERSION="1.0.0"` だが、生成 JSON schema の `contractVersion` は `"0.1.0"`（drift test は `0.1.0` を assert）。fixture は `1.0.0` を使用。**3箇所で不一致** |
| B2 | value の status 語彙が3系統 | CBDM value-state 6値 / `GovernedQuantity.adoptionStatus` 4値（PENDING/PLACEHOLDER/UNKNOWN/ADOPTED）/ CBDM `authority` 4値（PLACEHOLDER/USER_PROVIDED_UNVERIFIED/SOURCE_TRACED/ADOPTED）が並存。マッピング未定義 |
| B3 | 中間格点座標 | golden では全50点が `HOLD_INSUFFICIENT_SOURCE`（gridPoints.ts:87-97）。実座標なし。②Replay は未作成を assert |
| B4 | 反力 source | ③の reactionCases（caseKind ベース）と BFAD/frame 結果（loadCaseId ベース）の語彙が非互換。mapper 不在 |
| B5 | サポート3D長さ | 横桁 3D 長さが `snapshot3d.ts:203` で 8.01m ハードコード（girder spacing 非由来） |
| B6 | deck elevation | golden（GIN-0034=10.0m, HCR-001）と `deck.ts:83` のハードコード 10.0 が一致するが、経路が別（golden は未消費） |

## C. 不足（①→②→③ / ②→①→③ を阻害）

| # | 項目 | 影響 | 場所 |
|---|------|------|------|
| C1 | ①最新成果が main 未統合 | ①の MAIN3D/山岳500m/terrain は `research/liner-terrain-fix-p01-coords` のみ。main ベースでは①の最新状態を BridgeProject に接続できない | Git / research branch（203 ahead / 271 behind） |
| C2 | WF-01 alignment-binding 未実装 | ②は実線形を消費できない（ハードコード直線） | `workflow/capabilityRegistry.ts:28-34`（PLANNED, Step 4-E） |
| C3 | `CommonModelGeometryInputAdapter` が数値幾何を渡さない | CBDM→② の数値（spanLengths/bridgeLength/girderOffsets）が空 | `geometry/geometryInputAdapter.ts:132-161` |
| C4 | 中間格点座標 HOLD | ②の格点配置が不完全（endpoint のみ） | `gridPoints.ts:87-97` |
| C5 | 反力 NOT_AUTHORIZED | ③が実設計（反力に基づく照査）を開始できない。CASE A の③ステップは fail-closed | `design/designResult.ts:18-51`、`backend/engine/grillage.py:28` |
| C6 | 下部工が契約層外 | ③の正本が v0.1 contract family 外（schemas/substructure/）。BFAD/result を参照しない | `frontend/src/substructure/**`（contracts grep 0 hit） |
| C7 | ③実行時配置が直線プレースホルダ | 実線形による pier/abutment 配置が未配線（`SupportPlacementEngine` は test のみ） | `SubstructurePlanningHost.tsx:64-80` |
| C8 | road-to-frame-transfer-package に producer なし | ①→② の正式転送経路が契約のみで未使用 | `contracts/roadToFrameTransferPackage.ts:158` |
| C9 | Model3D が契約に無い | 3D payload が runtime 専用。統合 3D の共通契約が未定義 | ①`geometry3d/types.ts`（RESEARCH）vs ②`visualization/types.ts` |
| C10 | ②→① 復元の前提値が未整備 | 橋長/支間/斜角は①の golden 由来でなく②側ハードコード。復元時の「確認済み/導出/推定」区分が無い | `SuperstructurePipelinePanel.tsx:30-37`、CBDM fixture |
| C11 | 縦断・横断勾配が②で未消費 | golden（GIN-0029..0033）と engine が未接続。deck elevation はハードコード | `deck.ts:83` |
| C12 | CBDM に substructure / Model3D セクションなし | BridgeProject として③・3D を収容する場所がない | `runtime/schemas/commonBridgeDataModel.ts:368-391` |

## D. 境界（責任分界の判定が必要）

| # | 項目 | 現状 | 判定 |
|---|------|------|------|
| D1 | ③の Calculation Adapter（A-01）と将来 BridgeProject Adapter | A-01 は design-engine 境界。将来 BridgeProject Adapter が Support[] を直接生成すると二重流入 | A-01 は data 流入に使わない（[adapter-boundaries.md](adapter-boundaries.md) で明文化） |
| D2 | RDD の frame 力学禁止 vs ②BFAD | ①は力学を持たない（禁止）。力学は②側 | 契約上は既に分離済み（尊重） |
| D3 | CBDM の設計値 vs BSDD の設計値 | CBDM `design`（DESIGN_ITEM）と BSDD structuralDesignModel が並存 | 正準は BSDD（superstructure owner）。CBDM.design は参照 or 導出 |

## E. 移行方針の骨子（詳細は responsibility-boundary.md / bridge-project-contract.md）

- **共有設計事実（橋長・支間・支持・斜角・反力・主桁配置）** は CBDM を正本とし、
  BridgeProject が section 単位で owner を宣言する。
- **専門モジュール内部の計算途中値（設計照査・数量の詳細・内部ソルバー状態）** は
  各 owner（BSDD / substructure project）に閉じ、BridgeProject へ押し込まない。
- **①→②→③ / ②→①→③ の経路** は BridgeProject Adapter を経由し、
  A-01 Calculation Adapter とは責任を分離する。
