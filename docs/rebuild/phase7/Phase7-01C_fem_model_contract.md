# Phase 7-01C: FEM Model Contract（設計Freeze）

- Phase: 7-01 Step C
- baseline: `9766128e44ec22f0cdd83f59336182f4c47bd162`
- 日付: 2026-08-13
- 凍結: Design Decision D-05 / D-06 / D-11 / D-13 / D-16
- 対応R: R6 / R12 / R23 / R24

## 1. 目的

AnalysisDocumentに格納されるFEM Model（node / member / element / support / constraint）の契約を完全凍結する。
solver（backend engine）はKEEPし、AnalysisDocument→solver入力への変換契約を確定する。

## 2. Element type（Freeze）

| elementType | 内容 | Phase 7-02 solver | 備考 |
|---|---|---|---|
| `frame` | 12DOF Euler-Bernoulli 3D beam（既存engine element.py KEEP） | **対応** | せん断変形無し（MVP維持） |
| shell | — | **DEFER** | 未採用・明示DEFER |
| rigidLink | — | **契約のみ**（solver非対応） | R23 |
| spring | elastic support（対角加算） | **対応**（新規・**assembly.py最小ADAPT（WP-D所有・#13）**） | R4 |
| release / MPC | — | **契約のみ**（solver非対応） | R23 |

## 3. Node Contract（Freeze）

| field | 値 |
|---|---|
| entityId | uuid5(analysis-namespace, `node:{sourceEntityId}`)（D-11） |
| sourceEntityId / sourceKind | 上流source（supportPoint/girderPanel/crossBeamPoint/meshNode/substructureNode） |
| x / y / z | m・project-global（有限） |
| coordinateContextId | coordinateContext参照 |
| stationM / offsetM | m（任意） |

- **local/global関係**: node座標は常にproject-global。局所系はmember/bearingのlocalFrameで表現（nodeに局所座標を持たせない）。

## 4. Member Contract（Freeze）

| field | 値 |
|---|---|
| entityId | uuid5(`member:{sourceEntityId}`) |
| nodeIId / nodeJId | 両端node（AnalysisDocument内参照） |
| elementType | `frame` |
| materialId / sectionId | 参照 |
| memberKind | mainGirder / crossBeam / crossFrame / swayBracing / lateralBracing / stiffener |
| orientationVector | **決定論生成**（Phase7-01B_superstructure §6・member tangent + global upから右手系local frame・#16） |
| localAxis | 導出local frame（x=member軸・y/z=主軸） |
| release | 契約のみ（i/j端DOF・DEFER） |
| eccentricity | 契約のみ（DEFER） |

- 主桁・横桁の**断面主軸と曲げ軸**はsolver element.pyのDOF規約（ux,uy,uz,rx,ry,rz・local stiffness yz/zy）と整合。

## 5. Support Contract（Freeze）

| field | 値 |
|---|---|
| entityId | uuid5(`support:{sourceEntityId}`) |
| nodeId | 対応node |
| constraint | `{ux,uy,uz,rx,ry,rz: boolean}`（bool DOF） |
| springId | elastic support時（spring参照） |
| localFrame | bearing local frame（spring/constraintのlocal軸） |
| source | FROM_BEARING / FROM_SUPPORT / FROM_BEARING_DEFAULT |

## 6. Constraint / Release / RigidLink / MPC（Freeze・R23）

- **solver対応**: bool support（constraint）のみ。spring（elastic support）は対角加算で対応。
- **契約のみ（solver非対応・DEFER）**: release / rigidLink / MPC / equality constraint。
- 契約としてAnalysisDocumentに保持（Viewer表示可）・solver入力へは渡さない（UNSUPPORTED_RELEASE/UNSUPPORTED_CONSTRAINTでfail-closed）。

## 7. DOF / 座標規約（Freeze）

| 項目 | 値 |
|---|---|
| DOF数 | 6/node（ux,uy,uz,rx,ry,rz） |
| DOF順序 | node list順（solver dof.py KEEP） |
| 座標系 | project-global right-handed・z up・x沿線/y横断 |
| 局所系 | member local（x=軸・y/z=主軸）・bearing local（longitudinal/transverse/vertical） |
| 角度 | rad（CCW positive・+Z軸回り） |
| 単位 | m・kN・kNm・rad |

## 8. FEM Generator統合（R6 / R13 / R20・Freeze）

| generator | 責任 | 分類 | 扱い |
|---|---|---|---|
| Analysis Generation Layer（新・Superstructure/Substructure adapter） | AnalysisDocument生成 | **PRODUCTION（正）** | Phase 7-02の正式path |
| `apollo/design/grillageModel.ts`（buildGrillageModel） | GeometrySnapshot→grillage | **ADAPT**（骨格KEEP・荷重/mesh/topology再構成） | Analysis Generation Layerの内部関数へ再構成 |
| backend `engine/grillage.py` | grillage project生成+solver | **REWRITE**（envelope・orientation・load受渡し） | Solver Input Adapterへ再設計 |
| backend `engine/bridge_fem_generator.py` | BridgeProject→FEM | **DEPRECATE（COMPATIBILITY）** | 既存bridge wizard APIは維持（cutover後deprecate） |
| `bridgeDefinition/generator/structuralModelGenerator.ts` | BridgeDefinition→ProjectModel | **COMPATIBILITY** | flag gated維持・production解析には使わない |

- **正式production path（一つに絞る）**:
  Superstructure/SubstructureDocument → Analysis Generation Layer → AnalysisDocument → Solver Input Adapter → backend engine（solver.py）→ result。
- cutover条件（R20）: bridge_fem_generatorの既存API（/api/fem/generate・/api/viewer/bridge）は**互換維持**。AnalysisDocument経路がCompletion GateをPASSした後に旧UIを切替。旧実装は削除せずCOMPATIBILITYとして保持。

## 9. mesh / grillage（Freeze）

- 主桁: 支間を `meshDivision`（既定10）分割し縦部材化（girder panel点を節点）。
- 横桁: crossBeamConfigurationの各stationでgirder間を横部材化。
- 中間節点はsupport点と統合（重複防止）。
- meshはAnalysisDocumentへ（再生成deterministic）。

## 10. validation / fail-closed

| 項目 | 挙動 |
|---|---|
| node重複座標 | 許容（IDで一意）・同一source統合 |
| member両端同一node | reject（ZERO_LENGTH_MEMBER） |
| orientationVector∥member軸 | reject（INVALID_ORIENTATION） |
| section/material参照欠損 | reject（dangling） |
| 未対応要素 | UNSUPPORTED（shell等） |

## 11. tests観点

- node/member生成（ID一意・sourceEntityId追跡・重複統合）
- orientationVector（主桁/横桁・直交性）
- support constraint（bool）
- spring対角加算
- release/rigidLink/MPC契約保持+solver fail-closed
- generator統合（production path唯一性）
- mesh determinism
