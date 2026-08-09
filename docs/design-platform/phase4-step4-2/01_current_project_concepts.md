# 01 現行 Project 概念の棚卸し

> Phase 4 / Step 4-2（P0）
> コード根拠はファイルパスで示す。

## 1. 現行の「Project」相当単位

| 名称 | 実装パス | 責任 | source of truth | 保有データ | 参照関係 | 永続化 | BridgeProject との関係 | Protected Core |
|------|----------|------|-----------------|-----------|----------|--------|------------------------|----------------|
| ProjectModel | `frontend/src/types.ts:250-296` | 最上位アプリ状態（FEM + 各ツール sidecar） | in-memory + project.json | nodes/materials/sections/members/supports/loadCases + liner/apolloPhase1Unit2/apolloBsdd/apolloBridgeStructureInput/apolloBridgeProjectSuperstructure | sidecar 間は ID/名前で緩結合 | project.json / localStorage / backend autosave | 最上位に近いが BridgeProject を「包む」構造ではない | 一部（sidecar 永続化） |
| BridgeProject（CBDM + manifest） | `bridgeProject/{alignmentAdapter,bridgeGeometryGenerator,superstructureAdapter,substructureBinding,cbdmDocument}.ts` | **1橋梁単位の共有設計モデル**（①→②→③ の共通契約） | CBDM（canonical JSON） | Alignment / BridgeGeometry / Superstructure / Substructure binding / reconstruction / provenance | BridgeProject.Superstructure は ProjectModel.apolloBridgeProjectSuperstructure に sidecar 永続 | canonical JSON round-trip | — | **YES（Protected Core）** |
| LINER project / alignment | `liner/`（core/schema/adapters） | ①道路線形（多 alignment を bundle 保持可能） | `project.liner`（ProjectLinerMetadata）→ domainDraft | alignment elements / station / vertical / crossSection / piers / spans | activeAlignmentId + linerAlignments bundle | `project.liner` + RDD | ①→BridgeProject.Alignment | ①側は Core 境界 |
| Apollo workspace | `apollo/workspace.ts`（localStorage `apollo_phase1_nn_workspace_v1`） | ②上部工の workspace 保存（最大12） | localStorage workspace | apolloPhase1Unit2 / apolloBsdd / apolloBridgeStructureInput | bridgeId で紐づけ | localStorage | ②→BridgeProject.Superstructure | ②側は Core 境界 |
| SubstructureProject | `substructure/model.ts` + `planning/persistence.ts` | ③下部工（support/pier/abutment） | SubstructureProject 0.2.0 | supports/pier/abutment/foundation | alignmentId + supportId | `substructure-project.json`（envelope） | ③ = BridgeProject から binding | ③側は Core 境界 |
| FEM / analysis project | `backend/app/main.py`（/api/projects/save|load|autosave）、`types.ts` の nodes/members/… | 骨組み解析モデル | ProjectModel | FEM モデル + analysisSettings | — | backend/data/autosave.json / project.json | ② の grillage は BridgeProject 経由の snapshot | 一部 |
| importer project | `liner/importer/storage/importerStorage.ts`（localStorage `spacer.importer.*`） | PDF 線形インポートの中間 | importer project | line master / sections | — | localStorage | ① の入力候補 | no |
| sample / fixture | `apollo/sampleProjects.ts`・`liner/samples/mountain-viaduct-500/`・`docs/apollo/step10/reference_bridge_001/` | デモ・golden 検証 | 各 fixture | 山岳500m / RB-001 / 200m | — | repo 内 | 山岳500m は CASE A 代表 | no |
| terrain / 3D | `liner/samples/mountain-viaduct-500/terrain.ts`（DISPLAY_LAYER） | 地形表示（計算に使用しない） | 決定論 heightfield | terrain mesh | 表示専用 | repo 内 | Main3D のレイヤ | no |

## 2. 現行の「最上位」は何か

- **アプリ状態の最上位 = ProjectModel**（`types.ts`）。ただしこれは「1 件の FEM + 各ツールの sidecar を一緒に持つ」構造で、
  **「1 業務 = 複数道路 / 複数橋梁 / 複数解析」を表現できない**。
- **1 橋梁単位の共有モデル = BridgeProject**（`bridgeProject/`）。複数橋梁の集合を所有する上位概念は存在しない。
- LINER は alignment を bundle で複数持てる（`LinerDomainDraftVNext.alignments`）が、**道路路線 / 離れ区間の概念は無い**。
- **現行には「業務」を表す単位が存在しない。** これは Step 4-2 で新設する。

## 3. 現行の参照構造

- ①→BridgeProject→②→BridgeProject→③ は **BridgeProject を唯一の共通契約**として成立（CASE A/B）。
- 各ツールは ProjectModel の sidecar として同居し、**橋梁間の関係・道路路線と橋梁の関係を表す概念が無い**。

## 4. Protected Core として保護すべき現行単位

- BridgeProject（CBDM + manifest）＝ **1 橋梁単位**の共有設計モデル。
- CASE A/B、provenance/status/revision/cycle guard、NOT_AUTHORIZED、Save/Load/Replay、Main3D、Calculation Adapter。
- → これらを**最上位に置き換えるのではなく、1 橋梁単位の Core として上位 Business Project が参照/所有**する。
