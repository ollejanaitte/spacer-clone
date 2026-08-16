# SPACER CLONE — Project Persistence Pipeline 現況監査マップ (Phase A-00)

- 作成日時: 2026-08-16 (JST)
- 対象リポジトリ: `~/Projects/spacer-clone`
- 対象 main SHA (監査開始時): `bdf7967c48ba232ae464dba193528dd3259abbbb`
- 監査目的: Phase A「Schema / Persistence 同期自動化」を開始する前に、
  Project データが「定義 / 初期化 / 検証 / serialize / deserialize / migration /
  Save / Load / import / export」のどこで行われているかを、実ファイル単位で確定する。
- 本稿は監査結果の記録であり、production コード・Schema・test は変更していない。

---

## 1. 文書目的

Phase A 本体を安全かつ短時間で進めるための「Project Persistence Pipeline の地図」を提供する。
ProjectModel を変更したときに「どの実ファイルを更新しなければならないか / 何が機械的に検知できるか」を
把握できることを最終目的とする。

- 確定事項 (実ファイルで確認済み) と 推測・未確定事項 は分離して記述する。
- 本稿では「実装」「修正」「refactoring」は行わない。

---

## 2. Project Persistence Pipeline 全体像

SPACER CLONE の Project データは複数の persistence 経路を持つ。主経路は
「App.tsx の saveProject / openProjectViaDialog を中心とした project.json 経路」であり、
以下は補助・並列経路である。

```
[主経路: フロントエンド runtime ProjectModel (project.json)]
ProjectModel (in-memory, frontend/src/types.ts)
  → 保存時 serialize チェーン (liner/apollo 各 sidecar)
  → JSON.stringify → Electron ネイティブ保存 or ブラウザ download
  → 読み込み時 JSON.parse → migrateProject → hydrate チェーン → ProjectModel

[補助・並列経路]
- Apollo workspace (localStorage, frontend/src/apollo/workspace.ts) — ProjectModel 全体を
  unit2 の serialize/hydrate のみで localStorage へ保存/復元 (migrate/他 sidecar チェーンを通らない)
- Apollo 成果物 ZIP (frontend/src/apollo/drawing/artifactBundle.ts) — 02_input/project.json に
  生の in-memory Project を直接格納 (共通 serializer を通らない)
- backend save/load (/api/projects/save|load) → backend/data/projects/
- backend autosave (/api/projects/autosave) → 現状は frontend 側 guard で無効
- next/persistence (新アーキテクチャ; userData/projects 配下 or メモリ)
- liner importer storage (localStorage: spacer.importer.*)
- platform/business 保存 (localStorage: spacer.designPlatform.projects.*)
- substructure planning 単独保存 (substructure-project.json download, 形式は AdapterEnvelope)
```

上記のうち本監査の中心は「主経路」であり、補助経路は参照・リスク整理のみ行う。

---

## 3. ProjectModel / Schema 実ファイル一覧

| 項目 | ファイルパス | 主要型/関数/定数 | 役割 | 主な呼び出し元 |
|---|---|---|---|---|
| ProjectModel 型 | `frontend/src/types.ts:250` | `type ProjectModel` | runtime の全 Project 構造 (schemaVersion + project + units + 各配列 + 任意 sidecar) | App.tsx ほぼ全体 |
| Project 情報型 | `frontend/src/types.ts` (`ProjectInfo`) | `type ProjectInfo` | id/name/schemaVersion/description/createdAt/updatedAt | `ProjectModel["project"]` |
| schemaVersion 定数 | `frontend/src/projectMigration.ts:3` | `CURRENT_PROJECT_SCHEMA_VERSION = 1` | Project 全体の persistence 用 version (整数) | defaultProject.ts, createHeadlessLinerFrameProject.ts 等 |
| 初期 Project 生成 | `frontend/src/data/defaultProject.ts:11` | `createEmptyProject()` | 空 Project (runtime 初期状態)。nodes/members/... 空配列 | App.tsx:170,175 |
| サンプル Project 生成 | `frontend/src/data/defaultProject.ts:49` | `createDefaultProject()` | 5-Span 連続桁サンプル | apollo/sampleProjects.ts, workspace.ts, sampleReapply.ts |
| サスペンドデッキ生成 | `frontend/src/data/defaultProject.ts:207` | `createSuspendedDeckProject()` | Viewer の比較用 Project | App.tsx:171, Viewer3D.tsx:120 |
| JSON Schema (公式) | `schemas/project.schema.json` | — | project.json の公式 JSON Schema (draft 2020-12)。top-level `additionalProperties:false` | 下記参照元 |
| JSON Schema 参照元 | `frontend/src/liner/headless/validateGeneratedLinerProject.ts` | `getProjectSchemaValidator()` (ajv) | headless 生成 Project の schema validation | liner headless pipeline |
| JSON Schema 参照元 | `frontend/src/substructure/__tests__/projectSchemaRegression.test.ts` | ajv | 既存互換 regression | — (test) |
| JSON Schema 参照元 | `frontend/src/liner/headless/__tests__/createHeadlessLinerFrameProject.test.ts` | ajv | schema 適合 test | — (test) |
| JSON Schema 参照元 | `backend/tests/test_project_schema.py` | python `jsonschema` | examples/*.json + case の schema validation | — (test) |
| 別 Schema (importer 専用) | `frontend/src/liner/importer/schema/project.schema.json` | — | liner importer 用の別 schema | validateImporterProject.ts |
| 別 Schema (new arch, zod) | `frontend/src/next/project/schema.ts` | `projectSchema` (zod strictObject), `PROJECT_SCHEMA_VERSION="1.0.0"`, `type Project` | next アーキテクチャの Project (ProjectModel とは別型) | next/project/projectDataCore.ts |

### Schema と ProjectModel の対応状況 (確認済み)

- ProjectModel の全 top-level key は `schemas/project.schema.json` の `properties` に存在する。
- 逆に、Schema にのみ存在する top-level key: **`substructure`** (ProjectModel 型には未定義)。
  `substructure` は `#/$defs/projectSubstructure` を参照し、`additionalProperties:false`、
  `required: [schemaVersion, projectId, source, supports]` (schemaVersion const "0.2.0")。
  → **Schema と型の非対称 (同期漏れの一種)。さらに substructure 画面の実保存形式
  (`frontend/src/substructure/planning/persistence.ts:59 serializeSubstructureProject`) は
  `alignmentRefs` / `metadata` を必ず出力するため、公式 Schema の `projectSubstructure`
  (`additionalProperties:false`, 両フィールド未定義) に適合しない (確定)。**
- Schema の top-level `schemaVersion` は `integer, minimum 1` で **必須ではない**。
  `examples/project.json` は top-level `schemaVersion` を持たない。
  一方 `ProjectModel` 型では `schemaVersion: number` が必須。→ `migrateProject()` が読み込み時に補完。
- **標準生成 Project は公式 Schema に適合しない (確定)。** `createEmptyProject()`
  (`frontend/src/data/defaultProject.ts:11`) は `nodes: []` / `materials: []` / `loadCases: []`
  を生成する一方、Schema はこれらに `minItems:1` を課し (`schemas/project.schema.json:95,102,128`)、
  `analysisSettings.solver` を必須とする (`schemas/project.schema.json:156`)。
  `createDefaultProject()` も `solver` を持たない。→ 現行の初期・サンプル Project は
  schema validation を通らない。
- Schema の任意 sidecar (analysisResults / apolloPhase1Unit2 / apolloBsdd /
  apolloBridgeStructureInput / apolloBridgeProjectSuperstructure) は
  いずれも `additionalProperties:true` (内訳は未検証)。
- `project.project.schemaVersion` は `const "1.0.0"` (文字列)。top-level の整数 `schemaVersion` とは別物。
  → **version 情報が 2 系統存在する。**

### substructure の保存経路 (確定: 公式 Schema と非互換)

- `frontend/src/substructure/planning/SubstructurePlanningHost.tsx:304` は
  `substructure-project.json` として独自に download/save する (App.tsx の project.json 経路と非連携)。
- 保存実体は `AdapterEnvelope` (`frontend/src/substructure/design/adapterPersistence.ts:37 serializeAdapterEnvelope`)
  であり、内部 Project は `frontend/src/substructure/planning/persistence.ts:59` が生成する。
- **実保存形式 (alignmentRefs / metadata 含む) は公式 Schema の `projectSubstructure`
  (`additionalProperties:false`) に適合しない。既存 regression test
  (`frontend/src/substructure/__tests__/projectSchemaRegression.test.ts:35`) は
  実 serializer 出力ではなく、これらを省いた手組みデータのみを検証している (確定)。**
- substructure データが ProjectModel (`project.json`) に埋め込まれる現行経路は確認できなかった。

---

## 4. serializer / deserializer / migration 実ファイル一覧

| 分類 | ファイルパス | 主要関数 | 役割 |
|---|---|---|---|
| migration | `frontend/src/projectMigration.ts:9` | `migrateProject(raw)` | 旧 Project に `schemaVersion` を補完 (現状それのみ)。`CURRENT_PROJECT_SCHEMA_VERSION` を適用 |
| serializer (liner) | `frontend/src/liner/adapters/linerProjectDraft.ts:145` | `serializeProjectForPersistence(project)` | runtime の liner domainDraft/draft/drawingDocument を除去し `roadDesignDocument` を埋め込む (保存形式へ正規化)。失敗時 `ok:false` |
| deserializer (liner) | `frontend/src/liner/adapters/linerProjectDraft.ts:99` | `hydrateProjectLinerFromPersistence(project)` | 保存済み liner を in-memory domainDraft へ復元。legacy draft は `migrateLinerDraftToVNext` (liner/schema/projectLinerMigration.ts) 経由で移行し `roadDesignDocument` は除去 |
| serializer (apollo unit2) | `frontend/src/apollo/unit2Draft.ts:368` | `serializeApolloPhase1Unit2ForPersistence(project)` | `apolloPhase1Unit2` を正規化して保存形に変換 (`localDraftStatus:"saved"` を付与) |
| deserializer (apollo unit2) | `frontend/src/apollo/unit2Draft.ts:329` | `hydrateApolloPhase1Unit2FromPersistence(project)` | 保存済み unit2 を復元。未存在時は `createApolloPhase1Unit2DraftFromProject` で再生成 |
| serializer (apollo BSDD) | `frontend/src/apollo/bridgeStructure/projectBsdd.ts:83` | `serializeApolloBsddForPersistence(project)` | BSDD / bridgeStructureInput を保存前に validation (fail-closed) |
| deserializer (apollo BSDD) | `frontend/src/apollo/bridgeStructure/projectBsdd.ts:34` | `hydrateApolloBsddFromPersistence(project)` | BSDD / bridgeStructureInput を parse + validate して復元 |
| serializer (superstructure) | `frontend/src/bridgeProject/projectSuperstructure.ts:56` | `serializeApolloBridgeProjectSuperstructureForPersistence(project)` | superstructure sidecar の schemaVersion を保存前に検証 (fail-closed) |
| deserializer (superstructure) | `frontend/src/bridgeProject/projectSuperstructure.ts:35` | `hydrateApolloBridgeProjectSuperstructureFromPersistence(project)` | sidecar を parse + validate して復元 (文字列 or オブジェクト両対応) |
| import (apollo 限定) | `frontend/src/apollo/importExport.ts:152` | `importApolloProjectFromText(text)` | 保存済み text を decode → envelope/sidecar strict validation → migration → hydrate チェーン → unit2 draft validation → ProjectModel |
| export (apollo 限定) | `frontend/src/apollo/importExport.ts:223` | `exportApolloProjectToText(project)` | bsdd → superstructure → unit2 → liner の順で serialize し JSON text 化 |
| normalize | `frontend/src/apollo/unit2Draft.ts:244` | `normalizeApolloPhase1Unit2Draft(project, draft)` | unit2 draft の欠損補完・正規化 |
| schema 別生成 | `frontend/src/next/project/projectDataCore.ts` | `createEmptyProject` / `parseProject` / serialize/deserialize | next アーキテクチャ用の独立 Project 入出力 |

### 保存時 serialize の実順序 (確定)

```
project (in-memory)
  ↓ serializeApolloPhase1Unit2ForPersistence        (unit2Draft.ts:368)
  ↓ serializeProjectForPersistence                   (linerProjectDraft.ts:145; RDD埋め込み + domainDraft除去)
  ↓ JSON.stringify(serialized.project, null, 2) + "\n"   (App.tsx:781)
  ↓ saveProjectFile (Electron or download)               (App.tsx:785/793)
```

※ apollo ルート時は `exportApolloProjectToText` が
`serializeApolloBsddForPersistence` → `serializeApolloBridgeProjectSuperstructureForPersistence`
→ `serializeApolloPhase1Unit2ForPersistence` → `serializeProjectForPersistence` の順に適用される。

### 読み込み時 deserialize の実順序 (通常ルート) (確定)

```
file text
  ↓ JSON.parse                                  (App.tsx:679)
  ↓ migrateProject                              (projectMigration.ts:9; schemaVersion補完)
  ↓ hydrateProjectLinerFromPersistence          (linerProjectDraft.ts:99)
  ↓ hydrateApolloPhase1Unit2FromPersistence     (unit2Draft.ts:329)
  ↓ commitProject → ProjectModel
```

※ apollo import ルート (`importApolloProjectFromText`) は
`decodeApolloImportText` → `validateProjectEnvelope` → `validateApolloSidecarStrict` →
`migrateProject` → `hydrateProjectLinerFromPersistence` → `hydrateApolloPhase1Unit2FromPersistence`
→ `hydrateApolloBsddFromPersistence` → `hydrateApolloBridgeProjectSuperstructureFromPersistence`
→ `validateApolloPhase1Unit2Draft` の順。

### 概念図との相違 (確定)

- 依頼文の概念図は「serialize → Schema validation → 保存形式」だが、実装では
  **保存・読み込み経路に JSON Schema validation は存在しない**。validation は
  (a) apollo import 専用の手書き strict validation、(b) headless/importer の ajv schema validation、
  (c) backend `/api/projects/validate` の FEM parser (`parse_model`) のみ。
- version 判定は top-level `schemaVersion` の単一整数で、`migrateProject` は version 分岐を持たない
  (version が増えても migration は拡張されていない)。
- 実際の順序は「serialize (sidecar 正規化) → JSON.stringify → 保存」であり、
  schema validation は保存前にも読み込み後にも入らない。

---

## 5. Save / Load / import / export 実ファイル一覧

| 分類 | ファイルパス | 主要関数/IPC | 役割 |
|---|---|---|---|
| Save (主) | `frontend/src/App.tsx:737` | `saveProject()` | serialize チェーン → text → `saveProjectFile` / `downloadText` |
| Save As (主) | `frontend/src/desktop/projectFileDialog.ts:55` | `saveProjectFile(content, name)` | Electron ネイティブ保存 or ブラウザ download の分岐 |
| .spacerproj 保存 | `frontend/src/desktop/projectFileDialog.ts:65` | `saveSpacerProjFile(content, name)` | next 用 package 保存 (`.spacerproj`) |
| Load (主) | `frontend/src/App.tsx:713` | `openProjectViaDialog()` | ファイル選択 → `hydrateProjectFromJsonText` → `commitProject` |
| Load (ファイル) | `frontend/src/App.tsx:691` | `openFile(file)` | file 入力からの読み込み (同上) |
| Load (file 選択) | `frontend/src/desktop/projectFileDialog.ts:48` | `openProjectFile()` | Electron ネイティブ open or ブラウザ input |
| Browser download | `frontend/src/App.tsx:1687` | `downloadText()` | Blob 経由のダウンロード (ローカル定義) |
| Electron dialog IPC | `desktop/electron/dialogIpc.ts:50,77,107` | `handleOpenProject` / `handleSaveProject` / `handleSaveSpacerProj` | ネイティブダイアログ + fs write。automation env (`SPACER_AUTOMATION_OPEN_PATH` / `_SAVE_PATH`) 対応 |
| Electron IPC channel | `desktop/electron/ipcChannels.ts` | `IPC_CHANNELS` (OPEN_PROJECT / SAVE_PROJECT / SAVE_SPACER_PROJ / PERSISTENCE_*) | channel 名の一元管理 |
| Preload | `desktop/electron/preload.ts` | `window.spacerDesktop` 公開 | renderer → main の bridge (`openProjectFile` / `saveProjectFile` / `saveSpacerProjFile` / `persistence.*`) |
| Main 登録 | `desktop/electron/main.ts:517-518` | `registerDialogIpc` / `registerPersistenceIpc` | IPC ハンドラ登録 |
| Electron persistence IPC | `desktop/electron/projectPersistenceIpc.ts:95` | `registerPersistenceIpc()` (read/write/list/delete/exists) | `userData/projects` 配下のファイル I/O。**※ `resolveSafe()` (`:18`) は先頭 `/` を除くだけで `..` を拒否しないため、任意パス到達の可能性は要確認 (追跡対象)** |
| Renderer 型定義 | `frontend/src/desktop/spacerDesktop.d.ts` | `SpacerDesktop` 等 | `window.spacerDesktop` の型 |
| backend save/load | `backend/app/main.py:447,468,497,517` | `/api/projects/save|load|autosave` | `backend/data/projects/` への保存。`find_non_finite` のみ検証。**クライアント定義 (`api/client.ts:259,263`) はあるが、リポジトリ内の呼び出し元は確認できず (稼働経路としては未確認)** |
| backend validate | `backend/app/main.py:84` | `/api/projects/validate` | `validate_project` → `parse_model` (FEM parser) |
| autosave (frontend) | `frontend/src/App.tsx:349-359` | `apiClient.autosaveProject(project)` | **現状は無効。`AUTOSAVE_ENABLED = false` (App.tsx:151) で guard (`:318,:350,:1481`) により実行されない。復旧経路 (:1481-1487) も生 project を migrate/hydrate なしで `commitProject` する dead code 扱い** |
| Apollo workspace | `frontend/src/apollo/workspace.ts:116,151,192,287` | `saveApolloWorkspaceEntry` 等 | **ProjectModel 全体を localStorage に保存/復元。unit2 の serialize/hydrate のみ使用 (`:96,:172`) し、liner / BSDD / superstructure チェーンや `migrateProject()` を通らない** |
| Apollo 成果物 ZIP | `frontend/src/apollo/drawing/artifactBundle.ts:181` | `pushText("02_input/project.json", ...)` | **生の in-memory Project を共通 serializer を通さず直接格納** |
| next/persistence | `frontend/src/next/persistence/filesystemProjectPersistence.ts` | `FilesystemProjectPersistence` / `IpcFileSystemGateway` / `MemoryFileSystemGateway` | next アーキテクチャの保存層 (IPC or メモリ) |
| next package | `frontend/src/next/persistence/package/projectPackage{Builder,Exporter,Importer}.ts` | `containerFormat: "spacerproj-json-v1"` | `.spacerproj` package export/import |
| importer storage | `frontend/src/liner/importer/storage/importerStorage.ts` | localStorage (`spacer.importer.*`) | liner importer の保存/復元/スナップショット |
| business 保存 | `frontend/src/platform/storage/businessProjectPersistence.ts` | localStorage (`spacer.designPlatform.projects.*`) | Business Project manifest の保存 |
| substructure 保存 | `frontend/src/substructure/planning/SubstructurePlanningHost.tsx:329` | download (`substructure-project.json`) | substructure の単独保存 |

### 保存形式 / 拡張子 (確定)

- 主形式: **project.json** (`application/json`, 拡張子 `.json`)。
  中身は `JSON.stringify(serialized.project, null, 2) + "\n"`。
- 別形式: **`.spacerproj`** (next アーキテクチャの Project Package, `spacerproj-json-v1`)。
- backend: 保存先 `backend/data/projects/` (fileName 指定 / `autosave.json`)。
- Electron persistence IPC: 保存先 `app.getPath("userData")/projects`。

---

## 6. Project 生成から保存までのデータフロー (確定)

```
App 起動 → useState(createEmptyProject())                          (App.tsx:170)
  │  (アポロなどは createDefaultProject / sample から commitProject)
  │
編集 → setProject / commitProject
  │
保存 (saveProject, App.tsx:737)
  ├─ 数値 draft 不正 (hasInvalidNumericDrafts) なら中止
  ├─ apollo ルート: exportApolloProjectToText(project)             (importExport.ts:223)
  └─ 通常ルート:
       serializeApolloPhase1Unit2ForPersistence(project)          (unit2Draft.ts:368)
       serializeProjectForPersistence(...)                        (linerProjectDraft.ts:145)
       payload = JSON.stringify(serialized.project, null, 2) + "\n"
  │
  ├─ native: saveProjectFile(payload, "project.json")             (projectFileDialog.ts:55)
  │      → IPC spacer:dialog:save-project → handleSaveProject      (dialogIpc.ts:77)
  │      → fs.writeFile (dialog / automation path)
  └─ browser: downloadText("project.json", payload, "application/json")  (App.tsx:1687)
```

**注意: `saveProject()` はファイル出力後、serialize 済み Project をそのまま state に戻す
(`setProject(serializedProject)`, App.tsx:787 / :794)。つまり保存は「出力のみ」ではなく、
liner の `domainDraft` 除去 / RDD 化 などを in-memory state に反映する副作用を持つ。**

自動保存 (独立経路, **現状は無効**): コード上は `dirty && 3s → apiClient.autosaveProject(project)`
(App.tsx:354) → POST `/api/projects/autosave` → `_store_legacy_project_json(autosave.json)` (main.py:497)。
**ただし `AUTOSAVE_ENABLED = false` (App.tsx:151) のため実行されない。また、実行される場合も
serialize チェーンを通さず生の in-memory project を保存する非対称設計である。**

---

## 7. 保存データから Project 復元までのデータフロー (確定)

```
project.json (text)
  → openProjectFile (projectFileDialog.ts:48)
       ├─ native: IPC spacer:dialog:open-project → handleOpenProject (dialogIpc.ts:50)
       └─ browser: <input type=file>
  → openProjectViaDialog / openFile (App.tsx:713 / 691)
  → apollo ルート: importApolloProjectFromText(content)
  → 通常ルート: hydrateProjectFromJsonText(content)               (App.tsx:678)
       JSON.parse
       migrateProject(parsed)                                      (projectMigration.ts:9)
       hydrateProjectLinerFromPersistence(...)                     (linerProjectDraft.ts:99)
       hydrateApolloPhase1Unit2FromPersistence(...)                (unit2Draft.ts:329)
  → commitProject(nextProject) → setProject → setDirty(false)
```

---

## 8. 現行 validation (確定)

| 経路 | ファイル | 検証内容 | 備考 |
|---|---|---|---|
| 解析ゲート (App) | `App.tsx:428` → `apiClient.validateProject` → `backend/app/main.py:84` | `validate_project` → `parse_model` (FEM parser) | JSON Schema ではない |
| apollo import | `importExport.ts:103,128` | `validateProjectEnvelope` / `validateApolloSidecarStrict` (手書き, `additionalProperties` 相当) | import 専用 |
| headless liner | `validateGeneratedLinerProject.ts` | ajv で `schemas/project.schema.json` + liner extension | 保存経路では使用されない |
| importer | `liner/importer/storage/validateImporterProject.ts` | ajv で importer 用 schema | importer 専用 |
| backend save/autosave | `main.py:451,500` | `find_non_finite` (NaN/Infinity) のみ | schema validation なし |
| 単体テスト | `backend/tests/test_project_schema.py`, `substructure/__tests__/projectSchemaRegression.test.ts` | 公式 schema への適合 | 保存経路外 |

**重要: 主経路 (App.tsx save/load) は公式 JSON Schema (`schemas/project.schema.json`) で検証されていない。
また、標準生成 Project (`createEmptyProject` / `createDefaultProject`) 自体が公式 Schema に適合しない
(nodes/materials/loadCases の `minItems:1` と `analysisSettings.solver` 必須を満たさない)。**

---

## 9. 現行 migration (確定)

- `migrateProject()` (projectMigration.ts:9) が唯一の Project 全体 migration。
- 処理は「top-level `schemaVersion` が無ければ `CURRENT_PROJECT_SCHEMA_VERSION` (=1) を補完」のみ。
- version 分岐 / 旧形式変換 / フィールド再配置は存在しない。
- liner は別レイヤーで `migrateLinerDraftToVNext` (liner/schema/projectLinerMigration.ts) が
  legacy draft → vNext 変換を行う (App の読み込み経路内で `hydrateProjectLinerFromPersistence` が呼ぶ)。
- `CURRENT_PROJECT_SCHEMA_VERSION` が増えた場合の拡張機構は未整備。

---

## 10. 現行 roundtrip / persistence 関連 test (確定)

### 主経路関連 (test:fast / test:ui に含まれる)

| テストファイル | 保証していること | 保証していないこと | Phase A での流用 |
|---|---|---|---|
| `frontend/src/projectMigration.test.ts` | 旧 Project への schemaVersion 補完 / 既存値保持 | 複雑な旧構造の完全互換 | 可 (migration 拡張の土台) |
| `frontend/src/liner/adapters/linerProjectDraft.test.ts` | liner serialize→hydrate roundtrip | 実ファイル/再起動を跨ぐ保存 | 可 |
| `frontend/src/App.linerSaveLoad.test.tsx` | UI 経由の save→reload で liner 情報復元 | autosave / ファイルシステム障害 | 可 (UI 側 roundtrip) |
| `frontend/src/apollo/__tests__/importExport.test.ts` | Apollo import/export roundtrip / BOM / 日本語 / 参照整合 | 通常ルート全体 / autosave | 可 |
| `frontend/src/substructure/__tests__/projectSchemaRegression.test.ts` | 公式 schema の後方互換 (optional substructure 含む) | 全 variant 網羅 | 可 (schema drift 監視の土台) |
| `frontend/src/liner/headless/__tests__/createHeadlessLinerFrameProject.test.ts` | 生成 Project が公式 schema に適合 | save→load roundtrip | 可 |
| `frontend/src/contracts/persistence/__tests__/migrationIntegration.test.ts` | legacy→canonical 変換 / save→load 安定性 | 実 OS ファイル耐久性 | 可 |

### backend 関連 (CI では未実行)

| テストファイル | 保証していること | 保証していないこと |
|---|---|---|
| `backend/tests/test_project_schema.py` | examples + case の公式 schema 適合 | 保存 API の read/write 動作 |
| `backend/tests/test_api.py` | `/api/projects/save→load` roundtrip / autosave / path traversal | frontend ProjectModel / liner persistence |
| `backend/tests/test_atomic_json_persistence.py` | atomic save / checksum / CAS / 障害時保全 | migration / UI 復元 |

### next / importer / business (並列層)

| テストファイル | 保証していること |
|---|---|
| `frontend/src/next/persistence/__tests__/filesystemProjectPersistence.test.ts` ほか next/persistence 群 | next 層の save/load/restore/package roundtrip |
| `frontend/src/next/persistence/package/__tests__/projectRoundTrip.test.ts` | `.spacerproj` export→import roundtrip |
| `frontend/src/liner/importer/storage/storage.test.ts` | importer の create/save/load/export/import |
| `frontend/src/platform/storage/businessProjectPersistence.test.ts` / `businessProjectFolderStore.test.ts` | business manifest 保存 / checksum / revision |

### 追加確認済みの persistence 関連テスト (Sol レビュー反映)

| テストファイル | 保証していること | 補足 |
|---|---|---|
| `frontend/src/substructure/__tests__/adapterPersistence.test.ts` | 実 substructure 形式 (AdapterEnvelope) の serialize/roundtrip | schema 適合は保証していない |
| `frontend/src/substructure/__tests__/persistence.test.ts` | substructure project の実 serialization | schema 適合は保証していない |
| `frontend/tests/e2e/substructure-persistence.spec.ts` | substructure 保存の E2E | CI 未実行 |
| `frontend/src/apollo/__tests__/workspace.test.ts` | Apollo workspace localStorage の保存/復元 (malformed 対応) | 全 sidecar roundtrip は保証していない |
| `frontend/src/desktop/projectFileDialog.test.ts` | file dialog のブラウザ fallback 挙動 | — |
| `desktop/electron/dialogIpc.test.ts` | Electron dialog IPC の open/save 挙動 | — |

### CI 実行範囲 (確定)

- `.github/workflows/ci.yml` は `npm run test:fast` + `npm run typecheck` + `npm run build` のみ。
- `test:ui` / backend test / `test:3d` / `test:slow` / `test:electron` / e2e は CI 未実行。

### カバレッジ上の主要ギャップ (確定 / 重要)

- **ProjectModel 全体に対する単一の save→load roundtrip テストが存在しない**
  (主経路の roundtrip は liner または apollo に限定されたテストで間接的に担保されているのみ)。
- 主経路の保存・読み込みに schema validation を挟むテストは存在しない。
- 標準生成 Project (`createEmptyProject` / `createDefaultProject`) を公式 Schema で
  validation するテストは存在しない (実行すれば失敗するため)。
- substructure の実保存形式 (AdapterEnvelope) を公式 Schema で検証するテストは存在しない
  (schema regression は手組みデータのみ)。

---

## 11. Schema / Persistence 同期ポイント (確定)

1. `frontend/src/types.ts` — ProjectModel 型 (保存対象の全 key を定義)
2. `schemas/project.schema.json` — 公式 JSON Schema (top-level `additionalProperties:false`)
3. `frontend/src/data/defaultProject.ts` — 初期値 (createEmptyProject / createDefaultProject)
4. `frontend/src/projectMigration.ts` — schemaVersion / migration
5. `frontend/src/liner/adapters/linerProjectDraft.ts` — liner serialize/hydrate (RDD 変換)
6. `frontend/src/apollo/unit2Draft.ts` / `bridgeStructure/projectBsdd.ts` / `bridgeProject/projectSuperstructure.ts` — apollo sidecar serialize/hydrate
7. `frontend/src/apollo/importExport.ts` — apollo import/export (strict validation)
8. `frontend/src/App.tsx` — save/load の呼び出しと分岐
9. `backend/app/main.py` — backend save/load/autosave/validate
10. `examples/project.json` — 公式 example (schema test で利用)
11. `backend/tests/test_project_schema.py` / `frontend/src/substructure/__tests__/projectSchemaRegression.test.ts` — schema 適合の監視
12. `frontend/src/apollo/workspace.ts` — localStorage への ProjectModel 保存 (unit2 のみ)
13. `frontend/src/apollo/drawing/artifactBundle.ts` — 成果物 ZIP 内への生 Project 埋め込み
14. `frontend/src/substructure/planning/persistence.ts` / `design/adapterPersistence.ts` — substructure 実保存形式

---

## 12. 現在自動化されていない箇所 (確定)

- ProjectModel 型 ⇔ JSON Schema の key 集合一致チェック (ProjectModel→schema は現状一致、
  schema→ProjectModel に `substructure` の不一致あり)。
- 主経路 save/load 時の JSON Schema validation。
- 保存前に `additionalProperties:false` との整合を機械検証する機構。
- 標準生成 Project (`createEmptyProject` / `createDefaultProject`) の schema 適合チェック
  (現状は不適合)。
- substructure 実保存形式 (AdapterEnvelope) の schema 適合チェック (現状は不適合)。
- Apollo workspace (localStorage) 経路が共通 serialize チェーン / `migrateProject` を通っていない点の検知。
- Apollo 成果物 ZIP (`02_input/project.json`) が生 Project を直接埋め込む点の検知。
- version 増加に応じた migration の必須化 (version 分岐なし)。
- 全 sidecar を対象とする汎用 roundtrip テスト。
- backend save 時の schema validation。
- 現状無効の autosave が有効化された場合の serializer 統一 (guard 依存のため現状は休止)。

---

## 13. 同期漏れリスク (優先度順)

1. **主経路に schema validation なし + 標準生成 Project が schema 不適合** (高) —
   ProjectModel に新フィールドを足しても保存時に検証されず、schema 更新を忘れても test:fast は
   green のまま。さらに `createEmptyProject` / `createDefaultProject` 自体が
   `minItems:1` / `solver` 必須を満たさず、schema を保存時チェックに導入すると
   現行の初期・サンプル Project が即時 fail する。→ schema 導入時に初期値の
   整合 (デフォルト `solver` 付与や `minItems` 見直し等) の判断が必要。
2. **ProjectModel 型 ⇔ Schema の drift 検知なし** (高) — 既に `substructure` が schema のみに存在。
   key 追加/削除が手動依存。
3. **version 2 系への migration 未整備** (高) — `migrateProject` は schemaVersion 補完のみで
   分岐がない。schemaVersion が 2 になっても旧形式の変換経路が無い。
   なお apollo import は `migrateProject()` より先に top-level `schemaVersion` を必須検証する
   (`importExport.ts:103,165,187`) ため、version 欠落を migration で補完できない (経路差)。
4. **substructure 実保存形式と公式 Schema の非互換** (中・高) — 実出力 (alignmentRefs / metadata)
   が `projectSubstructure` (`additionalProperties:false`) に適合しない。regression test も
   実出力を検証していない。
5. **Apollo workspace (localStorage) 経路の分離** (中) — ProjectModel 全体を unit2 の
   serialize/hydrate のみで保存/復元する。liner / BSDD / superstructure や
   `migrateProject()` を通らないため、他経路との間で保存内容の意味が異なる。
6. **成果物 ZIP への生 Project 埋め込み** (中) — `artifactBundle.ts:181` は共通 serializer を
   通さず raw project を `02_input/project.json` に格納。ProjectModel/Schema 変更の影響を受ける。
7. **sidecar の `additionalProperties:true`** (中) — analysisResults / apollo* の内訳が
   schema で検証されず、型とズレても検知不能。
8. **version 情報の 2 系統** (中) — top-level 整数 `schemaVersion` と
   `project.schemaVersion` (文字列 "1.0.0") が別物で、更新時に誤認リスク。
9. **補助経路の分散** (低〜中) — importer / business / next / substructure が別保存機構で、
   主経路の変更の影響を受けにくい一方、互いに整合する保証がない。
10. **CI 範囲が狭い** (低) — CI は test:fast のみ。backend / ui / e2e 系 persistence test は未実行。

### Phase A で機械的に検知すべき候補 (優先度順)

- (P0) ProjectModel 型の top-level key 集合 ⇔ `schemas/project.schema.json` properties 集合の
  差分テスト (`additionalProperties:false` との整合を含む)。
- (P0) 標準生成 Project (`createEmptyProject` / `createDefaultProject`) を公式 Schema で
  validation するテスト。→ 現状不適合を可視化し、schema 導入時に初期値の整合判断を強制する。
- (P1) 主経路 save/load に公式 schema validation を挟む (App の save 前 / load 後に ajv 実行) か、
  それを検証する roundtrip テスト。
- (P1) ProjectModel 全体を対象とする generic save→load roundtrip テスト
  (serialize チェーン → JSON → migrate + hydrate チェーン)。

---

## 14. Phase A 本体で最初に実装すべき自動チェック候補 (1〜3件)

1. **Schema drift 検知テスト** — `frontend/src/types.ts` の ProjectModel top-level key と
   `schemas/project.schema.json` の properties を比較し、
   `additionalProperties:false` 下で不一致があれば fail するテスト。
   (`substructure` の不一致を解消 or 許容明記したうえで適用)
2. **主経路 save/load の schema conformance** — `hydrateProjectFromJsonText` / `saveProject`
   相当の処理で `schemas/project.schema.json` (ajv) を通す、またはそれを保証する
   roundtrip テストを追加し、保存形式が常に schema に適合することを機械担保する。
3. **generic ProjectModel roundtrip テスト** — ProjectModel 全フィールド (任意 sidecar 含む) を
   serialize → JSON → migrate + hydrate するテスト。
   ※ 現行の serialize/hydrate は liner の表現交換 (RDD ⇔ domainDraft)、unit2 の hydrate 時生成、
   `localDraftStatus:"saved"` 付与などの**意図的な非恒等・正規化処理**を含むため、
   「全フィールド同値」ではなく「保存→復元でアプリが成立すること (migration + hydration 成功 +
   保存形式が schema 適合)」を保証する内容にする。

---

## 15. 未確定事項

- substructure データが ProjectModel (`project.json`) に埋め込まれる経路は確認できず
  (実保存は単独 `substructure-project.json` / AdapterEnvelope のみ。schema 上の optional
  `substructure` が主経路で使われる予定があるかは不明)。
- 各 sidecar (analysisResults / apolloPhase1Unit2 / apolloBsdd /
  apolloBridgeStructureInput / apolloBridgeProjectSuperstructure) の schema 内部定義と
  TS 型が完全一致しているかの全量検証は未実施。
- `next/project` (zod `Project`) と `ProjectModel` の関係・置き換え予定は不明。
- backend 保存 (`backend/data/projects/`) の正式な保存形式が「legacy project JSON」と
  命名される理由・移行予定は不明 (`_store_legacy_project_json`)。
- 主経路の「Schema validation」がどこにも存在しない点が、意図 (MVP 方針) なのか
  過去の削除の結果なのかはコミット履歴からの確認は未実施。
- Electron `userData/projects` 経路 (`PERSISTENCE_*`) を使うのは next アーキテクチャのみか
  (主経路では未使用の可能性が高いが、他画面での使用有無は未確認)。
- backend `/api/projects/save|load` のクライアント呼び出し元 (`api/client.ts:259,263`) が
  リポジトリ内で見つからなかった点。公開 API として他ツールが利用する想定かは不明。
- `AUTOSAVE_ENABLED = false` (App.tsx:151) の意図 (休止中なのか廃止予定なのか) は不明。

---

## 16. Phase A-01 進入判定

- 主経路 (project.json) の serialize / deserialize / migration / save / load / import / export は
  実ファイル・関数単位で確定した。
- 補助経路 (workspace / artifactBundle / backend / next / importer / business / substructure) の
  位置も特定した。
- 最大リスクは「主経路に schema validation が無く、型⇔schema の drift が未検知」であり、
  さらに「標準生成 Project と substructure 実保存形式が公式 Schema に不適合」という
  既存不整合 (確定) がある。
- これらは Phase A 本体で「自動チェック候補」として最初に取り組む対象であり、
  今回の監査目的 (正確な把握と着手点の確定) は達成済み。
- **Phase A 開始時は「標準生成 Project の schema 不適合」と「substructure 実保存形式の
  schema 不適合」を事前認識したうえで、自動チェックの対象と初期値の整合方針を決定する必要がある。**

→ **Phase A-01 へ進める** (ただし上記の既存不整合を Phase A の最初の自動チェック実装時に
明示的に取り扱うこと)。

---

## 17. Sol 監査レビューと追加監査 (Step 7 / Step 8)

- **Step 7**: Codex CLI (GPT-5.6 Sol, 読み取りのみ) により監査マップを 1 回レビューした。
  レビュー結果は「監査文書の重大な欠陥あり」の判定で、P0 3 件 / P1 5 件 / P2 2 件の指摘を受けた。
- **Step 8**: 指摘 10 件すべてを実ファイルで検証し、全て裏付けを確認した。その結果を本稿へ反映した。

| 指摘 | 分類 | 検証結果 (確定) |
|---|---|---|
| 標準生成 Project が公式 Schema 不適合 (minItems:1, solver 必須) | P0 | 確定 (`defaultProject.ts:31,32,36,40,131` vs `schemas/project.schema.json:95,102,128,156`) |
| substructure 実保存形式 (AdapterEnvelope) が公式 Schema 不適合 (alignmentRefs/metadata) | P0 | 確定 (`planning/persistence.ts:77,84,89` vs `schemas/project.schema.json:2535`) |
| Apollo workspace (localStorage) が unit2 のみで ProjectModel を保存/復元 | P0 | 確定 (`apollo/workspace.ts:96,116,151,172,287`) |
| autosave は無効 (AUTOSAVE_ENABLED=false) であり稼働経路ではない | P1 | 確定 (`App.tsx:151,318,350,1481`) |
| saveProject は serialize 済み Project を state へ反映 (副作用あり) | P1 | 確定 (`App.tsx:787,794`) |
| roundtrip は意図的に非恒等・正規化型 (全フィールド同値の前提は不成立) | P1 | 確定 (`linerProjectDraft.ts:99,145`, `unit2Draft.ts:329,368`) |
| apollo import は migration より先に schemaVersion を必須検証 | P1 | 確定 (`importExport.ts:103,165,187`) |
| 成果物 ZIP が生 Project を直接埋め込み | P1 | 確定 (`artifactBundle.ts:181`) |
| Electron persistence IPC の resolveSafe は `..` を拒否しない | P2 | 確定 (`projectPersistenceIpc.ts:18`) |
| persistence 関連テストの記載漏れ (6 ファイル) | P2 | 確定 (全ファイルの存在を確認し §10 へ追記) |

- 追加監査は 1 回のみ実施し、追加の深掘り・再レビューは行っていない。

---

## 付録A. 本監査で実行した検証

- `frontend/src/projectMigration.test.ts` / `apollo/__tests__/importExport.test.ts` /
  `substructure/__tests__/projectSchemaRegression.test.ts` / `liner/adapters/linerProjectDraft.test.ts`
  → 42 passed (test:fast, node)
- `backend/tests/test_project_schema.py` + `backend/tests/test_api.py` → 45 passed
- (いずれも既存テストの存在・健全性確認のためのみに実行し、新規テストは実装していない)

## 付録B. 開始時点で存在した無関係差分 (保全対象)

- `final_report.txt` (削除済み, D)
- `docs/rebuild/reports/R1-04.5_GPT-5.6-Luna_Vision_Delegation_検証結果.txt` (未追跡, ??)

両者とも本監査では変更・削除・追加していない。
