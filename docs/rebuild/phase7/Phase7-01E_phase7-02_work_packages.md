# Phase 7-01E: Phase 7-02 Work Packages（設計Freeze）

- Phase: 7-01 Step E
- baseline: `4c6df0d8ff089e5c8ad8293867321e7da023c2e3`
- 日付: 2026-08-13

## 1. 目的

Phase 7-02を一括実装できるようWork Packageを完全定義する。
各WPに files / dependencies / implementation order / acceptance criteria / tests / PR boundary / rollback boundary / evidence / reused assets を固定。

## 2. WP一覧（Freeze）

| WP | 内容 | 主な設計書 | 主なR |
|---|---|---|---|
| WP-A | AnalysisDocument / Schema / PDC | 01A_master・01A_analysis_document | D-02/D-11 |
| WP-B | Superstructure→Analysis Adapter | 01B_superstructure | R2/R3/R7/R24 |
| WP-C | Substructure→Analysis Adapter | 01B_substructure | R5入力側 |
| WP-D | Bearing/Support/Spring/Foundation Spring | 01B_bearing_support・01B_foundation | R4/R5 |
| WP-E | FEM Model / Grillage / Section / Material | 01C_fem_model・01C_section_material | R6/R7/R24 |
| WP-F | Load / Load Combination | 01C_load_combination | R2 |
| WP-G | Solver Adapter / Grillage Production Path | 01C_grillage_solver | R1/R21/R22 |
| WP-H | Result / IF3 | 01D_result_if3 | R10/R11/R22 |
| WP-I | Persistence / stale invalidation | 01D_persistence | R8/R13 |
| WP-J | Viewer / UI | 01D_analysis_viewer | R11/R12 |
| WP-K | Reference Analysis / Golden | 01E_reference | R9/R16 |
| WP-L | Electron E2E / Completion Gate | 01E_test・01E_completion | R20/全体 |

## 3. WP詳細（Freeze）

### WP-A: AnalysisDocument / Schema / PDC

| 項目 | 内容 |
|---|---|
| files | `frontend/src/next/modules/analysis/analysisDocumentTypes.ts`・`frontend/src/next/modules/analysis/analysisDocument.ts`（build/validate）・`schemas/contracts/v0.1/analysis-document.schema.json`・`frontend/src/next/modules/analysis/persistence.ts` |
| dependencies | — |
| order | 1 |
| acceptance | schemaPASS・validation・PDC保存/読込（A-DOC-001..006） |
| tests | A-DOC系 |
| PR boundary | `feat/phase7-02-wpa-analysis-doc` |
| rollback | 新規moduleのみ（既存非破壊） |
| evidence | pytest/vitest出力 |
| reused | IF3 checksum・atomic_json・contract validation |

### WP-B: Superstructure→Analysis Adapter

| files | `frontend/src/next/modules/analysis/superstructureAdapter.ts`（再構成buildGrillageModel含む） |
| deps | WP-A |
| order | 2 |
| acceptance | 節点/部材/section/material/bearing/load生成（A-ADP-SUP系） |
| tests | A-ADP-SUP・A-FEM-001..004 |
| PR | `feat/phase7-02-wpb-super-adapter` |
| reused | superstructureLoadModel・computeSuperstructureSectionProperties・buildGrillageModel骨格 |

### WP-C: Substructure→Analysis Adapter

| files | `frontend/src/next/modules/analysis/substructureAdapter.ts` |
| deps | WP-A |
| order | 3 |
| acceptance | support/bearing seat/foundation（A-ADP-SUB・A-FDN系） |
| tests | A-ADP-SUB・A-FDN |
| PR | `feat/phase7-02-wpc-sub-adapter` |
| reused | substructurePhase4/5Adapter |

### WP-D: Bearing/Support/Spring/Foundation Spring

| files | `frontend/src/next/modules/analysis/bearingSpring.ts`・backend `engine/spring.py`（対角加算ADAPT） |
| deps | WP-B/C |
| order | 4 |
| acceptance | mapping table全ケース・spring対角加算（A-BRG・A-SPR） |
| tests | A-BRG-001..004・A-SPR・A-FDN |
| PR | `feat/phase7-02-wpd-bearing-spring` |
| reused | engine assembly（ADAPT） |
| rollback | spring加算はfeature flag or 別関数で切替可能 |

### WP-E: FEM Model / Grillage / Section / Material

| files | `frontend/src/next/modules/analysis/femModel.ts`・`sectionMaterial.ts`・fixtures |
| deps | WP-B/C/D |
| order | 5 |
| acceptance | FEM model生成・I断面性能・grillage mesh（A-FEM系） |
| tests | A-FEM |
| PR | `feat/phase7-02-wpe-fem-model` |
| reused | computeSuperstructureSectionProperties |

### WP-F: Load / Load Combination

| files | `frontend/src/next/modules/analysis/loadModel.ts`・`loadCombination.ts` |
| deps | WP-B |
| order | 6 |
| acceptance | 部材分布配分・総量保存・COMBO-1合成（A-LD・A-CMB） |
| tests | A-LD・A-CMB |
| PR | `feat/phase7-02-wpf-load` |
| reused | superstructureLoadModel |

### WP-G: Solver Adapter / Grillage Production Path

| files | `backend/engine/solver_input.py`（新）or `grillage.py`再設計・`backend/app/main.py`（/api/design/analyze再設計）・`frontend/src/api/client.ts` |
| deps | WP-E/F |
| order | 7 |
| acceptance | **grillage解析成功（R1）**・横桁OK・load転送・fail-closed（A-SLV-001..007） |
| tests | A-SLV |
| PR | `feat/phase7-02-wpg-grillage-solver` |
| reused | engine core（solver/assembly/element）・IF3 |
| rollback | 旧envelope受入をCOMPATIBILITY維持 |

### WP-H: Result / IF3

| files | `backend/app/main.py`（IF3接続）・`frontend/src/results/`（reaction key修正・VM） |
| deps | WP-G |
| order | 8 |
| acceptance | IF3正規化・reaction統一・source mapping（A-RES） |
| tests | A-RES |
| PR | `feat/phase7-02-wph-result-if3` |
| reused | if3_normalizer・if3ResultGate・resultViewModel |

### WP-I: Persistence / stale invalidation

| files | `frontend/src/next/modules/analysis/persistence.ts`・`staleness.ts`・backend `contract_document_store`（AnalysisDocument schemaId受入） |
| deps | WP-A/G/H |
| order | 9 |
| acceptance | 保存/読込・上流変更→STALE・autosave（A-PER） |
| tests | A-PER |
| PR | `feat/phase7-02-wpi-persistence` |
| reused | if3_persistence/staleness/availability・atomic_json |

### WP-J: Viewer / UI

| files | `frontend/src/viewer/`（spring/bearing renderer・combination選択・status表示） |
| deps | WP-H |
| order | 10 |
| acceptance | 表示項目全実装（A-UI） |
| tests | A-UI |
| PR | `feat/phase7-02-wpj-viewer` |
| reused | viewer renderers（KEEP） |

### WP-K: Reference Analysis / Golden

| files | `examples/analysis/*`・`backend/tests/fixtures/analysis/*`・`backend/tests/test_analysis_reference.py` |
| deps | WP-E/F/G |
| order | 11 |
| acceptance | 5種golden照合（A-REF） |
| tests | A-REF |
| PR | `feat/phase7-02-wpk-golden` |
| reused | examples/verification・sample_models |

### WP-L: Electron E2E / Completion Gate

| files | e2e tests・electron統合・completion gate検証 |
| deps | 全WP |
| order | 12 |
| acceptance | Completion Gate全項目（Phase7-01E_completion_gate） |
| tests | A-E2E・A-Q |
| PR | `feat/phase7-02-wpl-gate` |
| rollback | 各WPのPRを個別revert可能 |

## 4. Implementation order（Freeze）

```
WP-A → WP-B → WP-C → WP-D → WP-E → WP-F → WP-G → WP-H → WP-I → WP-J → WP-K → WP-L
```

- WP-DはWP-B/Cに依存（bearing/supportが先）。
- WP-GはWP-E/Fに依存（model/loadが先）。
- WP-KはWP-E/F/Gに依存（goldenはmodel/load/solver後）。

## 5. PR boundary / rollback（Freeze）

- 各WPは**独立PR**（`feat/phase7-02-wpX-*`）・mainへ個別merge。
- 各PRはrollback可能（個別revert・相互依存は順序のみ）。
- 巨大PR禁止（WP単位を超えない）。

## 6. evidence（Freeze）

- 各WP完了時に：PR番号・merge SHA・test結果（pytest/vitest）・typecheck/lint/build結果。
- Completion Gate（WP-L）で全evidenceをまとめる。

## 7. reused assets（Freeze）

- backend engine全層・IF3全層・frontend viewer/results/api/if3・handoff群・superstructureLoadModel・
  computeSuperstructureSectionProperties・schemas・examples/verification・sample_models。
- 新規コードはAnalysisDocument module（`frontend/src/next/modules/analysis/`）とbackend `engine/solver_input.py`・`engine/spring.py`に集中。
