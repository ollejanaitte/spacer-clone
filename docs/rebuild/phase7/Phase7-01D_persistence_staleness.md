# Phase 7-01D: Persistence / Stale Invalidation（設計Freeze）

- Phase: 7-01 Step D
- baseline: `3b60eb11ec6e0aa049463cc99422a3c2d38abcf0`
- 日付: 2026-08-13
- 凍結: Design Decision D-04 / D-11 / D-14 / D-15
- 対応R: R8 / R13

## 1. 目的

解析結果の永続化と、上流Document変更に伴うstale invalidationを完全凍結する。
**BridgeLayout / Superstructure / Substructure / Load / Solver Settings のいずれかが変わった場合、
古い解析結果を有効な結果として扱わない**。

## 2. 保存対象（Freeze）

| 対象 | 保存先 | 形式 |
|---|---|---|
| AnalysisDocument（正本） | PDC（.spacerproj） | JSON（spacer.contracts.analysis-document v1.0.0） |
| analysis settings / solver settings | AnalysisDocument.analysisSettings | JSON |
| generated analysis model | AnalysisDocument内（nodes/members/...） | JSON |
| 解析結果（linear static・統合） | IF3 sidecar `results/<uuid>.if3.json` | FrameAnalysisResultResource |
| persistedResultRef | AnalysisDocument.resultReferences | ref（documentKind/documentId/checksum/uri） |
| timeHistory結果 | project.analysisResults.timeHistory（既存KEEP） | JSON |
| raw結果 | 非保存（transient） | — |
| autosave | Phase 7-02で**有効化**（AnalysisDocumentはPDCへ・結果はIF3 sidecar）。既存`AUTOSAVE_ENABLED=false`をtrueへ（Electron環境） | — |

## 3. Checksum / Fingerprint（Freeze）

| digest | 対象 | 用途 |
|---|---|---|
| contentChecksum | AnalysisDocument | IF3 binding・tamper検出 |
| modelDigest | AnalysisDocument解析model部 | モデル変更検知 |
| resultDigest | 最新IF3 result envelopeのdigest（AnalysisDocument.resultReferences集約用） | 結果変更検知 |
| resultChecksum | IF3 resourceのself-checksum（IF3 KEEP） | 資源完全性（resultDigestとは別用途） |
| sourceReferences fingerprints | 上流（bridgeLayout/superstructure/substructure） | **stale判定の主source** |
| loadContext checksum | loadCases | IF3 staleness（KEEP） |
| analysisSettings checksum | solver settings | IF3 staleness（KEEP） |

## 4. Stale Invalidation規則（R8解決・Freeze）

### 4.1 上流変更検知

| 上流 | 検知手段 | 発動 |
|---|---|---|
| BridgeLayoutDocument | layoutFingerprint（sourceReferences） | 不一致→AnalysisDocument再生成 |
| SuperstructureDocument | dataFingerprint + geometrySnapshotFingerprint | 不一致→再生成 |
| SubstructureDocument | dataFingerprint | 不一致→再生成 |
| Load（loadCases） | loadContext checksum | 不一致→STALE |
| Solver Settings | analysisSettings checksum | 不一致→STALE |

### 4.2 状態遷移（Freeze）

```
AnalysisDocument（現行fingerprintでVALID）
  上流fingerprint一致 → 結果 VALID
  上流fingerprint不一致 → AnalysisDocument STALE（再生成要求）・結果 STALE
  再生成（revisionId++・新fingerprint）→ 結果 STALE（新分析必要）
  新解析実行 → 結果 VALID（新binding）
```

- **古い解析結果は有効な結果として扱わない**（STALE状態でauthoritative export gateブロック・KEEP IF3）。
- 再生成はdeterministic（同一上流→同一AnalysisDocument）。

### 4.3 実装（Freeze）

- AnalysisDocument生成時にsourceReferences fingerprintsを記録。
- 結果publish/availability評価時にfingerprint比較。
- `if3_availability` / `if3_staleness`（KEEP）をAnalysisDocument bindingへ適用（sourceDocumentId=AnalysisDocument）。
- `contract_document_store` のschemaId受入をAnalysisDocumentへ拡張（D-03）。

## 5. Auto Save / Restart Restore（Freeze）

| 項目 | 挙動 |
|---|---|
| Auto Save | Phase 7-02で**有効化**（AnalysisDocumentはPDCへ・結果はIF3 sidecar）。既存`AUTOSAVE_ENABLED=false`をtrueへ（Electron環境） |
| restart restore | AnalysisDocument読込→sourceReferences検証→必要なら再生成→結果availability評価（STALE表示） |
| .spacerproj | AnalysisDocument含むプロジェクト全体を保存・読込 |

## 6. 結果availability（Freeze）

- AnalysisDocument読込時・結果表示時に `if3_availability_catalog`（KEEP）でavailability評価。
- VALID / STALE / MISSING / INVALID / FAILED / PARTIAL / UNSUPPORTED を表示（Viewer・Phase7-01D_analysis_viewer_ui）。

## 7. fail-closed

| 項目 | 挙動 |
|---|---|
| 上流fingerprint欠損 | 結果をVALID扱いしない（STALE or NOT_AVAILABLE） |
| AnalysisDocument checksum不一致 | tamper→再生成要求 |
| 結果bindingと現行AnalysisDocument不一致 | STALE（authoritative gateブロック） |
| 保存失敗 | エラー（atomic_json KEEP） |

## 8. tests観点

- 上流変更→AnalysisDocument再生成（revisionId++）
- 上流変更→結果STALE（fingerprint比較）
- IF3 staleness（sourceDocumentVersion/checksum/loadContext）
- restart restore（AnalysisDocument+availability）
- autosave有効化
- .spacerproj roundtrip
- 古い結果が有効として表示されないこと
