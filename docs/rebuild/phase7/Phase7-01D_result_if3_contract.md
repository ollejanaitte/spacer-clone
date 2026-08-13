# Phase 7-01D: Result / IF3 Contract（設計Freeze）

- Phase: 7-01 Step D
- baseline: `3b60eb11ec6e0aa049463cc99422a3c2d38abcf0`
- 日付: 2026-08-13
- 凍結: Design Decision D-04 / D-11 / D-12 / D-15
- 対応R: R10 / R11 / R22

## 1. 目的

解析結果の契約（raw result → IF3正規化 → viewer）を完全凍結する。
R10（reaction key alias）・R11（sign/unit/axis統一）・R22（IF3接続）を解決。

## 2. Raw Result（KEEP・backend engine results.py）

| 項目 | 内容 |
|---|---|
| displacements | `{loadCaseId, nodeId, ux..rz}`（m/rad） |
| reactions | `{loadCaseId, nodeId, fx..mz, constrainedDofs}`（kN/kNm） |
| memberEndForces | `{loadCaseId, memberId, coordinateSystem:"local", i/j:{fx..mz}}` |
| analysisSummary | solver="scipy_sparse"・status等 |

## 3. Result kind（Freeze）

| kind | Phase 7-02 | 内容 |
|---|---|---|
| nodeDisplacement | 対応 | nodal displacement / rotation |
| supportReaction | 対応 | support reaction（6成分） |
| memberForce | 対応 | axial / shear / torsion / bending（i/j端） |
| stress / strain | **DEFER** | 未算出（design check層でσ=M/Z等） |
| mode / frequency | KEEP接続 | eigen結果（既存IF3 UNSUPPORTED or 別途） |
| envelope | DEFER | 組合せenvelope（COMBO-1は合成結果として提供） |

## 4. Sign / Unit / Axis統一（R10 / R11 Freeze）

### 4.1 統一契約

| 項目 | 値 |
|---|---|
| 座標 | project-global（m・kN・kNm・rad） |
| 反力sign | **up-positive（+z・支承が上部工を押し上げる向き）** |
| member force sign | local座標（i端/j端）・N引張+・V/Mは解析規約（設計用定義はcheck層） |
| moment sign | right-hand-rule |
| 単位表記 | AnalysisDocument=「kNm」・backend project=「kN_m」（serialization key） |

### 4.2 R10解決（reaction key alias廃止）

- **`reactionsFromResult` の `rz→fz` fallbackを廃止**。
- raw resultのreaction鉛直成分は `fz`（回転は `rz`=DOF名・混同禁止）。
- IF3正規化結果（`supportReaction.rows[].values.fz`）を**直接読取**する。
- viewer/result VMも統一key（fx..mz）で消費。

### 4.3 全resultの単位・符号・座標を明記

- displacement: m・rad（global）
- reaction: kN・kNm（global・support node）
- member force: kN・kNm（local・i/j端）

## 5. IF3正規化（KEEP・R22解決）

| 項目 | 値 |
|---|---|
| schema | FrameAnalysisResultResource v0.1.0（KEEP） |
| 正規化 | `normalize_linear_static_result_resource`（KEEP） |
| source binding | sourceDocumentId=AnalysisDocument.documentId・sourceDocumentVersion=revisionId・sourceContentChecksum=AnalysisDocument checksum・analysisSettings・loadContext=loadCases（D-04） |
| 行ID | UUID5（IF3 namespace・KEEP） |
| entityId | 分析entity（AnalysisDocument entityIdをsourceに） |
| resultChecksum | sha256（KEEP） |
| 状態 | SUCCEEDED / PARTIAL / FAILED / INVALID / UNSUPPORTED（KEEP） |
| 非有限 | INVALID_NUMERIC_RESULT（KEEP） |

- **統合解析経路（/api/design/analyze および new analysis path）でIF3正規化+publish**（R22）。
- eigen/RS/TH: 既存 `attach_if3_unsupported_result`（KEEP・UNSUPPORTED資源）のまま。

## 6. Persistence（Freeze・D-15）

| 結果 | 保存 |
|---|---|
| linear static（統合） | IF3 sidecar `results/<uuid>.if3.json`（frame context指定時・KEEP）+ persistedResultRef |
| timeHistory | project.analysisResults.timeHistory（既存KEEP） |
| eigen/RS/TH（IF3） | UNSUPPORTED資源（persistしない・既存） |
| raw結果 | transient（React state・正本にしない） |

## 7. Viewer消費（Freeze）

- `resultViewModel.ts`（KEEP）: AnalysisResult→ResultViewModel（loadCase選択）。
- `if3ResultGate.ts`（KEEP）: IF3 resourceがauthoritativeか（VALID+SUCCEEDED）判定。
- `if3ResultViewModel.ts` の `extractLinearStaticAnalysisResultFromResource`（KEEP）でIF3→raw消費。
- **`buildIf3ResultViewModel`（dead export）は使用しない**（REMOVE候補）。

## 8. source entity mapping（Freeze）

- resultのentityId（node/member/support）はAnalysisDocument entityIdをsourceにIF3 UUID5で決定論生成。
- AnalysisDocument entityId → sourceEntityId → 上流正本entityへ**2段追跡**可能。
- loadCaseId/combinationIdはAnalysisDocument loadCases/loadCombinationsと一致。

## 9. fail-closed

| 項目 | 挙動 |
|---|---|
| 非有限result | INVALID（IF3 KEEP） |
| binding欠損 | INVALID（source metadata必須） |
| 未対応result kind | UNSUPPORTED（KEEP） |
| STALE resource | authoritative export gateでブロック（KEEP） |

## 10. tests観点

- IF3正規化（統合経路・sourceDocumentId=AnalysisDocument）
- reaction key統一（fz直接読取・rz→fz廃止regression）
- sign/unit/axis（反力up-positive・member force local）
- source entity mapping（2段追跡）
- STALE/authoritative gate
- CSV/PDF export（KEEP・gate整合）
