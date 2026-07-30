APOLLO_3D_STEP4_TO_STEP8_TRACEABILITY_VERDICT: PASS

# 13. Traceability Matrix

| 要件 | 正本設計書 | 実装予定PR | 実装予定ファイル | 検証方法 | completion gate |
|---|---|---|---|---|---|
| node display | `07_poc_a_line_model_design.md` | PR-2 | `frontend/src/apollo/visualization/*`, `frontend/src/viewer/*` | viewer mapping test | node表示 |
| member display | `07_poc_a_line_model_design.md` | PR-2 | 同上 | viewer mapping test | member表示 |
| support display | `07_poc_a_line_model_design.md`, `08_selection_validation_integration_design.md` | PR-2, PR-3 | `frontend/src/viewer/*`, `ApolloPhase1Shell.tsx` | support mapping + selection test | support表示 |
| camera controls | `07_poc_a_line_model_design.md` | PR-2 | `frontend/src/viewer/*` | camera preset / fit tests | top/front/side/isometric |
| selection sync | `08_selection_validation_integration_design.md` | PR-3 | `ApolloPhase1Shell.tsx`, `selection.ts`, `viewer/*` | selection integration tests | table<->3D sync |
| validation highlight | `08_selection_validation_integration_design.md` | PR-3 | `validationNavigator.ts`, `ApolloPhase1Shell.tsx`, `viewer/*` | validation navigation tests | severity highlight |
| girder solids | `09_simple_solid_model_design.md` | PR-4 | `frontend/src/apollo/visualization/*` | solid dimension tests | girder solids |
| cross beam solids | `09_simple_solid_model_design.md` | PR-4 | `frontend/src/apollo/visualization/*`, `frontend/src/viewer/*` | station/girder pair tests | cross beam solids |
| bracing | `09_simple_solid_model_design.md` | PR-4 | `frontend/src/apollo/visualization/*`, `frontend/src/viewer/*` | pattern/default tests | bracing fallback |
| deck | `09_simple_solid_model_design.md` | PR-4 | `frontend/src/apollo/visualization/*`, `frontend/src/viewer/*` | width/thickness tests | deck solid |
| bearings | `09_simple_solid_model_design.md` | PR-4 | `frontend/src/apollo/visualization/*`, `frontend/src/viewer/*` | support/bearing placement tests | bearing blocks |
| line/solid toggle | `09_simple_solid_model_design.md` | PR-4 | `frontend/src/viewer/SceneBuilder.ts`, `frontend/src/viewer/ThreeViewport.tsx`, `frontend/src/viewer/ViewerControls.tsx` | viewer visibility tests | line + solid coexistence |
| solid selection/validation highlight | `08_selection_validation_integration_design.md`, `09_simple_solid_model_design.md` | PR-4 | `frontend/src/viewer/renderers/ApolloVisualizationRenderer.ts` | support/member highlight tests | solid highlight inheritance |
| Apollo axis contract | `07_poc_a_line_model_design.md`, `09_simple_solid_model_design.md` | fix PR-B | `frontend/src/viewer/*`, `frontend/src/apollo/ApolloPhase1Shell.tsx` | axis mapping / no double swap tests | bridge longitudinal orientation |
| Apollo camera presets | `07_poc_a_line_model_design.md`, `09_simple_solid_model_design.md` | fix PR-B | `frontend/src/viewer/ThreeViewport.tsx`, `frontend/src/viewer/ViewerControls.tsx`, `frontend/src/viewer/threeUtils.ts` | preset direction / camera.up tests | plan/side/front/isometric |
| Apollo fit bbox exclusions | `07_poc_a_line_model_design.md`, `09_simple_solid_model_design.md`, `12_step4_to_step8_design_readiness_gate.md` | fix PR-B | `frontend/src/viewer/threeUtils.ts` | bbox / marker exclusion tests | fit-to-model |
| Apollo main viewer solid presentation | `09_simple_solid_model_design.md`, `12_step4_to_step8_design_readiness_gate.md` | fix PR-B | `frontend/src/apollo/ApolloPhase1Shell.tsx`, `frontend/src/viewer/*` | shell integration + browser/electron smoke | main screen solid visible |
| STL binary | `10_stl_export_design.md` | PR-5 | `frontend/src/apollo/export/*` | byte length / header tests | binary STL |
| manifest | `10_stl_export_design.md`, `11_persistence_reload_electron_design.md` | PR-5, PR-6 | `frontend/src/apollo/export/*` | schema / metadata tests | companion JSON |
| save/reload | `11_persistence_reload_electron_design.md` | PR-6 | `importExport.ts`, `desktop/projectFileDialog.ts` | reproducibility tests | same bbox / entity count |
| browser save | `10_stl_export_design.md`, `11_persistence_reload_electron_design.md` | PR-6 | `frontend/src/desktop/projectFileDialog.ts` | download behavior test | browser save |
| Electron save | `11_persistence_reload_electron_design.md` | PR-6 | `desktop/electron/*` | IPC/save/cancel tests | Electron save |
| Unit 3 regression | `03_implementation_plan_and_scope_freeze.md`, `12_step4_to_step8_design_readiness_gate.md` | PR-7 | tests + docs | regression suite | Unit 3副作用なし |
| deterministic output | `01_visualization_contract_freeze.md`, `10_stl_export_design.md`, `11_persistence_reload_electron_design.md` | PR-1, PR-5, PR-6 | visualization/export/tests | deterministic tests | repeatable output |

## PR-4 implementation note

- Thursday, July 30, 2026 時点の actual implementation では、simple solid geometry は persisted `BridgeDefinition` ではなく `apolloPhase1Unit2 ?? ProjectModel` と `ApolloBridgeGeometryDefaultsProvider` から derived build される。
- 実装ファイル実績:
  - `frontend/src/apollo/visualization/types.ts`
  - `frontend/src/apollo/visualization/builder.ts`
  - `frontend/src/viewer/renderers/ApolloVisualizationRenderer.ts`
  - `frontend/src/viewer/SceneBuilder.ts`
  - `frontend/src/viewer/ThreeViewport.tsx`
  - `frontend/src/viewer/threeUtils.ts`
  - `frontend/src/viewer/ViewerControls.tsx`
  - `frontend/src/apollo/__tests__/visualizationBuilder.test.ts`
  - `frontend/src/viewer/SceneBuilder.apolloVisualization.test.ts`
  - `frontend/src/viewer/ViewerControls.test.tsx`

## Post-PR-4 correction note

- Thursday, July 30, 2026 の browser repro で、simple solid 自体は renderer まで届いていることを確認した。
- 補正対象は `solid drop` ではなく、Apollo Z-up 契約と shared viewer camera / helper / fit 契約の整合である。
- docs PR-A では axis / camera / fit / prop flow 契約を修正し、fix PR-B で production code と tests を更新する。

## PR-5 implementation note

- Thursday, July 30, 2026 時点の actual implementation では、Binary STL export は `frontend/src/apollo/export/apolloStlExport.ts` から `ApolloVisualizationModel.solidGeometryParameters` を直接消費する。
- manifest schema は `frontend/src/apollo/export/apolloExportManifest.ts` に定義し、`digest` / `triangleCount` / `boundingBoxMm` / `includedGroups` / `excludedGroups` を export result と一致させる。
- browser save は PR-5 で `ApolloPhase1Shell.tsx` へ導入し、preset は `full / girders / deck / visible` を持つ。
- Step 8 scope である Electron save dialog / IPC / reload reproducibility はこの PR では未実装である。
- representative verification:
  - unit test: `src/apollo/__tests__/apolloStlExport.test.ts`
  - shell integration: `src/apollo/__tests__/ApolloPhase1Shell.test.tsx`
  - browser smoke: `/pro/apollo` で `STL + .apollo.json` download を確認
