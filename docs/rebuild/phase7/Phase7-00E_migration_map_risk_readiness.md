# Phase 7-00E: Migration Map / Risk / Gap / Phase 7-01 Readiness判定

- Phase: 7-00
- Step: E（Migration Map + Risk/Gap + Phase 7-01 Readiness判定）
- baseline: `d15c54542af1ad68a1873e74b427933e98f12863`（Step D merge後）
- 日付: 2026-08-13

## 1. Migration Map（Phase 7-01で目指す構造）

```
Project Data Core
├─ BridgeLayoutDocument（正本・Phase 4）
├─ SuperstructureDocument（正本・Phase 5）
└─ SubstructureDocument（正本・Phase 6）
        ↓
Analysis Compatibility / Generation Layer（Phase 7-01でContract設計）
├─ Superstructure→Analysis adapter（既存superstructureAnalysisAdapterを配線・ADAPT）
│    └─ buildGrillageModel（KEEP）+ dead load配分（REWRITE）
├─ Substructure→Analysis adapter（NEW DESIGN・bearing/support/foundation spring）
├─ Load/Combination adapter（DL/LL・組合せ・envelope）
└─ Bearing/Support adapter（bearing種別→拘束条件 mapping）
        ↓
Integrated Analysis Model（新Contract・Phase 7-01 Design Freeze対象）
├─ node/member/section/material（SuperstructureDocument由来）
├─ support/bearing/spring（SubstructureDocument由来・NEW DESIGN）
└─ load cases（DL-STRUCTURAL/DL-DECK/LL・組合せ）
        ↓
Solver Adapter（既存backend engineをKEEP+ADAPT）
├─ engine/grillage.py（**project envelope再設計・横桁orientation対応・load受渡し＝REWRITE**）
└─ engine/solver.py（KEEP・spring導入時はassembly/model ADAPT）
        ↓
Existing/New Solver
└─ scipy_sparse（KEEP）・eigen/RS/TH（KEEP・統合goldenは後続）
        ↓
Result Adapter（既存IF3をKEEP・接続）
└─ if3_normalizer/persistence/staleness/availability
        ↓
Analysis Result
└─ FrameAnalysisResultResource（IF3 v0.1.0）
        ↓
3D / UI / Persistence
├─ viewer/（KEEP・表示専用）
├─ ResultViewModel/IF3 gate（KEEP）
└─ persistence（IF3 sidecar・timeHistory・stale invalidation連動をPhase 7-01で拡張）
```

### 1.1 既存資産のMigration Map配置

| 既存資産 | Map上の位置 | 分類 |
|---|---|---|
| `engine/solver.py` / `model.py` / `assembly.py` / `element.py` / `dof.py` / `results.py` | Solver層（KEEP・直接利用） | KEEP |
| `engine/grillage.py` | Solver Adapter（**envelope再設計+横桁orientation+load受渡し＝REWRITE**） | KEEP/REWRITE |
| `apollo/design/grillageModel.ts`（buildGrillageModel） | Analysis Generation Layer（骨格KEEP・荷重/mesh/topology部分はREWRITE） | KEEP/ADAPT/REWRITE |
| `superstructureAnalysisAdapter.ts` | Analysis Generation Layer（配線+荷重生成REWRITE） | ADAPT/REWRITE |
| `superstructureBasicChecks.ts` | 後続（設計check Phase・配線予定） | ADAPT |
| `substructurePhase5Adapter.ts` / `superstructureHandoff.ts` | Project Data Core↔Analysis（受領側・KEEP） | KEEP |
| `engine/bridge_fem_generator.py` | **置換**（grillage経路へ・cutover要） | REWRITE |
| spring/elastic support/foundation spring | Integrated Analysis Model（**新規**）+ engine model/schema/assembly/result/test ADAPT | NEW DESIGN |
| `engine/if3_*.py` | Result層（KEEP・availability UI接続はADAPT） | KEEP/ADAPT |
| `viewer/` / `results/*` / `if3/` | 3D/UI（KEEP） | KEEP |
| IF3 persistence / stale | Persistence層（KEEP・Document連動はADAPT） | KEEP/ADAPT |
| `examples/verification/*` / `sample_models.py` | Reference層（KEEP・統合goldenは新規） | KEEP |
| RB-S10-001 golden群 | Reference層（KEEP・解析goldenはPhase 7-01で設計） | KEEP |
| `level0/`・`buildIf3ResultViewModel` | 整理（REMOVE候補） | REMOVE候補 |
| 下部工FEM解析・LL・組合せ実行・設計照査 | DEFER（後続Phase） | DEFER |

## 2. Risk / Gap List

Severity: CRITICAL / HIGH / MEDIUM / LOW。Phase 7-01で設計解決すべきものを明示。

| # | Risk/Gap | Severity | 現状の根拠 | Phase 7-01での扱い |
|---|---|---|---|---|
| R1 | **grillage解析実行不能（C1）**：`run_grillage_analysis`がenvelope誤渡しでSCHEMA_ERROR。**さらに`build_grillage_project`のproject構造自体が不正**（全modelを"project"内にネスト+"metadata"key使用・ProjectInfoのid/nameと不一致）。**`run_analysis(built)`ではProjectInfoのunexpected keywordで別のSOLVER_ERRORになる**。横桁（y方向部材）はorientationVector {0,1,0}平行でINVALID_ORIENTATION。テスト（縦部材のみ・解析成功未検証）では検出不能 | **CRITICAL** | live実測+`grillage.py:86,100,119`+`model.py:17,185`+`element.py:25` | **REWRITE**（build_grillage_projectを正しいenvelope（`{project:ProjectInfo, units, nodes, ...}`）へ再設計+横桁orientation対応+成功検証test） |
| R2 | **死荷重配分がsupport節点のみ**（部材分布載荷なし・支間中央の曲げを生まない）＋production pipelineは無載荷。**さらにadapterが生成する`nodalLoads`をbackend `build_grillage_project`が転送しない**（nodes/members/supports/loadCasesのみ読取） | **CRITICAL** | `superstructureAnalysisAdapter.ts:78-98,109-118`+`grillage.py:53-56`+`grillageModel.ts:123` | load配分（部材分布荷重）+受渡し+保存+荷重反力釣合いtestのContract設計 |
| R3 | **Superstructure→Analysis正式adapter未接続（DORMANT）** | HIGH | テスト+module barrelのみ | Phase 7-01で配線+荷重生成REWRITE |
| R4 | **spring/elastic support/foundation springが存在しない**（統合解析modelの境界条件に不可欠・Phase 7-01 Design Freezeで柔支持を必須範囲とする場合CRITICAL） | **CRITICAL**（柔支持をPhase 7-01必須範囲とする場合） | engine全体grep・`springsCapability: absent` | 新Contract（NEW DESIGN）。**model.py/schema/assembly剛性組立/spring反力結果/検証testもADAPT対象**（FEM coreをそのままKEEPとは両立しない） |
| R5 | **bearing種別→拘束条件mappingが無い**（位置ベース一律拘束のみ） | HIGH | `grillage.py:64-76` | bearing→support mapping契約 |
| R6 | **3系統FEM model generator並存**（grillage / bridge_fem_generator / bridgeDefinition）→duplicate truth・ID drift | HIGH | 実コード3系統 | canonical generator選定（grillage）+統一 |
| R7 | **section/materialが宣言値**（SuperstructureDocument実断面と未接続）→**有効な工学結果を阻害** | **CRITICAL候補** | `grillage.py:35-48` | section/material mapping契約 |
| R8 | **Document変更→解析frame binding連動が未設計**（IF3 staleはframe内のみ・上部工/下部工変更が自動伝播しない） | HIGH | `if3_staleness.py:250-316` | stale invalidation連動設計 |
| R9 | **統合Bridge解析golden未整備**（RB-S10-001 analysisReference=NOT_AVAILABLE・個別closed-formのみ） | MEDIUM | `analysis_result_parity_note.md` | 統合golden設計+整備 |
| R10 | **reaction key alias不整合**（`rz→fz` fallback・IF3 resource未対応） | MEDIUM | `superstructureAnalysisAdapter.ts:149` | result adapter契約（IF3直接読取） |
| R11 | **sign/unit/axisの局所規約が散在**（反力up-positive・座標x沿線等は設計書凍結済みだが実装層で未統一） | MEDIUM | D-01/D-02/Phase6-01B | 統合model/resultのsign/unit/axis統一Contract |
| R12 | **solver入力/output mismatch潜在**（loadCase ID・member/support ID・node IDのsource毎不一致） | MEDIUM | ID scheme複数（N-、M-、BRG-、N1..） | ID reference契約（stable entity ID） |
| R13 | **結果persistが限定的**（IF3 sidecar指定時+timeHistoryのみ・raw結果transient・autosave無効） | MEDIUM | `App.tsx:151,737-799` | 解析結果保存の正式Contract |
| R14 | **frontend/backend二重実装**（grillage generatorがfrontend/backend両側・bridge_femも同様） | MEDIUM | — | canonical化で解消 |
| R15 | **dead connector候補**（bridgeDefinition内`generateLegacyStructuralModel` test-only等） | LOW | — | 整理 |
| R16 | **未検証solver（統合規模）**：個別検証済みだが統合Bridge規模（多径間・多主桁・横桁）での検証なし | HIGH | — | 統合検証計画（golden） |
| R17 | **non-deterministic result risk**：結果は決定的（numpy/sparse）だが浮動小数点環境差の懸念 | LOW | — | tolerance freeze |
| R18 | **authorization gate（NOT_GRANTED）**が解析計算自体ではなく**正式利用（設計採用）を阻害**する側面 | MEDIUM | `grillage.py:28` | 正式設計承認経路の設計（後続） |
| R19 | **性能risk**：`kff`自体は疎行列だが、`solver.py:118` の `toarray()+eigvalsh`（health warning）が大規模modelで密化懸念 | MEDIUM | `solver.py:118-123` | 規模要件とsolver戦略 |
| R20 | **bridge_fem_generator cutover**：移行完了まで`/api/fem/generate`・`/api/viewer/bridge`がproduction（viewer互換含む） | **HIGH** | `main.py:1251,1292` | cutover計画 |
| R21 | **solver失敗envelopeがHTTP 200+NOT_GRANTED付きで返りUIが成功表示し得る**（fail-close不備） | HIGH | `grillage.py:124-125`+`SuperstructurePipelinePanel.tsx:216-221` | error処理契約（HTTP/envelope） |
| R22 | **`/api/design/analyze`がIF3 normalization/persistenceへ未接続**（結果経路gap） | HIGH | `main.py:147-165`（IF3接続なし） | 解析→IF3結果経路の接続 |
| R23 | **member release・rigid offset/MPC等の境界/接合Contractが不在** | HIGH | engine全体grep | 統合解析modelの要素/接合契約 |
| R24 | **buildGrillageModelは骨格KEEP可能だが荷重・mesh/topology部分はREWRITE**（conditions未使用・node/横桁はsupport位置のみ・sectionはIDのみ・loadCases常に空） | HIGH | `grillageModel.ts:46-127` | generator契約（ADAPT/REWRITE） |

## 3. Phase 7-01 Readiness判定

### 3.1 READY条件チェック

| 条件 | 状態 |
|---|---|
| 主要FEM/Solver資産inventory完了 | ✅（Phase7-00A） |
| production path把握 | ✅（Phase7-00A/C・live実測・production到達性とruntime健全性の分離含む） |
| solver実態把握 | ✅（Phase7-00B・spsolve/DOF/BC/error handling・live実測） |
| load/result実態把握 | ✅（Phase7-00B・DL/LL/組合せ・IF3正規化/staleness） |
| Connector/Adapter境界把握 | ✅（Phase7-00C・実データフロー・DORMANT/未接続特定） |
| Viewer/Persistence把握 | ✅（Phase7-00C・live確認・IF3 sidecar/時間履歴/stale） |
| tests/reference把握 | ✅（Phase7-00C・1077+1000 passed実測・golden状況） |
| KEEP/ADAPT/REWRITE/DEFER/REMOVE分類完了 | ✅（Phase7-00D・根拠付き） |
| 成熟度評価完了 | ✅（Phase7-00D・個別5-6・統合縦断Level 2） |
| Migration Map完成 | ✅（本Step §1） |
| Risk/Gap整理完了 | ✅（本Step §2・CRITICAL R1/R2/R4/R7含む24項目） |
| Phase 7-01で設計すべき論点が明確 | ✅（統合解析model契約・load配分・spring/bearing・Document連動・ID契約・統合golden・R1/R2のREWRITE） |
| UNKNOWNの重大項目が残っていない | ⚠️ **主要CRITICAL（R1/R2）は実体特定・実測済みだが、その修正設計（grillage project envelope再設計・横桁orientation・load受渡し）はPhase 7-01 Designで確定すべき**（「未知」ではないが「設計済み」でもない） |

### 3.2 判定

# **Phase 7-01 readiness = READY（Design Freeze対象として・条件付き）**

- **READY_FOR_PHASE_7-01_DESIGN = CONDITIONAL**：
  - Phase 7-01は **統合構造解析全体完全設計・Design Freeze** であり、その対象として READY。
  - 設計で確定すべき主要論点は全て特定・実測済み（R1/R2/R4/R7他）。「設計開始を妨げる未知」は残っていない。
- **NOT_READY_FOR_IMPLEMENTATION / CUTOVER**：
  - 現状の統合縦断はLevel 2。CRITICAL（R1 grillage project envelope・R2 load配分/受渡し・R4 spring/柔支持）の修正設計・実装・統合検証（荷重保存・反力釣合い・横桁対応・統合golden）を経るまでは、production/cutover不可。
- Phase 7-00は監査・判定のみでCOMPLETE可能（大規模機能実装はPhase 7-01以降）。

## 4. 本Stepの確認

- **Sol cross-review**：Migration Map配置・Risk/Gap 24項目・Readiness判定をレビュー。
  - **反映済み指摘**：R1修正案`run_analysis(built)`は誤り（ProjectInfo unexpected keyword・横桁INVALID_ORIENTATION・envelope再設計が必要）・R2のnodalLoads未転送・R4はmodel.py/schema/assembly/resultもADAPT対象・R7 CRITICAL候補・R19は`toarray()+eigvalsh`・R20 HIGH・fail-close（R21）・IF3未接続（R22）・release/MPC（R23）・buildGrillageModelのADAPT/REWRITE（R24）・ReadinessはCONDITIONAL+NOT_READY_FOR_IMPLEMENTATION。
- **Luna簡易確認**：docs表・Migration Map・Risk表の表構造とSeverity一貫性を確認（崩れなし）。
- tests/check：docsのみの変更（コード変更なし）。backend 1077 passed・frontend typecheck PASS・frontend subsets 1020 passed（86+485+449）はStep A-Cで実測済み。
