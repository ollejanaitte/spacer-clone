# Evidence Inventory — Bridge Modeler V2

Status: 2026-07-14 作成
Source: コードベース Read-Only 調査による

## 1. Legacy Entry Point（Legacy ウィザード）

| 項目 | 状態 | 証拠パス |
| --- | --- | --- |
| Toolbar → BridgeWizard | **CONFIRMED** | `frontend/src/components/Toolbar.tsx:112` — `onClick={onOpenBridgeWizard}` |
| App state `bridgeWizardOpen` | **CONFIRMED** | `frontend/src/App.tsx:115` — `useState<boolean>(false)` |
| BridgeWizard モーダル | **CONFIRMED** | `frontend/src/App.tsx:1081-1085` — `<BridgeWizard open={bridgeWizardOpen} ...>` |
| ルートなし | **CONFIRMED** | grep 結果: `bridge-modeler` パスは frontend 内に存在しない。モーダル起動のみ |
| 6-step Wizard | **CONFIRMED** | `frontend/src/bridge/BridgeWizardState.ts:12` — `WIZARD_STEPS = [1,2,3,4,5,6]` |
| Step 1: RoadCondition | **CONFIRMED** | `frontend/src/bridge/BridgeWizard.tsx:191` |
| Step 2: SpanSetting | **CONFIRMED** | `frontend/src/bridge/BridgeWizard.tsx:192` |
| Step 3: ImpactFactor | **CONFIRMED** | `frontend/src/bridge/BridgeWizard.tsx:193` |
| Step 4: LineSetting | **CONFIRMED** | `frontend/src/bridge/BridgeWizard.tsx:194` |
| Step 5: LoadSetting | **CONFIRMED** | `frontend/src/bridge/BridgeWizard.tsx:195` |
| Step 6: ModelGeneration | **CONFIRMED** | `frontend/src/bridge/BridgeWizard.tsx:196` |

## 2. Legacy Types (BridgeProject 0.1.0)

| 項目 | 状態 | 証拠パス |
| --- | --- | --- |
| `BridgeProject` 型定義 | **CONFIRMED** | `frontend/src/bridge/types.ts:49-63` |
| `schemaVersion: "0.1.0"` | **CONFIRMED** | `frontend/src/bridge/types.ts:52` |
| `CrossSection` | **CONFIRMED** | `frontend/src/bridge/types.ts:2-8` |
| `Span` | **CONFIRMED** | `frontend/src/bridge/types.ts:10-14` |
| `ImpactFactor` | **CONFIRMED** | `frontend/src/bridge/types.ts:16-20` |
| `BridgeLine` | **CONFIRMED** | `frontend/src/bridge/types.ts:24-29` |
| `BridgeLoad` | **CONFIRMED** | `frontend/src/bridge/types.ts:31-39` |
| `BridgeGenerationSettings` | **CONFIRMED** | `frontend/src/bridge/types.ts:41-47` |
| `GeneratedFemModel` | **CONFIRMED** | `frontend/src/bridge/types.ts:65-79` |
| `BridgeFemResponse` | **CONFIRMED** | `frontend/src/bridge/types.ts:81-91` |
| `ViewerModelPayload` | **CONFIRMED** | `frontend/src/bridge/types.ts:93-100` |
| `WizardStep = 1\|2\|3\|4\|5\|6` | **CONFIRMED** | `frontend/src/bridge/types.ts:102` |

## 3. Legacy FEM Generation（flat z=0 grid）

| 項目 | 状態 | 証拠パス |
| --- | --- | --- |
| `POST /api/fem/generate` | **CONFIRMED** | `backend/app/main.py:1017` |
| `generate_fem_model` 関数 | **CONFIRMED** | `backend/engine/bridge_fem_generator.py:136` |
| z=0 フラットグリッド | **CONFIRMED** | `backend/engine/bridge_fem_generator.py:167` — `"z": 0.0` |
| セマンティック ID なし | **CONFIRMED** | `backend/engine/bridge_fem_generator.py:162-168` — `nid = f"N{counter}"` インデックスベース |
| x/y_positions 計算 | **CONFIRMED** | `backend/engine/bridge_fem_generator.py:142-143` |
| BridgeProject → FEM 直結 | **CONFIRMED** | `backend/app/main.py:1043` — `generate_fem_model(project)` |

## 4. BridgeDefinition (schema 1.0.0)

| 項目 | 状態 | 証拠パス |
| --- | --- | --- |
| `BridgeDefinition` インターフェース | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:173-191` |
| `schemaVersion: "1.0.0"` | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:11` |
| `BridgeDefinitionSource` (liner/bridgeProject/manual/unknown) | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:17-31` |
| `BridgeDefinitionCoordinatePolicy` | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:34-49` |
| `BridgeDefinitionAlignmentRef` | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:52-56` |
| `BridgeDefinitionStation` | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:59-68` |
| `BridgeDefinitionSpan` | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:70-77` |
| `BridgeDefinitionSupport` | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:79-87` |
| `BridgeDefinitionGirder` | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:103-112` |
| `BridgeDefinitionCrossBeam` | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:114-119` |
| `BridgeDefinitionBearing` | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:121-125` |
| `BridgeDefinitionDeck` | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:127-132` |
| `BridgeDefinitionLoad` | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:140-148` |
| `BridgeDefinitionGenerationSettings` | **CONFIRMED** | `frontend/src/bridgeDefinition/types.ts:150-158` |

## 5. BridgeDefinition Adapters

| 項目 | 状態 | 証拠パス |
| --- | --- | --- |
| BridgeProject → BridgeDefinition | **CONFIRMED** | `frontend/src/bridgeDefinition/adapters/fromBridgeProject.ts:82` — `createBridgeDefinitionFromBridgeProject` |
| LinerBridge → BridgeDefinition | **CONFIRMED** | `frontend/src/bridgeDefinition/adapters/fromLinerBridge.ts:87` — `createBridgeDefinitionFromLinerBridge` |
| Adapters index.ts | **CONFIRMED** | `frontend/src/bridgeDefinition/adapters/index.ts` |
| BridgeDefinition → StructuralModel | **CONFIRMED** | `frontend/src/bridgeDefinition/generator/structuralModelGenerator.ts` |
| Feature flag `VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL` | **CONFIRMED** | `frontend/src/bridgeDefinition/featureFlags.ts:1` |

## 6. LINER Revision (sourceRevision)

| 項目 | 状態 | 証拠パス |
| --- | --- | --- |
| `sourceRevisionFor` 関数 | **CONFIRMED** | `frontend/src/liner/core/pipeline/sourceRevision.ts:18` |
| SHA-256 ベース | **CONFIRMED** | `frontend/src/liner/core/pipeline/sourceRevision.ts:19` |
| `canonicalJson` | **CONFIRMED** | `frontend/src/liner/core/pipeline/sourceRevision.ts:3` |
| pipeline.ts での使用 | **CONFIRMED** | `frontend/src/liner/core/pipeline/pipeline.ts:505` — `sourceRevisionFor({...})` |
| DependencySnapshot 生成 | **CONFIRMED** | `frontend/src/liner/core/pipeline/pipeline.ts:470-499` |

## 7. DrawingDocument / DXF

| 項目 | 状態 | 証拠パス |
| --- | --- | --- |
| `DrawingDocument` 型 | **CONFIRMED** | `frontend/src/liner/drawing/model/document.ts:38-43` |
| `DrawingSheet` | **CONFIRMED** | `frontend/src/liner/drawing/model/document.ts:31-36` |
| `DrawingViewport` | **CONFIRMED** | `frontend/src/liner/drawing/model/document.ts:21-29` |
| `DrawingLayer` | **CONFIRMED** | `frontend/src/liner/drawing/model/document.ts:12-19` |
| `DrawingDiagnostic` | **CONFIRMED** | `frontend/src/liner/drawing/model/diagnostics.ts:1-8` |
| DXF Mapper | **CONFIRMED** | `frontend/src/liner/dxf/mapper/mapDrawingDocumentToDxf.ts` |
| DXF Serializer | **CONFIRMED** | `frontend/src/liner/dxf/serializer/` (存在) |
| Bridge Drawing との接続 | **ABSENT** | Bridge wizard → DrawingDocument の接続は未実装。LINER formal workspace のみ |

## 8. Viewer

| 項目 | 状態 | 証拠パス |
| --- | --- | --- |
| BridgeThreeViewer | **CONFIRMED** | `frontend/src/bridge/viewer/BridgeThreeViewer.tsx` |
| Viewer3D (App) | **CONFIRMED** | `frontend/src/viewer/Viewer3D.tsx` |
| LINER ViewerAdapter | **CONFIRMED** | `frontend/src/liner/adapters/linerViewerAdapter.ts` |
| Bridge Viewer endpoint | **CONFIRMED** | `backend/app/main.py:1065` — `GET /api/viewer/bridge/{bridge_id}` |

## 9. Persistence / API

| 項目 | 状態 | 証拠パス |
| --- | --- | --- |
| Bridge CRUD API | **CONFIRMED** | `frontend/src/bridge/api.ts:22-64` — create/get/update/delete |
| `POST /api/bridge/template` | **CONFIRMED** | `frontend/src/bridge/api.ts:14` |
| Bridge JSON ファイル保存 | **CONFIRMED** | `frontend/src/bridge/BridgeWizard.tsx:104-113` — download |
| V2 専用 API エンドポイント | **ABSENT** | `/api/bridge-modeler-v2/...` は未存在。ADR-BMV2-010 の設計対象 |
| V2 ドキュメント永続化 | **ABSENT** | `BridgeModelerV2Document` の保存先は未定（OD-01, OD-02） |

## 10. Tests

| 項目 | 状態 | 証拠パス |
| --- | --- | --- |
| BridgeWizardState.test.ts | **CONFIRMED** | `frontend/src/bridge/BridgeWizardState.test.ts` |
| BridgeWizard.test.tsx | **CONFIRMED** | `frontend/src/bridge/BridgeWizard.test.tsx` |
| bridgeValidation.test.ts | **CONFIRMED** | `frontend/src/bridge/bridgeValidation.test.ts` |
| bridge_fem_generator.py テスト | **CONFIRMED** | `backend/tests/test_bridge_fem_generator.py` |
| bridge_api.py テスト | **CONFIRMED** | `backend/tests/test_bridge_api.py` |
| fromBridgeProject adapter テスト | **CONFIRMED** | `frontend/src/bridgeDefinition/adapters/fromBridgeProject.test.ts` |
| fromLinerBridge adapter テスト | **CONFIRMED** | `frontend/src/bridgeDefinition/adapters/fromLinerBridge.test.ts` |
| structuralModelGenerator テスト | **CONFIRMED** | `frontend/src/bridgeDefinition/generator/structuralModelGenerator.test.ts` |
| Semantic Parity テスト群 | **CONFIRMED** | `frontend/src/bridgeDefinition/semanticParity/__tests__/` (多数) |
| DXF テスト群 | **CONFIRMED** | `frontend/src/liner/dxf/__tests__/` (多数) |

## 11. Docs List

| 項目 | 状態 | 証拠パス |
| --- | --- | --- |
| docs/design/bridge-domain-model.md | **CONFIRMED** | `docs/design/bridge-domain-model.md` |
| docs/design/bridge-fem-generator.md | **CONFIRMED** | `docs/design/bridge-fem-generator.md` |
| docs/design/bridge-model-wizard.md | **CONFIRMED** | `docs/design/bridge-model-wizard.md` |
| docs/design/bridge-viewer-interaction.md | **CONFIRMED** | `docs/design/bridge-viewer-interaction.md` |
| docs/liner/phase4.5/bridge_definition_design.md | **CONFIRMED** | `docs/liner/phase4.5/bridge_definition_design.md` |
| docs/liner/phase4.5/bridge_definition_architecture_freeze.md | **CONFIRMED** | `docs/liner/phase4.5/bridge_definition_architecture_freeze.md` |
| docs/liner/phase4.5/step8_semantic_parity_spec.md | **CONFIRMED** | `docs/liner/phase4.5/step8_semantic_parity_spec.md` |
| docs/liner/domain_model.md | **CONFIRMED** | `docs/liner/domain_model.md` |

## 12. Evidence Matrix — Supervisor Decisions vs Code

| ADR | 監督決定内容 | コード状態 | 評価 |
| --- | --- | --- | --- |
| ADR-BMV2-001 | V2 専用ルート、Legacy 保持 | ルート未実装、Legacy は Toolbar モーダル起動 | Legacy は CONFIRMED、V2 ルートは未実装（新規作成対象） |
| ADR-BMV2-002 | LINER が source of truth | `sourceRevisionFor` は LINER pipeline に実装済み | CONFIRMED |
| ADR-BMV2-003 | 4層モデル | BridgeDefinition は 1.0.0 実装済み、V2 の 4 層は新規 | BridgeDefinition は CONFIRMED、V2 層は新規作成対象 |
| ADR-BMV2-004 | Deterministic stable IDs | Legacy は `N{counter}` インデックスベース | Legacy は ABSENT（V2 で新規） |
| ADR-BMV2-005 | Deck/traffic load surface 分離 | 未実装（Legacy は `line_id` ベース） | ABSENT（新規作成対象） |
| ADR-BMV2-006 | DrawingDocument is IR | LINER には DrawingDocument 実装済み、Bridge 未接続 | LINER は CONFIRMED、Bridge 接続は DISCONNECTED |
| ADR-BMV2-007 | Staged FEM pipeline | Legacy は一括 `generate_fem_model`、diagnostics は型のみ | PARTIAL（`BridgeFemResponse.diagnostics` 型あり、実質的なステージングなし） |
| ADR-BMV2-008 | Schema & persistence | Legacy: `bridge-*.json`、V2: 未実装 | Legacy は CONFIRMED、V2 は ABSENT |
| ADR-BMV2-009 | Units & coordinates | BridgeDefinition に `coordinatePolicy` 実装済み | CONFIRMED |
| ADR-BMV2-010 | Frontend/backend split | Frontend: TypeScript DOMINANT、Backend: solver のみ | CONFIRMED |
| ADR-BMV2-011 | Feature flag `VITE_BRIDGE_MODELER_V2` | `VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL` のみ存在 | DISCONNECTED（V2 専用フラグは未実装） |
| ADR-BMV2-012 | Undo/redo | 未実装 | ABSENT（新規作成対象） |
| ADR-BMV2-013 | Diagnostics envelope | `DrawingDiagnostic` 型実装済み、BridgeDefinition 系 diagnostics は型のみ | PARTIAL |
| ADR-BMV2-014 | BridgeDefinition 関係 | Adapters 実装済み（BridgeProject → BD、LinerBridge → BD） | CONFIRMED |
