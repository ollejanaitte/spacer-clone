# Phase 7-01A: Master Design（統合構造解析全体完全設計）

- Phase: 7-01（統合構造解析全体完全設計・Design Freeze）
- Step: A（Master Design + AnalysisDocument Contract）
- baseline: `288edc59f4445b3337e95970a3ab50a24aff5e2c`（Phase 7-00 Final Report merge・PR #967）
- 日付: 2026-08-13
- 上位baseline: Phase 7-00監査（Phase7-00A〜E）・Phase 5（上部工正本）・Phase 6（下部工正本）

## 1. Phase 7の目的

Phase 5上部工・Phase 6下部工の正本（SuperstructureDocument / SubstructureDocument）を、
既存FEM / Grillage / Solver / IF3 / Viewer / Persistence資産へ**正式接続**し、
統合構造解析縦断を確立する。

Phase 7-01では、Phase 7-02（統合構造解析一括実装・検証・Completion Gate）の実装担当者が
追加の設計判断をほぼ行わずに実装できるところまで、**全設計を凍結（Design Freeze）**する。

Phase 7-00監査のR1〜R24をすべて設計上閉じる（本設計書群の各Sectionで対応先を明示）。

## 2. IN-SCOPE / OUT-OF-SCOPE

### 2.1 IN-SCOPE（Phase 7-02で実装・検証）

| 分類 | 内容 |
|---|---|
| Document | AnalysisDocument（解析唯一正本）・schema・validation・PDC保存 |
| Adapter | Superstructure→Analysis / Substructure→Analysis / Bearing→Support / Load→Analysis |
| FEM Model | node / member / section / material / coordinate / DOF / support（bool）・**spring/elastic support/foundation spring（新Contract）** |
| Load | self weight / DL-STRUCTURAL / DL-DECK / DL-PAVEMENT / DL-APPURTENANCE（入力境界） / 部材分布載荷 / nodal load / COMBO-1実行 |
| Solver | 線形静解析（grillage/frame）production path再構築・eigen / response spectrum（既存KEEP・接続） |
| Result | displacement / reaction / member force / IF3正規化 / source entity mapping / sign/unit/axis統一 |
| Persistence | AnalysisDocument保存 / result IF3 sidecar / stale invalidation連動 / .spacerproj |
| Viewer/UI | FEM 3D表示（node/member/support/spring/bearing）・変形・反力・N/Q/M・color map・load case/combination選択・stale表示 |
| Reference | simple beam / continuous frame / spring support / grillage / RB-S10-001統合Bridge解析 golden |
| Test | 全Test Specification（Phase7-01E_test_specification）・Completion Gate |

### 2.2 OUT-OF-SCOPE（DEFER・明示）

| 分類 | 内容 | 対応 |
|---|---|---|
| 下部工詳細FEM | 下部工部材（柱・フーチング・杭）のFEMモデル化 | DEFER（下部工はsupport/bearing/foundation spring入力としてのみ解析modelへ反映） |
| LL実用 | 活荷重の実用載荷・影響線実用 | DEFER（liveLoadReference=null・入力境界） |
| 高度組合せ | 部分係数・envelope全種・施工段階組合せ | DEFER（COMBO-1のみ実装・他は宣言構造） |
| 本格設計照査 | 許容応力度・疲労・耐震照査 | DEFER（設計check Phase） |
| 非線形 | 材料非線形・幾何非線形 | DEFER |
| 動的非線形 | time historyは既存KEEPだが非線形動的はDEFER | DEFER |
| construction stage | 施工段階解析 | DEFER |
| shell FEM | 局所shellモデル | DEFER |
| release/MPC実装 | member end release・rigid link・MPCは**契約定義のみ**（solver実装はDEFER） | 契約のみ |
| 高度土・基礎相互作用 | advanced soil interaction | DEFER |

## 3. 正本階層（Phase 7 Design Decision D-01）

```
Project Data Core
├─ BridgeLayoutDocument      （正本・Phase 4・layout唯一authority）
├─ SuperstructureDocument    （正本・Phase 5・上部工唯一authority）
├─ SubstructureDocument      （正本・Phase 6・下部工唯一authority）
└─ AnalysisDocument          （正本・Phase 7・解析唯一authority・NEW）
```

- **正本複製禁止**：BridgeLayout / Superstructure / Substructure をAnalysis側へ複製しない。
- **AnalysisDocumentはderived正本**：上流3正本 + GeometrySnapshot（geometry authority）から
  **deterministic生成**され、sourceReference（ID+version+fingerprint）で上流へ追跡。
- **Solver内部データは正本にしない**。**Viewer dataは正本にしない**。
- **Resultはsource entity IDへ追跡可能**（node/member/supportのsourceEntityId保持）。
- **Adapter / Connector / Bindingに別正本を作らない**（mapping結果はAnalysisDocumentへ集約）。

### 3.1 GeometrySnapshotの位置づけ

- GeometrySnapshot（`frontend/src/apollo/geometry/types.ts`）は既存の凍結geometry authority。
- Analysis model生成の**座標・support点・girder線・横桁配置のsource**として利用（KEEP）。
- GeometrySnapshot自体はsuperstructure moduleのderived（`geometryReference.snapshotFingerprint`参照）。

## 4. upstream / downstream フロー

```
BridgeLayoutDocument ──(Phase4 support handoff)──> SuperstructureDocument
SuperstructureDocument ──(Phase5)───────────────> SubstructureDocument
                                                     │ (Phase6 bearing/reaction handoff)
                                                     ▼
SuperstructureDocument + SubstructureDocument + GeometrySnapshot
        ↓  Analysis Generation Layer（deterministic）
   AnalysisDocument（正本）
        ↓  Solver Input Adapter（analysis→backend project）
   engine/grillage.py（再設計）+ engine/solver.py（KEEP）
        ↓  Raw Result
   IF3 Result Adapter（if3_normalizer KEEP）
        ↓  FrameAnalysisResultResource
   Viewer（results VM / Viewer3D KEEP）+ Persistence（IF3 sidecar + AnalysisDocument）
```

## 5. Phase 5 / Phase 6 入力（正本の利用）

### 5.1 Phase 5入力（SuperstructureDocument・superstructureTypes.ts）

| 項目 | source field | 利用 |
|---|---|---|
| girder lines | `girderConfiguration.girderLines[]`（girderId/offset） | Analysis node/memberのgirder行生成 |
| section intent | `girderSectionModel`（depthM/webThicknessM/flange/areaM2/unitWeightPerM） | section property source（R7解決） |
| deck | `deckConfiguration`（thicknessM/unitWeight/resolvedWidthM） | DL-DECK・deck node |
| cross beam | `crossBeamConfiguration.crossBeams[]`（stationM/depthM/widthM） | 横桁member |
| bearing | `bearingConfiguration.bearingSeats[]`（seatId/bearingType/fixedOrMovable） | bearing→support mapping（R5解決） |
| load | `loadModel.deadLoads`（structuralGirder/deck/...） | DL配分source |
| reaction結果 | `reactionResults.reactionCases[]` | 下部工へのNOT_AUTHORIZED入力（既存handoff維持） |
| geometry | `geometryReference.snapshotFingerprint` | GeometrySnapshot参照 |

### 5.2 Phase 6入力（SubstructureDocument・substructureTypes.ts）

| 項目 | source field | 利用 |
|---|---|---|
| support位置 | `supportReferences.supports[]`（supportId/supportType/station/position/skew） | Analysis support node位置 |
| bearing seats | `bearingReactionReferences.bearingSeats[]`（seatId/supportId/girderId/position/orientation/fixedOrMovable） | bearing→Analysis node接続 |
| reaction case | `bearingReactionReferences.reactionCases[]`（NOT_AUTHORIZED入力） | 下部工側保持（解析側でauthorized扱いしない） |
| foundation | `support.pier/abutment/foundationConfiguration`（footing/pile） | **foundation springのsource候補**（値が資料に無ければNOT_AVAILABLEで閉じる） |

## 6. 主要Design Decision（Phase 7-01確定・各Sectionで詳細化）

| # | Decision | 内容 |
|---|---|---|
| D-01 | 正本階層 | §3のとおり。AnalysisDocumentは解析唯一正本（derived正本・ID reference + deterministic） |
| D-02 | AnalysisDocument schema | 新規 `spacer.contracts.analysis-document` v1.0.0・documentKind "analysis-document"（Phase7-01A_analysis_document_contract） |
| D-03 | 既存frame document関係 | `bridge-frame-analysis-document`（v0.1.0・skeleton・$ref破損）は**DEPRECATE（COMPATIBILITY）**。AnalysisDocumentがproduction解析documentの後継。IF3 binding/persistenceはAnalysisDocumentをsourceとしてADAPT（schemaId受入拡張） |
| D-04 | IF3接続 | `/api/design/analyze` および統合解析経路でraw result→IF3正規化→FrameAnalysisResultResource→persistedResultRef（R22解決）。sourceDocumentId=AnalysisDocument ID・sourceContentChecksum=AnalysisDocument checksum |
| D-05 | solver scope | IMPLEMENT: linear static（frame/grillage）。KEEP接続: eigen / response spectrum。DEFER: nonlinear系・動的非線形・construction stage |
| D-06 | 死荷重配分 | DL-STRUCTURAL/DL-DECKは**girder line沿いの部材分布載荷（memberLoad）+ 必要時nodalLoad**（R2解決）。support節点のみ載荷は正式仕様にしない |
| D-07 | load組合せ | COMBO-1（DL-STRUCTURAL+DL-DECK・係数1.0）を**実行可能**に設計。他組合せは宣言構造（DEFER） |
| D-08 | bearing→support | bearing種別（FIXED/MOVABLE/rubber）→DOF拘束/springのmapping table（R5解決）。rubberは弾性spring（phase 7-02でcontract定義・値はNOT_AVAILABLEで閉じ得る） |
| D-09 | spring/foundation spring | 6DOF spring Contract（translational+rotational・local/global）。値が資料に無ければNOT_AVAILABLE/SOURCE_NOT_AVAILABLEで閉じる（勝手に補完しない）（R4解決） |
| D-10 | section/material | SuperstructureDocumentのgirderSectionModel/unitWeightPerMからA/Iy/Iz/Jを導出（computeSuperstructureSectionProperties KEEP）。欠損時NOT_AVAILABLEでfail-closed（R7解決） |
| D-11 | ID契約 | AnalysisDocument内entity IDはsource entity IDからuuid5で決定論生成（stable・namespace `a12d8c1e-11f4-4d6b-9a2e-7f8c5d0e1b3a`）。全entityに `sourceEntityId` + `sourceKind` を統一保持（R12解決） |
| D-12 | sign/unit/axis | 統一契約（m・kN・kNm・rad・x沿線/y横断/z上・反力up-positive・右ねじ）。reaction key alias（rz→fz）廃止（R10/R11解決） |
| D-13 | FEM generator統合 | production=grillage経路（再設計後）。bridge_fem_generator=COMPATIBILITY（cutover後DEPRECATE）。bridgeDefinition structuralModelGenerator=COMPATIBILITY（R6/R20解決） |
| D-14 | stale invalidation | 上流（bridgeLayout/superstructure/substructure/load/solverSettings）変更→AnalysisDocument再生成→古い結果STALE（fingerprint/version比較）（R8解決） |
| D-15 | result persistence | linear static+統合解析結果をIF3 sidecarにpersist。timeHistory既存維持（R13解決） |
| D-16 | release/MPC | Contract定義のみ（AnalysisDocumentに保持・solver実装はDEFER）（R23解決） |
| D-17 | fail-closed | solver失敗envelopeをHTTP error化・UIは成功表示しない（R21解決） |
| D-18 | viewer | 共通renderCoordinate使用・viewer都合でAnalysisDocumentを変更しない（R11整合） |

## 7. Phase 7-00 Migration Map traceability

Phase7-00E §1のMigration Map配置に対する本設計の対応：

| Phase 7-00配置 | 本設計 |
|---|---|
| Solver層（KEEP） | engine/solver/model/assembly/element/dof/results/errors/constantsをKEEP（Phase7-01C_grillage_solver_contract） |
| Solver Adapter（KEEP/ADAPT） | engine/grillage.py再設計（envelope・orientation・load受渡し）（Phase7-01C） |
| Analysis Generation Layer | buildGrillageModel再構成+superstructureAnalysisAdapter配線（Phase7-01B） |
| Integrated Analysis Model（NEW） | AnalysisDocument契約+spring/foundation spring（Phase7-01A/B/C） |
| Result層（KEEP/ADAPT） | IF3接続+sign/unit/axis統一（Phase7-01D） |
| Persistence層 | AnalysisDocument保存+stale連動（Phase7-01D） |
| 3D/UI | viewer KEEP+renderCoordinate（Phase7-01D） |
| Reference層 | golden整備（Phase7-01E） |

## 8. Phase 7-02 Work Packages（概要・詳細はPhase7-01E）

| WP | 内容 | 主なR対応 |
|---|---|---|
| WP-A | AnalysisDocument / Schema / PDC | D-02 |
| WP-B | Superstructure→Analysis Adapter | R3 |
| WP-C | Substructure→Analysis Adapter | R5入力側 |
| WP-D | Bearing/Support/Spring/Foundation Spring | R4/R5 |
| WP-E | FEM Model / Grillage / Section / Material | R6/R7/R24 |
| WP-F | Load / Load Combination | R2 |
| WP-G | Solver Adapter / Grillage Production Path | R1/R21 |
| WP-H | Result / IF3 | R10/R11/R22 |
| WP-I | Persistence / stale invalidation | R8/R13 |
| WP-J | Viewer / UI | R11/R12 |
| WP-K | Reference Analysis / Golden | R9/R16 |
| WP-L | Electron E2E / Completion Gate | R20/全体 |

## 9. Completion Gate（概要・詳細はPhase7-01E）

Document / Adapter / FEM / Load / Solver / Result / Persistence / Reference / UI / Quality の
全項目PASSをPhase 7-02 COMPLETE条件として凍結（Phase7-01E_completion_gate）。

## 10. 設計書群（本PhaseでFROZENするもの）

- Phase7-01A_master_design.md（本doc）
- Phase7-01A_analysis_document_contract.md
- Phase7-01B_superstructure_analysis_adapter.md
- Phase7-01B_substructure_analysis_adapter.md
- Phase7-01B_bearing_support_spring_contract.md
- Phase7-01B_foundation_spring_release_mpc.md
- Phase7-01C_fem_model_contract.md
- Phase7-01C_section_material_contract.md
- Phase7-01C_load_combination_contract.md
- Phase7-01C_grillage_solver_contract.md
- Phase7-01D_result_if3_contract.md
- Phase7-01D_persistence_staleness.md
- Phase7-01D_analysis_viewer_ui.md
- Phase7-01E_reference_analysis_golden.md
- Phase7-01E_test_specification.md
- Phase7-01E_phase7-02_work_packages.md
- Phase7-01E_completion_gate.md
- Phase7-01F_design_freeze_gate.md

## 11. 本設計の成立根拠（KEEP資産の最大利用・Sol review #13）

- solver.py / model.py / element.py / dof.py / results.py：**変更しない方針**（R1修正はgrillage経路のproject生成側で解決）。
- **assembly.py：engine coreの一部だが、spring対角加算のため最小ADAPT（WP-D所有・回帰責任明示・#13）**。
- IF3 normalizer/persistence/staleness/availability：**変更を最小化**（AnalysisDocument schemaId受入 + entitySourceId活用のみADAPT）。
- viewer / results VM / IF3 binding / timeHistory UI：**KEEP**。
- Phase 5/6のhandoff契約（SuperstructureHandoff v1.0.0・bearing/reaction）をfield-levelで再利用。

## 12. Phase 7-02既定の確定（Sol review #18・代替案のDesign Change化）

未決定のままFreezeしない。Phase 7-02既定を一つに固定し、代替案はDesign Change候補へ。

| 論点 | **Phase 7-02既定（確定）** | 代替（Design Change候補） |
|---|---|---|
| pot支承 | **UNSUPPORTED（DEFER）** | movable扱い |
| validation実装 | **既存contract validation方式（zod踏襲・Phase5/6統一）** | 別方式 |
| Solver Input Adapter実装 | **`backend/engine/solver_input.py`（新規）** | grillage.py内再設計 |
| spring欠損 | **AUTHORIZED bearing拘束mapping適用（`springFallback`記録）** | 解析停止 |
| spring加算 | **WP-D所有のassembly最小ADAPT** | feature flag |
| COMBO-1表示 | **個別case+合成の両方表示（#17）** | COMBO-1のみ表示 |
| autosave | **有効化** | 無効維持 |
| 斜角bearing | **globalAxisApproximation（明示記録）** | UNSUPPORTED_SKEW fail-closed（skip条件時のみ） |
