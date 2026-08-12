# Phase 5-00 Step C: 資産分類（KEEP / ADAPT / REWRITE / DEFER）＋ Migration Map

## 1. 目的

Step A（inventory）と Step B（Connector/Adapter/Binding/Contract監査）を統合し、
全資産を **KEEP / ADAPT / REWRITE / DEFER** に分類する。
分類に際しては Geometry / 計算 / 3D / Persistence / UI / tests の各面を監査し、
全判定に根拠を記録する。最後に旧→新の **Migration Map** を提示する。

- baseline: `0728963b327f53a0c0bc728c0e9bc0d33f5e3267`（Step B merge後）
- 日付: 2026-08-12

## 2. 判定基準

| 分類 | 定義 |
|---|---|
| **KEEP** | 新システムでも責任境界・データ構造が適合し、ほぼそのまま利用可能 |
| **ADAPT** | 計算・Geometry・UI等は有効だが、旧BridgeProject/Apollo等への依存を新Project Data Core / Bridge Layout Contractへ接続変更する必要がある |
| **REWRITE** | 旧正本構造との密結合等により新システムの原則を壊すため、その部分のみ再実装が必要 |
| **DEFER** | Phase 5-01直後には不要。荷重・FEM・詳細設計・成果品など後続Phaseへ送る |

## 3. Geometry 監査

| 資産 | 役割 | 判定 | 根拠 |
|---|---|---|---|
| `apollo/geometry/types.ts`（GeometrySnapshot 契約） | 凍結ジオメトリ正本 | **KEEP** | 下流（3D/design/replay/export/BSDD）全てが仮定する凍結契約。新システムも入力正本として利用 |
| `apollo/geometry/contracts.ts` | GeometryEngineInput等 | **KEEP** | エンジン契約。新bindingの出力として維持 |
| `apollo/geometry/engine.ts`（DefaultGeometryEngine） | snapshot生成＋fingerprint | **KEEP** | 唯一のproducer。新システムでspan/support/girder配置→snapshot生成に利用 |
| `apollo/geometry/placement.ts` / `crossSectionFrame.ts` / `gridPoints.ts` / `deck.ts` / `members.ts` / `planeGridTransform.ts` | 配置・断面・グリッド・deck・member生成 | **KEEP** | ジオメトリ計算ロジックはそのまま有効。新正本からの入力を通す |
| `apollo/geometry/geometryInputAdapter.ts` | CBDM→input | **ADAPT** | 入力元を新正本へ差し替え。写像は純粋・決定 |
| `apollo/geometry/alignmentConnector.ts` | LINER→bridge | **ADAPT** | 新Road Module参照と同じLINER単一正本原則を維持。接続先を新正本へ |
| `bridgeProject/bridgeGeometryGenerator.ts` | Alignment+pier/span→geometry | ADAPT | Phase 4正本（BridgeLayoutDocument）由来のspan/supportへ差し替え |
| `bridgeProject/alignmentAdapter.ts` | LINER→BridgeProjectAlignment | ADAPT | 新PDCの`readRoadAlignmentContext`と重複。新側を正とする |
| `next/modules/renderCoordinate.ts` | domain→Three変換 | **KEEP** | 新システムの座標規約正本（x→x, y→z, z→-y）。Viewer表示変換はこれを正とする |
| `viewer/coordinateTransform.ts`（SpacerAxisSwap） | 旧model→viewer | DEFER | 旧FEM結果表示用。後続Phaseで整理。新systemとは別系統 |

## 4. 計算資産 監査

| 資産 | 役割 | 判定 | 根拠 |
|---|---|---|---|
| `apollo/bridgeStructure/sectionProperties.ts` | 鋼桁断面性能（I-beam） | **KEEP** | 純ジオメトリ計算。NOT_AUTHORIZED維持。Phase 5-01でsuperstructure設計の基盤として利用 |
| `apollo/design/grillageModel.ts` | snapshot→grillage FE model | **ADAPT（DEFER寄り）** | 解析モデル生成は有効。FEMは後続Phase。authorization NOT_GRANTEDゲート維持 |
| `backend/engine/grillage.py` + `solver.py` | 線形静解析ソルバ | **KEEP** | R0-08でもPORT/KEEP。計算エンジンとして再利用 |
| `apollo/design/checkFramework.ts` | RB001宣言checks（10checks） | **ADAPT（DEFER寄り）** | チェック枠組みは後続Phaseの実装基盤。全NOT_AUTHORIZED |
| `apollo/design/autoDesign.ts` | section候補ループ | DEFER | 主桁自動設計はPhase 5-00禁止対象。PENDING_AUTHORIZATION維持 |
| `apollo/loads/appurtenanceHaunchLoadModel.ts` | 死荷重（付属物/ハンチ） | **ADAPT（DEFER寄り）** | 荷重は後続Phase。ただし死荷重モデルはPhase 5-01の下部工Handoffで再利用予定 |
| `apollo/analysis/appurtenanceHaunchAnalysisAdapter.ts` | 単純支持closed-form解析 | DEFER | 詳細解析は後続Phase。未検証dev解析として維持（削除しない） |
| `apollo/bridgeStructure/generateBsdd.ts` | input→BSDD生成 | **ADAPT** | 上部工正本生成ロジック。新SuperstructureDocument生成のベース。girder offset式は有効 |
| `apollo/report/` / `quantity/` / `drawing/` | 計算書/数量/図面 | **ADAPT（DEFER寄り）** | 成果品Phase。正本参照へ変更して再利用 |
| `substructure/design/designEngine.ts`（HOLD_NOT_AVAILABLE） | 下部工設計枠組み | **KEEP** | 下部工Phase 6で再利用。現状は正しくfail-closed |
| `substructure/design/superstructureInterface.ts` + `superstructureEnvelope.ts` | 上部工→下部工交換 | **KEEP** | Phase 5上部工→Phase 6下部工Handoff境界としてそのまま利用可 |
| `backend/engine/bridge_fem_generator.py` | 旧FEM生成（station→X/offset→Y/Z=0仮定） | **REWRITE** | 旧値仮定。新GeometrySnapshot由来へ再実装（R0-08一致） |
| `backend/rule_engine/` | 道路構造令rule engine | **REWRITE（またはDEFER）** | R0-08: DEAD。新システムへ組み込むなら再配線、不要なら廃止。Phase 5-00では判断留保（DEFER） |

## 5. 3D 監査

| 資産 | 役割 | 判定 | 根拠 |
|---|---|---|---|
| `apollo/visualization/snapshot3d.ts` + `snapshotVisualizationModel.ts` | snapshot→3D payload | **KEEP** | 上部工3D生成。新システムの上部工3Dに流用 |
| `apollo/visualization/bridgeStructureSolids.ts` / `appurtenanceHaunchSolids.ts` / `pavementMarkingSolids.ts` | 3D solid生成 | **KEEP** | 部材solidロジック有効 |
| `apollo/export/apolloStlExport.ts` + `apolloExportManifest.ts` | Binary STL + manifest | **KEEP** | 成果品STL。deterministic・fail-closed価値 |
| `next/modules/integratedSceneBuilder.ts` + `bridgeLayoutScene.ts` | 新システム統合scene | **KEEP** | 新3D正本。上部工sceneはここへ追加 |
| `bridgeProject/integratedScene3d.ts` | ①+②+③旧統合scene | ADAPT（DEFER） | 旧座標規約（y-up swap）が新と異なる。新`renderCoordinate`へ整理して再利用。parity検証ロジック（support-XYZ）は有用 |
| `substructure/SubstructureSolidGenerator.ts` / `geometryBase.ts` | 下部工solid | **KEEP** | Phase 6で再利用 |
| `viewer/`（旧FEM viewer） | 解析結果表示 | DEFER | 後続Phase |

## 6. Persistence 監査

| 資産 | 役割 | 判定 | 根拠 |
|---|---|---|---|
| `next/persistence/`（filesystem/package/IPC） | 新Project永続化（project.json + .spacerproj + backup） | **KEEP** | 新システムの正規永続化。上部工moduleもここへ載せる |
| `next/project/projectDataCore.ts` + `schema.ts` | 新PDC parse/serialize | **KEEP** | 正本。superstructure module slot追加実装はPhase 5-01 |
| `bridgeProject/projectSuperstructure.ts` | 旧`apolloBridgeProjectSuperstructure` sidecar永続化 | **ADAPT** | 旧ProjectModel sidecar→新PDC `modules.superstructure`へ移行。round-trip検証踏襲 |
| `apollo/importExport.ts` | 旧Save/Load | DEFER（参照） | 旧システム向け。新システムはnext/persistenceを使用 |
| `contracts/persistence/saveDocument.ts` | 旧atomic store | DEFER（参照） | 旧永続化。新システムでは使用しない |

## 7. UI 監査

| 資産 | 役割 | 判定 | 根拠 |
|---|---|---|---|
| `next/pages/ProjectTopPage.tsx` | 設計モジュール一覧 | **ADAPT（Step Dで最小修正）** | registry順を表示。上部工→下部工の順へ変更 |
| `next/modules/registry.ts` + `next/project/schema.ts` | module順序・依存定義 | **ADAPT（Step Dで最小修正）** | 順序入替え（superstructure before substructure）＋依存の意味整理 |
| `next/modules/bridgeLayout/bridgeLayoutIntegrityGate.ts` | Phase 4 Completion Gate | **ADAPT（Step Dで最小修正）** | phase5/6Readyの意味を新順序へ（Span→Phase 5上部工 / Support→共通） |
| `next/pages/BridgeLayoutModuleShellPage.tsx` | Bridge Layout UI＋Completion Gate表示 | **ADAPT（Step Dで最小修正）** | Handoffラベルとreadiness表記を新意味へ |
| `next/pages/BusinessListPage.tsx` / `HomePage.tsx` | 業務一覧・ホーム | KEEP | 順序はregistry経由。個別修正不要 |
| `apollo/components/SuperstructurePipelinePanel.tsx` | 旧上部工E2Eパイプライン | **ADAPT（REFERENCE）** | 開発ハーネス。新SuperstructureModuleの設計参考とする。RB-001ハードコードは置き換えが必要（REWRITE要素） |
| `substructure/planning/*` | 下部工計画UI | **ADAPT（DEFER）** | Phase 6で新moduleへ接続 |
| `apollo/components/*`（各入力パネル） | 上部工入力UI | ADAPT（DEFER） | 上部工実装Phase（5-01以降）で利用判断 |

## 8. tests 監査

| 領域 | 現状 | 判定 | 根拠 |
|---|---|---|---|
| `next/`（67テスト） | PDC・bridgeLayout・handoff・persistence | **KEEP** | 新システムの正規テスト。Step D変更に追随更新 |
| `bridgeProject/`（15テスト） | Phase 3チェーンe2e | **KEEP（ADAPT）** | 旧資産のregressionとして維持。新システムと分離されたまま |
| `apollo/`（97テスト） | 上部工パイプライン | **KEEP（ADAPT）** | 旧資産regression。新moduleへの写像に流用 |
| `substructure/`（48テスト） | 下部工＋上部工Handoff | **KEEP** | Phase 6境界として維持 |
| `viewer/` / `if3/` / `contracts/` / `backend/` / `liner/` | 各regression | **KEEP** | 既存regression維持 |

## 9. KEEP / ADAPT / REWRITE / DEFER 総合分類表

### KEEP（新システムでそのまま利用）
- GeometrySnapshot契約・GeometryEngine一式
- sectionProperties・grillage backend solver
- 3D solid生成（snapshot3d / bridgeStructureSolids / apolloStlExport）
- 新PDC全体（projectDataCore / persistence / road / terrain / bridgeLayout）
- substructure designEngine枠組み・superstructureInterface / Envelope
- 既存regression tests

### ADAPT（接続先を新正本へ変更）
- superstructureAdapter / superstructureBinding / projectSuperstructure
- CommonModelGeometryInputAdapter / LinerAlignmentConnector
- generateBsdd・bridgeGeometryGenerator・alignmentAdapter
- loadモデル（appurtenanceHaunch）・report / quantity / drawing
- integrity gate・registry・schema・ProjectTopPage・BridgeLayoutModuleShellPage（Step D対象）
- substructureBinding・projectSuperstructure

### REWRITE（新原則を壊すため再実装）
- `backend/engine/bridge_fem_generator.py`（旧FEM値仮定）
- `SuperstructurePipelinePanel`のRB-001ハードコード入力（新moduleではユーザーデータ経路へ）
- 旧`viewer/coordinateTransform.ts`（新renderCoordinateへの統合）
- 旧`contracts/persistence/saveDocument.ts`（新persistenceへ）

### DEFER（後続Phaseへ送る）
- 荷重計算本実装・FEM本実装・反力本計算（Phase 6/FEM Phase）
- 主桁自動設計・床版/横桁/横構/支承詳細設計（Phase 5-01以降）
- 図面・計算書・数量・成果品（成果品Phase）
- 旧CASE B alignment再構築・rule_engine・旧FEM viewer

## 10. Migration Map

```
【旧】
BridgeProject（CBDM + manifest + sidecar）
Apollo（GeometrySnapshot / BSDD / 3D / STL / report / quantity / drawing）
既存Superstructure資産（superstructureAdapter / superstructureBinding / projectSuperstructure）
旧Binding / Adapter / schema（CommonModelGeometryInputAdapter / LinerAlignmentConnector / BSDD schema）

                    │  （compatibility boundary として維持：計算・Geometry・3D・出力の実行層）
                    ▼

【新】
Project Data Core（正本・永続化）
    │
    ├─ modules.road ──┬──（KEEP）Road正本。上部工はreferenceのみ
    ├─ modules.terrain ──（KEEP）地形。referenceのみ
    ├─ modules.bridgeLayout
    │      └─ BridgeLayoutDocument（唯一正本・KEEP）
    │             ├─ Span Handoff ──────→ Phase 5 上部工の正式入口（span配置）
    │             └─ Support Handoff ───→ 共通Support配置情報
    │                    ├─ Phase 5 上部工でも参照（support位置・標高・skew）
    │                    └─ Phase 6 下部工でも参照
    ├─ modules.superstructure（Phase 5-01で実装予定）
    │      └─ SuperstructureDocument（上部工正本へ集約予定）
    │             ├─ superstructureAdapter（ADAPT）→ shared facts
    │             ├─ superstructureBinding（ADAPT）→ GeometryEngineInput
    │             ├─ 既存Geometry / 計算 / 3D / Analysis（KEEP）を実行層として利用
    │             └─ Bearing / Reaction Handoff → Phase 6下部工へ
    ├─ modules.substructure（Phase 6）
    │      └─ superstructureEnvelope / support-interface（KEEP）で上部工成果を受ける
    ├─ modules.analysis（FEM / 構造解析）
    ├─ modules.cim（統合3D）─ renderCoordinateを正とする
    └─ modules.deliverables（成果品）

【新正本境界】
- Project（業務）が最上位正本
- BridgeLayoutDocument が Bridge Layout 唯一正本
- SuperstructureDocument が上部工正本（Phase 5-01以降に集約）
- 旧BridgeProject / Apollo を新正本にしない
- Connector内に別正本を作らない
- Road / Terrain / Existing の正本は上部工へ複製しない（ID/reference境界を優先）
- Viewer表示変換（renderCoordinate）は正本を書き換えない
```

## 11. 再利用推奨順序

1. **新PDC superstructure module** を正本として用意（Phase 5-01開始時）
2. GeometryEngine / GeometrySnapshot を入力正本として接続（KEEP）
3. superstructureBinding（ADAPT）で span/support/girder → GeometryEngineInput を生成
4. superstructureAdapter（ADAPT）で snapshot → SuperstructureDocument のshared factsを生成
5. 既存3D（snapshot3d / solids）で上部工3Dを表示（KEEP）
6. 下部工Handoff境界（superstructureEnvelope / support-interface）へ bearing/reaction を渡す（Phase 6）
7. 荷重・FEM・詳細設計・成果品はDEFER

## 12. リスク

- 分類は「Phase 5-00時点の静的判断」。Phase 5-01実装時に新正本（SuperstructureDocument）と既存BSDDの差分吸収コストが発生しうる。
- superstructureAdapterのproducer配線を新module内に閉じないと、旧App経路と二重正本になる。
- GeometrySnapshot契約の変更は高影響。KEEPとし、将来も互換性を保つ。
