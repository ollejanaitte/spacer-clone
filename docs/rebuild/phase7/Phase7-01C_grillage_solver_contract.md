# Phase 7-01C: Grillage Production Path / Solver Contract（設計Freeze）

- Phase: 7-01 Step C
- baseline: `9766128e44ec22f0cdd83f59336182f4c47bd162`
- 日付: 2026-08-13
- 凍結: Design Decision D-04 / D-05 / D-06 / D-11 / D-17
- 対応R: R1 / R6 / R20 / R21 / R22

## 1. 目的

R1を解決：grillage production path（`/api/design/analyze` → `run_grillage_analysis` → `run_analysis`）が
SCHEMA_ERRORで実効解析不能というCRITICAL不具合を、正式Contractとして再設計する。

## 2. 現状不具合の確定（Phase 7-00監査C1・live実測）

1. **project構造不正**: `build_grillage_project`は `{"project": {metadata, units, nodes, ...}}` を返す。
   - `parse_model`は `{"project": ProjectInfo(id/name/...), units, nodes, ...}` を要求（`model.py:185`）。
   - 内側の `metadata` keyはProjectInfoと不一致（unexpected keyword）。
   - 正しいenvelope: **`{project: ProjectInfo, units, nodes, materials, sections, members, supports, loadCases, nodalLoads, memberLoads, analysisSettings}`**。
2. **envelope誤渡し**: `run_grillage_analysis`は `built["project"]`（内側dict）を `run_analysis`へ渡す。
   - `run_analysis(built)` でも `ProjectInfo(**{metadata,...})` でSOLVER_ERROR（**単純修正では不成立**）。
   - **build_grillage_project自体のenvelope再設計が必要**。
3. **横桁orientation**: 全memberへ `{x:0,y:1,z:0}` 固定 → y方向（横断）memberはINVALID_ORIENTATION（`element.py:25`）。
   - **member毎にorientationVectorを指定**（主桁=横断・横桁=橋軸）。
4. **nodalLoads/memberLoads未転送**: `build_grillage_project`はnodes/members/supports/loadCasesのみ読取。
   - loadCasesのnodalLoads・memberLoads・要素を正しく受領・転送。
5. **テスト未検証**: `test_grillage.py`はNOT_GRANTED wrapperとkey存在のみ検証（解析成功を検証していない）。

## 3. 新request envelope（Freeze）

### 3.1 frontend → backend

```
POST /api/design/analyze
{
  "analysisDocument": AnalysisDocument,        // 新・正本（source）
  "solverSettings": { "solver": "scipy_sparse", "analysisType": "linear_static", ... }  // 任意
}
```

- または互換: `{ "grillage": {...}, "nodalLoads": [...], "memberLoads": [...], "loadCases": [...] }`（旧形・COMPATIBILITY）。
- **Phase 7-02正**: AnalysisDocumentを送信。backendはSolver Input Adapterでbackend projectへ変換。

### 3.2 backend project構造（Solver Input Adapter出力・Freeze）

```
{
  "project": { "id": ..., "name": ..., "schemaVersion": "1.0.0" },   // ProjectInfo（必須・metadata不可）
  "units": { "length": "m", "force": "kN", "moment": "kN_m", "modulus": "kN_per_m2" },
  "nodes": [ {id, x, y, z} ],
  "materials": [ {id, name, elasticModulus, shearModulus, poissonRatio, density} ],
  "sections": [ {id, name, area, iy, iz, j} ],
  "members": [ {id, nodeI, nodeJ, materialId, sectionId, orientationVector} ],
  "supports": [ {nodeId, ux, uy, uz, rx, ry, rz} ],
  "loadCases": [ {id, name, type} ],
  "nodalLoads": [ {id, loadCaseId, nodeId, fx, fy, fz, mx, my, mz} ],
  "memberLoads": [ {id, loadCaseId, memberId, type, direction, magnitude, positionM} ],
  "analysisSettings": { "analysisType": "linear_static", "solver": "scipy_sparse",
                        "includeShearDeformation": false, "largeDisplacement": false }
}
```

- **SCHEMA_ERRORを出さない正式Contract**（`parse_model`とfield-level整合）。orientationVectorはmember毎（§5）。
- 注記: backend projectの `units.moment` はserialization key `"kN_m"`（engine model.py既存表記・**変更禁止**）。
  契約上の単位表記は `kNm`（AnalysisDocument・Phase7-01A）。両者は同一単位の異なる表記であり、
  backend project内では `kN_m`、AnalysisDocument内では `kNm` を統一使用する。

## 4. Solver Input Adapter（Freeze）

- 新 `SolverInputAdapter`（`backend/engine/solver_input.py` 新規 or `grillage.py`再設計）:
  - AnalysisDocument → 上記backend projectへ変換。
  - section/material: AnalysisDocument実断面・実材料（R7・Phase7-01C_section_material）。
  - supports: bearing mapping結果のbool DOF + spring（対角加算はbackend engineへADAPT）。
  - loads: memberLoads→`equivalent_uniform_load_local`等へ（KEEP・assembly.py）。
  - orientation: member毎（横桁対応）。

## 5. member orientation規則（Freeze・R1解決）

| member種別 | member軸方向 | orientationVector（local y） |
|---|---|---|
| 主桁（縦） | x（橋軸） | `{x:0, y:1, z:0}`（横断） |
| 横桁（横断） | x（横断） | `{x:1, y:0, z:0}`（橋軸） |
| 斜め/特殊 | 軸から導出 | 垂直な任意ベクトル（検証後固定） |

- 検証: orientationVectorがmember軸と平行→`INVALID_ORIENTATION`（fail-closed）。

## 6. Solver Contract（Freeze）

| 項目 | 値 |
|---|---|
| solver | `scipy_sparse`（spsolve・KEEP） |
| analysisType | `linear_static`（Phase 7-02 IMPLEMENT） |
| eigen / response spectrum | KEEP接続（massCaseId/modeCount等はanalysisSettings） |
| DOF | 6/node・node list順（KEEP） |
| BC | bool DOF拘束 + spring対角加算（KEEP+ADAPT） |
| 特異検出 | MODEL_UNSTABLE（KEEP） |
| error | 構造化error envelope（KEEP） |
| **HTTP error（R21）** | solver失敗時はHTTP 200に成功envelopeを返さない。`status="failed"` + errorsを含むenvelopeを返し、**UIは成功表示しない**（`authorization`のみで成功表示する現行挙動を廃止）。error code: `GRILLAGE_ERROR` / `MODEL_UNSTABLE` / `SOLVER_ERROR` 等 |
| deterministic | 同一入力→同一結果（numpy/scipy・オーダー固定） |
| 性能 | 疎spsolve。大規模は`toarray()+eigvalsh`（health warning）の段階的回避（phase 7-02で検証） |

## 7. Result Response（Freeze）

```
{
  "result": AnalysisResult（raw・KEEP schema）,
  "csv": ...,                                  // 任意
  "if3Result": FrameAnalysisResultResource,    // R22・新（下記）
  "persistedResultRef": {...}                  // frame context指定時
}
```

## 8. IF3 handoff（R22解決・Freeze）

- `/api/design/analyze`（および統合解析経路）で raw result → `normalize_linear_static_result_resource`（KEEP）→ IF3 resource。
- **sourceDocumentId = AnalysisDocument.documentId・sourceContentChecksum = AnalysisDocument checksum・loadContext = AnalysisDocument loadCases**（D-04）。
- frame context指定時（frameDocumentPath+checksum）はpersist_if3_result_with_ref（KEEP）でsidecar+ref登録。
- **AnalysisDocumentをIF3 bindingのsource documentとして受入**（`contract_document_store`のschemaId受入拡張・D-03）。
- eigen/RS/THは既存 `attach_if3_unsupported_result`（KEEP）のまま（統合経路でも同様）。

## 9. fail-closed（R21・Freeze）

| 項目 | 挙動 |
|---|---|
| AnalysisDocument不正 | 400 `ANALYSIS_DOCUMENT_INVALID` |
| section/material欠損 | 400 `SECTION_NOT_AVAILABLE`（解析不可） |
| 非有限値 | 400 `INVALID_NUMERIC_VALUE` |
| solver失敗 | 構造化failed envelope（status=failed）+ UI非成功表示 |
| 未対応解析 | 400 `UNSUPPORTED_ANALYSIS` |

## 10. 既存APIとの関係（R6 / R20・Freeze）

| API | 扱い |
|---|---|
| `/api/design/analyze` | **REWRITE**（新envelope受入・旧grillage形はCOMPATIBILITYで受入） |
| `/api/analysis/run` | KEEP（raw linear static・IF3 binding既存） |
| `/api/fem/generate`・`/api/viewer/bridge` | COMPATIBILITY維持（bridge_fem_generator・cutover後deprecate） |
| `/api/analysis/eigen`等 | KEEP |

## 11. tests観点（R1 regression含む）

- **grillage解析成功**（live API・envelope修正後）：status=success・displacements/reactions/memberEndForces非空
- 横桁member解析（INVALID_ORIENTATIONが出ない）
- memberLoads/nodalLoads転送（R2）
- COMBO-1合成
- solver失敗時のfail-closed（成功表示しない）
- IF3 resource生成（sourceDocumentId=AnalysisDocument）
- 決定論（同一入力→同一結果）
- 既存test_grillage.pyを解析成功検証へ強化
