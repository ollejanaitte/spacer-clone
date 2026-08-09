# Phase 4 / Step 4-4 Preflight & Implementation Inventory

> Authority: Phase 4 Step 4-4 Preflight (4-4-0)
> Baseline: origin/main `8f15b480a3c6a17c3a8fa33e165a10c8b3f33e67`
> Branch: `docs/phase4-step4-4-preflight` (docs-only)

## 0. 目的

Design Platform Prototype の Step 4-4（業務 Workspace Prototype）〜 Step 4-7（最終レビュー）を、
細かい安全な実装単位で進めるための事前棚卸しと実装計画を記録する。本 PR は docs-only。

## 1. Protected Core 境界（再確認・変更禁止）

| Core | 実装 | 保存方式 |
|------|------|----------|
| CASE A / CASE B | `bridgeProject/{alignmentAdapter,bridgeGeometryGenerator,alignmentReconstruction}.ts` | canonical round-trip |
| BridgeProject schema/validator/manifest | `contracts/bridgeProject.ts`, `runtime/schemas/bridgeProject.ts`, `validateBridgeProject` | canonical JSON |
| provenance / status / revision / cycle guard | `contracts/provenance.ts`, `revision.ts` | canonical |
| NOT_AUTHORIZED / fail-closed | `bridgeProject/validation.ts`, `superstructureAdapter.ts` | 昇格拒否 |
| Save/Load/Replay | `cbdmDocument.ts` serialize/parse | deterministic |
| Main3D | `integratedScene3d.ts` + `viewer.tsx` | snapshot payload |
| Calculation Adapter | `substructure/design/calculationAdapter.ts` | domain↔engine境界 |

**方針**: BridgeProject canonical 4 文書は BusinessProject の子 Entity として「配置・参照・アトミック保存」する
だけで、Core 内部フィールド・ロジックは変更しない。

## 2. 現行実装の実測（routes / App shell / contract / persistence）

### 2.1 Routing
- `frontend/src/main.tsx`: `/pro*` → `<App/>`、その他 → `<LobbyApp>`（`lobby/routes.tsx`）。
- `App.tsx`（1625行）: SPA 経路 switch。`/pro/*` 配下の各 tool（FEM/compare/apollo/linear-coordinate/importer/liner/…）を直接 render。
  `navigatePro(path)` = `history.pushState` + state update。
- `LobbyApp`: `/` `/learn` `/level0` のモード選択（mode-picker）。

### 2.2 EngineeringProject（BusinessProject の技術的ベース）
- `contracts/engineeringProject.ts`: `ENGINEERING_PROJECT_DOCUMENT_KIND = "engineering-project"`。
  schemaVersion **0.1.0**。`projectId / revisionId / contentChecksum / provenance / name / roadDesignRef /
  frameAnalysisRefs[] / transferRecordRefs[] / projectRevisionMetadata / extensions / unknownFieldStoreRef / migrationProvenanceRef`。
- `FORBIDDEN_EMBEDDED_PAYLOAD_KEYS`（55-71行）: ドメイン payload 埋め込み禁止。
- `runtime/schemas/engineeringProject.ts`: zod strictObject（0.1.0）。
- `contractVersionRegistry.ts`: ENGINEERING_PROJECT_SCHEMA_VERSION = `0.1.0`（単一 supported）。
- `documentKind.ts`: 15 kind（`engineering-project` 含む）。

### 2.3 Persistence / Repository（再利用可能）
- `contracts/persistence/`: `types.ts`（AtomicJsonStorePort / DocumentGateway / 結果型）、
  `atomicStore.ts`（`canonicalJsonForChecksum` → sha256、`serializeTargetDocument`、in-memory store）、
  `documentGateway.ts`, `saveDocument.ts`, `loadDocument.ts`。
- `contracts/repository/`: `revisionedDocumentRepository.ts`、`roadDesignDocumentRepository.ts`、
  `bridgeFrameAnalysisDocumentRepository.ts`、`transferRecordRepository.ts` 等（`RevisionedDocumentRepository` パターン）。
- backend: `backend/app/atomic_json.py`（atomic publish: temp→fsync→replace→dir fsync）。

### 2.4 Electron / desktop
- `frontend/src/desktop/projectFileDialog.ts`, `spacerDesktop.d.ts`: native file dialog（Electron main 前提）。

## 3. 実装計画（Step 4-4 〜 4-7、小ステップ毎に PR）

### Step 4-4 業務 Workspace Prototype
- 4-4-0 本 preflight（docs）
- 4-4-1 Design Platform Shell: `/pro/platform` 入口 + Design Platform Home（業務から設計 / クイック解析）。既存 tool は包むだけ。
- 4-4-2 業務一覧 / 新規業務（業務ID・件番・名称・設計段階・更新日時・新規作成・開く）。未実装は disabled/未実装表示。
- 4-4-3 BusinessProject Runtime: EngineeringProject 0.1.0 を additive 拡張（schemaVersion 0.2.0）。
  manifest = ToC/index のみ。`roadRefs[] / bridgeProjectRefs[] / analysisRefs[] / sharedDatasetRefs[] / deliverableRefs[] / coordinateReference / projectStatus` を追加。
- 4-4-4 Formal Save/Load: BusinessProjectFolderStore（children-first + manifest-last、canonical checksum、readback verify）。
- 4-4-5 業務 Workspace Shell: 概要/道路線形/上部工/下部工/解析/統合3D/成果物/データ。
- 4-4-6 Existing Tool Bindings: LINER / Apollo / Substructure / FEM / Main3D へ接続（Context で薄く包む）。
- 4-4-7 Step 4-4 E2E。

### Step 4-5 Workflow 接続
- 4-5-1 Guided Navigation（[戻る][保存][次へ]）
- 4-5-2 Readiness / Status Binding（CONFIRMED/DERIVED/INFERRED/MISSING/DEFERRED/NOT_AUTHORIZED）
- 4-5-3 User Confirmation / Fail-Closed
- 4-5-4 Workflow E2E

### Step 4-6 移行・互換性
- 4-6-1 Legacy Inventory（docs）
- 4-6-2 Migration Dry-Run
- 4-6-3 Migration Adapters
- 4-6-4 Compatibility（Electron/browser/path/relative refs/日本語path）
- 4-6-5 Migration E2E

### Step 4-7 最終レビュー
- 4-7-1 UI/UX Review（screenshots）
- 4-7-2 Full Business E2E
- 4-7-3 Protected Core Regression
- 4-7-4 Technical Regression
- 4-7-5 Final Cleanup
- 4-7-6 Final Report（`docs/design-platform/phase4-step4-7/00_FINAL_REPORT.txt`）

## 4. 実装禁止事項（再掲）

- Protected Core 変更 / BridgeProject canonical 再設計
- INFERRED → 自動 CONFIRMED / MISSING 値の fabrication
- force push / reset --hard / git clean
- secrets / Webhook の commit / 著作物PDF 再登録 / local-reference・opencode.json の tracked 化
- 旧データ破壊的 migration / テスト失敗を無視して COMPLETE
