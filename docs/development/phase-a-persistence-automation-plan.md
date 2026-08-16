# SPACER CLONE — Phase A「Schema / Persistence 同期自動化」実行計画 (Phase A-01)

- 作成日時: 2026-08-16 (JST)
- 対象リポジトリ: `~/Projects/spacer-clone`
- 開始時 main SHA: `4b7ee825ee538e7f723d2c2d489a1f215d502e75`
- 上位文書: [project-persistence-map.md](project-persistence-map.md) (Phase A-00 監査マップ)
- 本稿の位置づけ: Phase A 本体 (A-02〜A-08 + Completion Gate) を、
  次回の AI エージェントが追加の設計相談をほぼせず一気通貫で実装・検証・完了するための
  **実装契約書・実行計画**。

> この計画に従って Phase A を一気通貫で実装・検証・完了してください。

---

## 1. Phase A の目的

Project データが「定義 / 初期化 / serialize / deserialize / migration / Save / Load / import / export」
のどこで定義・処理されるかを正しく契約化し、

- **ProjectModel を変更したときに「Schema との同期漏れ」を機械的に検知できる**
- **主経路 (project.json) が常に公式 JSON Schema と整合した形式で Save / Load できる**

状態を作る。これは「完全な Persistence 再設計」ではなく、
site-context-prototype 統合を始める前に必要な **安全柵** を用意するフェーズである。

Phase A の成功 = 次フェーズ (site-context-prototype 統合) 開始時に、
「ProjectModel へ新フィールドを追加しても、更新漏れが自動で検知され、既知例外が文書化されている」状態。

---

## 2. Phase A-00 監査結果の要約

詳細は [project-persistence-map.md](project-persistence-map.md) を参照。本稿の前提は以下。

### 2.1 確定事項 (監査 + Phase A-01 で再確認済み)

1. 標準生成 Project が公式 JSON Schema に現状不適合 (確定)
   - `createEmptyProject` (`frontend/src/data/defaultProject.ts:11`): `nodes/materials/sections/loadCases`
     が空配列で、Schema の `minItems:1` を満たさない。`analysisSettings.solver` 欠落。
   - `createDefaultProject` (`:49`): `analysisSettings.solver` 欠落のみ (要素は充足)。
   - 実測: `schemas/project.schema.json` を ajv で実行し、`examples/project.json` は PASS、
     空 Project 相当は `/nodes` `/materials` `/sections` `/loadCases` の minItems と
     `/analysisSettings` の solver 必須で FAIL することを確認。
2. ProjectModel ⇔ Schema drift の自動検知がない (確定)
   - 型 (`frontend/src/types.ts:250`) と Schema の top-level key を実測比較した結果、
     **schema-only key は `substructure` の 1 件のみ**、model-only key は 0 件。
3. substructure 実保存形式 `AdapterEnvelope` と公式 Schema に不整合 (確定)
   - `serializeSubstructureProject` (`frontend/src/substructure/planning/persistence.ts:59`) は
     `alignmentRefs` / `metadata` を必ず出力するが、公式 Schema の `projectSubstructure`
     (`schemas/project.schema.json:2535`, `additionalProperties:false`) には両フィールドが無い。
4. 主 Save / Load 経路に公式 JSON Schema validation がない (確定)
   - `App.tsx saveProject:737` / `hydrateProjectFromJsonText:678` は schema validation を通らない。
5. `migrateProject()` は schemaVersion 補完中心で version 分岐がない (確定)
   - `frontend/src/projectMigration.ts:9`。`CURRENT_PROJECT_SCHEMA_VERSION = 1` (`:3`)。
6. Apollo workspace は共通 Persistence chain を使用しない (確定)
   - `frontend/src/apollo/workspace.ts` は `serializeApolloPhase1Unit2ForPersistence` / 
     `hydrateApolloPhase1Unit2FromPersistence` のみで localStorage に保存/復元。
7. artifactBundle は生 Project を直接埋め込む経路を持つ (確定)
   - `frontend/src/apollo/drawing/artifactBundle.ts:181`
     `pushText("02_input/project.json", JSON.stringify(project, null, 2))`。
8. roundtrip は単純な全フィールド恒等比較では扱えない (確定)
   - serializer/hydrate は RDD 埋め込み / domainDraft 除去 / `localDraftStatus:"saved"` 付与などの
     **意図的な非恒等・正規化処理** を含む (`linerProjectDraft.ts:99,145`, `unit2Draft.ts:329,368`)。
9. Phase A-00 の最終判定は「Phase A-01 へ進める」。

### 2.2 Phase A-01 での追加確認 (前提が現在も成立すること)

- Schema の top-level `additionalProperties:false` 維持。`substructure` のみ schema-only。
- `project.schemaVersion` (文字列 `const "1.0.0"`) と top-level 整数 `schemaVersion` は別系統。
- Schema の `projectLinerMetadata` (`schemas/project.schema.json:1149`) は
  `roadDesignDocument` / `domainDraft` / `draft` を properties に持ち、
  persisted 表現 (RDD 埋め込み) も runtime 表現 (domainDraft) も Schema 上は表現可能。
- CI (`.github/workflows/ci.yml`) は `npm run test:fast` + `npm run typecheck` + `npm run build` のみ。
  `test:fast` は `frontend/src/**/*.test.ts` のうち jsdom を含まない全ファイルが自動対象
  (`frontend/scripts/testIndex.mjs`)。→ Phase A の Guard test は FAST 分類に置けば自動で日常 Gate 化。
- `frontend/src/persistence/` は現存しない (新設可能)。

### 2.3 未確定事項 (本計画でも推測で確定しない)

- substructure データが ProjectModel (`project.json`) に埋め込まれる経路は存在しない (現行)。
- 各 sidecar の schema 内部定義と TS 型の完全一致の全量検証は未実施。
- `next/project` (zod `Project`) と `ProjectModel` の関係・置き換え予定は不明。
- backend 保存形式の「legacy project JSON」命名理由、`/api/projects/save|load` の呼び出し元不在の意図。
- `AUTOSAVE_ENABLED = false` (`App.tsx:151`) の意図 (休止 / 廃止)。

---

## 3. Phase A 完成定義

Phase A が「完了」とは、以下の全項目を満たす状態をいう。

| # | 完成条件 | 主な根拠 |
|---|---|---|
| F1 | **Schema Drift Guard が稼働** — ProjectModel top-level key ⇔ Schema properties の不整合を `npm run test:fast` で自動検知。既知の schema-only key (`substructure`) は明示 allowlist として契約化 | A-02 |
| F2 | **標準生成 Project の Persistence 正常条件が明確** — `createDefaultProject` は公式 Schema 適合。`createEmptyProject` は「runtime 初期状態 (transient) で、保存対象ではない」と定義し、その既知不適合を conscious exception としてアサート | A-03 |
| F3 | **Save / Load / migration / hydration の成立性を自動検証** — 主経路 serialize→persisted→migrate→hydrate の generic roundtrip が成立 (全フィールド同値ではなく成立性保証) | A-04 |
| F4 | **JSON Schema validation を行う正式な境界が明確** — 主 Save は非適合出力を書かない (fail-closed)、主 Load は非適合入力を構造化エラーで拒否。**主 Save/Load の両分岐 (通常 / apollo) を対象** | A-05 |
| F5 | **schemaVersion 変更時の migration 漏れを検知** — `CURRENT_PROJECT_SCHEMA_VERSION` 増加時に migration 実装を必須化する Guard | A-07 |
| F6 | **substructure 等の例外 Persistence 経路の扱いが明確** — 例外経路は「正式な例外」として契約化し、Guard/Test でロック | A-06 |
| F7 | **Phase A の重要チェックが日常 Gate で実行可能** — Phase A test は境界ロジックを純関数化して FAST 分類に置き、`test:fast` (= 現行 CI の対象) で検知可能とする。App.tsx の配線は `test:ui` で確認 | A-08 |
| F8 | **site-context-prototype 統合時、新規 ProjectModel フィールドを安全に追加可能** — 新フィールド追加 → drift guard が schema 更新漏れを検知 | A-02 継続 |

### 3.1 完成範囲の明確な限定 (安全柵)

Phase A では**以下をしない**。

- ProjectModel の大規模再設計 / Schema 全面書換え / Persistence 全面リライト
- 既存の複数 Persistence 経路の強制統一
- substructure の ProjectModel 埋め込み / terrain / road surface / 上部工・下部工データ統合
- site-context-prototype の統合
- `additionalProperties:false` の解除 / Schema の安易な緩和

---

## 4. Persistence Contract

Phase A 終了時に「何を正とするか」。各項目について正本・入力・出力・validation 責務・
migration 責務・test 責務を定義する。

| 項目 | 正本 (source of truth) | 入力 | 出力 | validation 責務 | migration 責務 | test 責務 |
|---|---|---|---|---|---|---|
| **canonical ProjectModel** | `frontend/src/types.ts:250` (ProjectModel 型)。runtime in-memory の全 Project 構造 | — (runtime 状態) | — | 型。persisted 形式とは意図的に異なる (domainDraft 等) | — | A-02 drift guard (key 集合一致) |
| **canonical JSON Schema** | `schemas/project.schema.json` (draft 2020-12, top-level `additionalProperties:false`)。persisted project.json 形式の唯一の正本 | persisted 表現 (serialize 出力 / Load された raw JSON) | — | persisted 形式の validation を主 Save/Load 境界で実施 (A-05) | — | 既存 `projectSchemaRegression.test.ts` / `test_project_schema.py` を流用し、schema 自体の後方互換を監視 |
| **schemaVersion** | `frontend/src/projectMigration.ts:3` `CURRENT_PROJECT_SCHEMA_VERSION = 1` (top-level 整数)。Project 全体の persistence version。`project.schemaVersion` (文字列 const "1.0.0") は別系統の metadata であり migration 駆動に使わない | persisted JSON の top-level `schemaVersion` (Schema 上 optional, minimum 1)。**欠落値は legacy 基準 version (現行 v1) として確定する** (CURRENT が 2 以上でも最新版扱いにしない) | legacy 基準 version から CURRENT まで順次 migration した結果の CURRENT 値 | Schema 側 (integer >= 1) | `migrateProject()` が欠落を legacy 基準 (v1) として確定し、CURRENT まで順次 migration。A-07 で version dispatch 導入 | `projectMigration.test.ts` 流用 + A-07 guard (欠落データが最新版扱いにならないことを test で保証) |
| **default Project** | `frontend/src/data/defaultProject.ts` (`createEmptyProject:11` / `createDefaultProject:49`) | — (生成関数) | runtime ProjectModel | `createDefaultProject` は Schema 適合必須 (A-03 で `solver:"scipy_sparse"` 追加)。`createEmptyProject` は runtime-only transient で非保存対象 (conscious exception) | — | A-03 conformance test |
| **serializer** | `frontend/src/liner/adapters/linerProjectDraft.ts:145 serializeProjectForPersistence` + `frontend/src/apollo/unit2Draft.ts:368 serializeApolloPhase1Unit2ForPersistence` (順序: unit2 → liner) | runtime ProjectModel | persisted 表現 (RDD 埋め込み / domainDraft 除去 / `localDraftStatus:"saved"`) | 出力が公式 Schema に適合すること (A-05 の save boundary で機械検証、fail-closed) | — | `linerProjectDraft.test.ts` 流用 + A-04 roundtrip |
| **deserializer / hydrate** | `hydrateProjectLinerFromPersistence` (`linerProjectDraft.ts:99`) + `hydrateApolloPhase1Unit2FromPersistence` (`unit2Draft.ts:329`)。前置 `migrateProject` | persisted 表現 (Load → migrate 済) | runtime ProjectModel | 入力 (persisted 表現) の Schema 適合を Load 境界で実施 (A-05) | liner 別レイヤー `migrateLinerDraftToVNext` は hydrate 内で呼ばれる (現行のまま) | A-04 roundtrip |
| **migration** | `frontend/src/projectMigration.ts:9 migrateProject` | raw persisted object (**schemaVersion 欠落は legacy 基準 v1 とみなす**) | legacy 基準から順次 migration し CURRENT 値を付与 | — (migrate 後、Load 境界で Schema validation) | version dispatch。**欠落値を v1 として確定し、CURRENT まで順次 migration**。CURRENT 増加時に全旧 version の migration 必須化 (A-07) | `projectMigration.test.ts` + A-07 guard |
| **validation** | 公式 `schemas/project.schema.json` (ajv)。主 Save/Load 境界の validation (A-05) | persisted 表現 | ok/NG + 構造化エラー | Save (serialize 後) fail-closed / Load (migrate 後 hydrate 前) fail-closed | — | A-05 境界 test |
| **Save** | `frontend/src/App.tsx:737 saveProject` → `saveProjectFile` (`projectFileDialog.ts:55`) / `downloadText` (`App.tsx:1687`) | runtime ProjectModel | project.json (persisted 表現) | 非適合出力を書かない (A-05)。※ 現行は serialize 済 Project を state へ戻す副作用あり (`App.tsx:787,794`) — Phase A では変更しないが認識 | — | `App.linerSaveLoad.test.tsx` 流用 |
| **Load** | `frontend/src/App.tsx:713 openProjectViaDialog` / `:678 hydrateProjectFromJsonText` | project.json text | runtime ProjectModel (commit) | persisted 表現を migrate 後 hydrate 前に Schema 適合で拒否 (A-05) | `migrateProject` 経由 | `App.linerSaveLoad.test.tsx` 流用 |
| **import / export (apollo)** | `frontend/src/apollo/importExport.ts` (`importApolloProjectFromText:152` / `exportApolloProjectToText:223`) | text (import) / runtime ProjectModel (export) | ProjectModel (import) / text (export) | 手書き strict validation (envelope/sidecar) は現行のまま維持し、**さらに A-05 で主 Save/Load の両分岐 (通常 / apollo) の書込み直前 / hydrate 前に公式 Schema validation を必須化** (fail-closed)。**経路差を確定**: apollo import は `migrateProject` より先に top-level `schemaVersion` を必須検証 (`importExport.ts:103,165,187`)。Phase A ではこの経路差を A-06 で文書化し、統一しない | `importExport.test.ts` 流用 |
| **roundtrip** | 主経路チェーン serialize → JSON → migrate → hydrate | runtime ProjectModel | persisted → runtime ProjectModel | 保存→復元で「migration + hydration 成功 + 保存形式が Schema 適合」を保証。**全フィールド同値ではない** (意図的 non-identity) | `migrateProject` 経由 | A-04 generic roundtrip (新規) |
| **sidecar** | ProjectModel 任意 sidecar (`analysisResults` / `apolloPhase1Unit2` / `apolloBsdd` / `apolloBridgeStructureInput` / `apolloBridgeProjectSuperstructure` / `liner` / `linerTrace`)。Schema 上は `additionalProperties:true` の緩い定義 | persisted 表現内 | — | sidecar 内部の型⇔Schema 完全一致の全量検証は**未実施 (未確定)** のため Phase A 後へ延期。Phase A では「sidecar 付き Project が主経路 roundtrip を壊さないこと」を A-04 で担保 | 各 sidecar serializer の自前 version 管理は現行のまま | A-04 roundtrip (sidecar 付き Project) |
| **substructure** | `frontend/src/substructure/planning/persistence.ts:59 serializeSubstructureProject` / `design/adapterPersistence.ts:37 serializeAdapterEnvelope`。単独 `substructure-project.json` (AdapterEnvelope) は公式 Schema の `projectSubstructure` とは**別の独立形式** | supports + alignmentRefs | AdapterEnvelope JSON (単独ファイル) | 独自 `validateSubstructureProject` (fail-closed)。**公式 Schema 適合は要求しない** (正式な例外経路) | 独自 version 管理 (`SUBSTRUCTURE_SCHEMA_VERSION` 0.2.0) | `adapterPersistence.test.ts` / `persistence.test.ts` 流用 + A-06 guard |
| **Apollo workspace** | `frontend/src/apollo/workspace.ts` (localStorage snapshot) | runtime ProjectModel | localStorage (unit2 serialize/hydrate のみ) | 公式 Schema 適合は要求しない (例外経路)。unit2 レベルの roundtrip のみ保証 | `migrateProject` を通さない (例外、文書化) | `workspace.test.ts` 流用 + A-06 guard |
| **artifactBundle** | `frontend/src/apollo/drawing/artifactBundle.ts:181` | runtime ProjectModel | ZIP 内 `02_input/project.json` (生 Project 埋め込み) | 例外経路。「現状スナップショット」として契約化。load-back 経路ではない | — (raw) | A-06 guard (埋め込み内容が raw であることを契約 test) |
| **backend persistence** | `backend/app/main.py:447,468,497` (`/api/projects/save|load|autosave`) → `backend/data/projects/` | JSON (legacy project JSON) | `backend/data/projects/` | 現行 `find_non_finite` のみ。Schema validation は **Phase A 後へ延期**。autosave は無効 | — | backend test は現行 CI 未実行のため Phase A Gate の必須要件にしない |

### 4.1 canonical chain / exceptional paths

```
[canonical chain]  = 主経路 (project.json)
  runtime ProjectModel
    → serializeApolloPhase1Unit2ForPersistence  (unit2Draft.ts:368)
    → serializeProjectForPersistence            (linerProjectDraft.ts:145)
    → [A-05 save validation: 公式 Schema, fail-closed]
    → JSON.stringify → project.json
    → Load: JSON.parse → migrateProject → [A-05 load validation: 公式 Schema, fail-closed]
      → hydrateProjectLinerFromPersistence → hydrateApolloPhase1Unit2FromPersistence
      → runtime ProjectModel

[exceptional paths]  = 正式な例外 (A-06 で契約化・ロック)
  - Apollo workspace      (localStorage, unit2 のみ)
  - artifactBundle        (ZIP 内 raw project 埋め込み)
  - substructure 単独     (substructure-project.json / AdapterEnvelope)
  - backend save|load     (backend/data/projects/, legacy project JSON)
  - backend autosave      (AUTOSAVE_ENABLED=false で無効)
  - next/persistence / importer storage / platform business 保存 (並列層)
  - apollo import/export  (独立 strict validation + version 事前必須の経路差)
```

**方針: 既存の複数 Persistence 経路を無理に 1 つへ統合することを Phase A の必須条件にしない。**
ただし「どの経路が canonical で、どの経路が例外か」を本契約で固定し、例外は Guard/Test でロックする。

---

## 5. 既知不整合 7 項目の処理方針

| # | 既知不整合 | 分類 | Phase A 内の扱い | 根拠 / 安全策 |
|---|---|---|---|---|
| 1 | 標準生成 Project の Schema 不適合 | **B (Guard/Test 検知) を主 + 最小限 A + C** | A-03 で `createDefaultProject` に `solver:"scipy_sparse"` を追加 (型上 optional のため安全、A)。conformance test で検知 (B)。`createEmptyProject` は「runtime 初期状態 (transient) で非保存対象」として例外契約化 (C)。主 Save は fail-closed で非適合出力を防ぐ (A-05) | **Schema の `minItems` / `solver` は緩めない**。`createEmptyProject` に placeholder 項目を入れない (初期状態の意図を保持) |
| 2 | ProjectModel ⇔ Schema drift | **B (Guard/Test 検知)** | A-02 で top-level key 集合一致テスト。既知の schema-only key `substructure` のみ allowlist 化 | `additionalProperties:false` 維持。allowlist は闇雲に増やさない。`substructure` を型へ追加する等の大改修はしない |
| 3 | substructure AdapterEnvelope と公式 Schema の不整合 | **C (例外契約化) + B (Guard/Test)** | A-06 で単独ファイル形式を正式な例外として契約化。実保存形式の Schema 適合は要求しない。regression test を実 serializer 出力ベースへ拡張 (B) | Schema の `projectSubstructure` は現行 main 経路で未使用 (optional)。互換を強制しない |
| 4 | 主 Save / Load に公式 Schema validation なし | **A (修正)** | A-05 で主 Save (serialize 後) / Load (migrate 後 hydrate 前) に fail-closed の Schema validation を導入。**主 Save/Load の両分岐 (通常 / apollo) を対象とする** | runtime 形式 (domainDraft 含む) を検証対象にしない。空 Project 保存の黙認を続けない |
| 5 | migration に version 分岐なし | **A + B** | A-07 で `migrateProject` に version dispatch 骨格を導入 (A) + `CURRENT_PROJECT_SCHEMA_VERSION` 増加時に migration 必須化 guard (B)。**欠落 schemaVersion は legacy 基準 v1 として確定し、CURRENT まで順次 migration する契約** (未 version データが最新版扱いにならない) | 現存しない v2 を想定した過剰設計をしない。無根拠な互換性破壊をしない |
| 6 | Apollo workspace が共通 Persistence chain を使わない | **C (例外契約化) + B** | A-06 で「localStorage snapshot = 一時キャッシュ、canonical persistence は project.json」と契約化。unit2 roundtrip の保証範囲を test でロック | 共通 chain 化は Phase A 後へ延期。現行の unit2 のみ roundtrip を保証 |
| 7 | artifactBundle が生 Project を直接埋め込む | **C (例外契約化) + B** | A-06 で「ZIP 内 project.json は現状スナップショット、load-back 経路ではない」と契約化。埋め込み内容が raw であることを test でロック | serializer 通過化は Phase A 後へ延期。schema 適合を要求しない |

> 全項目とも **「今後検討」で終わらせない**。A/B/C のいずれか (複合含む) を確定し、実装フェーズへ割り当てる。

---

## 6. A-02 以降の確定実装順序

Phase A-00 の自動チェック候補 (drift / conformance / roundtrip) と依存関係から、
初期案をそのまま採用する (変更不要)。

```
A-02 Schema Drift Guard
  → A-03 Default Project Conformance
  → A-04 Generic Persistence Roundtrip
  → A-05 Validation Boundary
  → A-06 Exceptional Persistence Paths
  → A-07 Migration Guard
  → A-08 Gate Integration
  → Phase A Completion Gate
```

依存の理由:
- A-02 が key 集合を契約化するため、A-03 の値 conformance が drift と混ざらない。
- A-03 で default の適合が確定するため、A-04 の roundtrip が適合入力から始められる。
- A-04 で persisted 表現の適合が保証されるため、A-05 の境界導入が回帰を起こさない。
- A-06 / A-07 は主経路契約 (A-02〜A-05) と独立しており、順序を入れ替えても可。
- A-08 は配置確認のみで最終 Gate 直前。

---

## 7. 各フェーズの実行仕様

> 各フェーズの共通事項:
> - 対象 Gate は原則 `npm run test:fast` + `npm run typecheck`。UI / 3D / Electron に影響する変更は
>   [development-test-rules.md](development-test-rules.md) に従い追加の Gate を実行。
> - `npm run test:full` は Phase A Completion Gate 時のみ (原則 1 回)。
> - 15〜20 分以上同一問題に詰まったら原因調査 (上位エージェント委任可) へ切り替える。

### A-02 Schema Drift Guard

- **目的**: ProjectModel top-level key ⇔ 公式 Schema properties の不整合を `test:fast` で検知する。
- **前提**: Phase A-00 確定 (schema-only key = `substructure` のみ / model-only = 0)。`additionalProperties:false` 維持。
- **変更候補ファイル**:
  - 新規: `frontend/src/persistence/schemaGuard.ts` (key 集合抽出の純関数)
  - 新規: `frontend/src/persistence/__tests__/schemaDriftGuard.test.ts` (FAST 分類)
- **新規/更新テスト候補**:
  - top-level key 集合比較。schema-only / model-only の両方向を検出。
  - schema-only allowlist (`substructure`) を明示し、それ以外の mismatch で fail。
- **実装内容**: `schemas/project.schema.json` を import し `properties` を列挙。ProjectModel の top-level key は**テスト側の手動列挙ではなく、`Record<keyof ProjectModel, true>` 等のコンパイル時完全列挙で導出**し、
  typecheck が網羅性を強制する形にする (新フィールド追加時に列挙の更新漏れが typecheck で検知される)。差分を報告するテストのみ (ajv 不要)。
- **やってはいけないこと**: `substructure` の不一致を型への追加で解消しない。allowlist を闇雲に増やさない。
  テスト側の手動 key 列挙で Guard を green のままにしない。Schema / types.ts を変更しない。
- **Completion Gate**: `npm run test:fast` で schemaDriftGuard.test.ts PASS / `npm run typecheck` PASS。
- **STOP 条件**: key 抽出に誤検知が生じる場合、15〜20 分ルールで原因調査へ。schema を変更して誤魔化さない。
- **次フェーズへの引継ぎ条件**: allowlist 契約 (`substructure` のみ) がコードと本計画 §5 に明記済み。

### A-03 Default Project Conformance

- **目的**: 標準生成 Project の公式 Schema 適合状況を確定し、Persistence 上の正常条件を定義する。
- **前提**: A-02 で key 集合契約済み。値レベルの適合を検証できる。
- **変更候補ファイル**:
  - 更新: `frontend/src/data/defaultProject.ts` (`createDefaultProject` の `analysisSettings` に `solver: "scipy_sparse"` を追加)
  - 新規: `frontend/src/persistence/__tests__/defaultProjectConformance.test.ts`
- **新規/更新テスト候補**:
  - `createDefaultProject` が公式 Schema 適合 (ajv)。
  - `createEmptyProject` は「非保存対象の runtime transient」として、既知の失敗要因
    (nodes/materials/sections/loadCases 空 + solver 欠落) を明示的にアサート (conscious exception)。
    予期しない新規不適合があれば fail。
- **実装内容**: ajv による公式 Schema validation (既存 `getProjectSchemaValidator` と同方式、
  `frontend/src/liner/headless/validateGeneratedLinerProject.ts:10` を参考)。
- **やってはいけないこと**: Schema の `minItems` / `solver` を緩めない。`createEmptyProject` に placeholder 項目を
  入れない。`createDefaultProject` 以外の挙動変更をしない。
- **Completion Gate**: defaultProjectConformance.test.ts PASS (default 適合 / empty は conscious exception)。
  `npm run test:fast` + `npm run typecheck` PASS。
- **STOP 条件**: `solver` 追加が解析系 test を壊す場合、影響範囲を確認して判断 (推測で追加変更しない)。
- **次フェーズへの引継ぎ条件**: 「save 対象となる standard Project は `createDefaultProject`」という正常条件が確定。

### A-04 Generic Persistence Roundtrip

- **目的**: 主経路 serialize→persisted→migrate→hydrate の成立性を generic に検証する。
- **前提**: A-02 / A-03 で key 契約と default conformance が確定。persisted 表現の Schema 適合を A-04 で実測し、
  ギャップがあれば serializer を Schema に合わせる (**Schema が persisted 形式の正本**)。
- **変更候補ファイル**:
  - 新規: `frontend/src/persistence/__tests__/genericProjectRoundtrip.test.ts`
  - 条件付き更新: `frontend/src/liner/adapters/linerProjectDraft.ts` / `frontend/src/apollo/unit2Draft.ts`
    (persisted 表現の Schema 不適合が検出された場合のみ、出力形状を Schema 準拠へ調整)
- **新規/更新テスト候補**:
  - `createDefaultProject` を serialize → JSON → migrate + hydrate し、①各 step が ok、②hydrate 後 Project が
    app 上成立、③persisted 表現が公式 Schema 適合、を保証。
  - sidecar (`apolloPhase1Unit2` / `apolloBsdd` / `apolloBridgeProjectSuperstructure` 等) を付与した Project でも成立。
  - **全フィールド同値のアサートは入れない** (意図的 non-identity)。
- **実装内容**: 既存 `serializeProjectForPersistence` / `hydrateProjectLinerFromPersistence` /
  `migrateProject` を利用。persisted 表現を ajv で検証。
- **やってはいけないこと**: 非恒等・正規化の性質を壊さない。恒等比較を導入しない。Schema を緩めない。
  serializer の意図 (RDD 埋め込み / domainDraft 除去) を変えない。
- **Completion Gate**: genericProjectRoundtrip.test.ts PASS (roundtrip 成立 + persisted 適合)。`npm run test:fast` + `npm run typecheck` PASS。
- **STOP 条件**: persisted 表現の不適合が serializer 形状起因で解消できない場合は設計判断 (上位へ)。
  15〜20 分ルール。
- **次フェーズへの引継ぎ条件**: persisted 表現の Schema 適合が実測・保証済み (A-05 の土台)。

### A-05 Validation Boundary

- **目的**: 主 Save / Load 経路に公式 Schema validation の境界を確定・実装する。
- **前提**: A-04 で persisted 表現が Schema 適合することが保証済み。
- **変更候補ファイル**:
  - 新規: `frontend/src/persistence/validatePersistedProject.ts` (ajv + 公式 Schema の共有 validator)
  - 新規: `frontend/src/persistence/__tests__/validatePersistedProject.test.ts`
  - 更新: `frontend/src/App.tsx` (`saveProject` の serialize 後 fail-closed / `hydrateProjectFromJsonText` の migrate 後 hydrate 前 fail-closed)
  - 更新: `frontend/src/App.linerSaveLoad.test.tsx` (非適合 save が拒否される / 非適合 load が構造化エラー)
- **新規/更新テスト候補**: validatePersistedProject 単体 (FAST) + Load 境界の pure helper 単体 (FAST) + App 経路の境界 test (`App.linerSaveLoad.test.tsx`, UI)。
- **実装内容**: **validation 境界は純関数として `frontend/src/persistence/` に実装する** — Save 用 `validatePersistedProject` (serialize 済み persisted 表現を公式 Schema で検証、NG なら構造化エラー) と
  Load 用 pure helper (`parse → migrateProject → Schema validation → hydrate` の順序を保証する関数) を分離し、**FAST test (`test:fast`) で検証する**。App.tsx の配線は最小限にする
  (`saveProject` / `hydrateProjectFromJsonText` の両分岐 — 通常 / apollo — から上記 helper を呼ぶ)。NG 時は既存の `PROJECT_OPEN_ERROR` フローで構造化エラー。
  既存の apollo import の独自 strict validation は維持し、公式 Schema validation で補強する (置換しない)。
- **やってはいけないこと**: Schema を緩めない。runtime 形式 (domainDraft 含む) を検証対象にしない。
  空 Project 保存の黙認を続けない。既存の apollo import/export の経路差を壊さない。
  境界ロジックを App.tsx 内部に閉じて FAST test 不能にしない。
- **Completion Gate**: 境界 test PASS + 既存 `App.linerSaveLoad.test.tsx` / `importExport.test.ts` の回帰なし。
  `npm run test:fast` + `npm run typecheck` + `npm run build` PASS。
- **STOP 条件**: 既存フロー (空 Project 保存含む) が fail-closed で壊れる場合、該当フローを列挙し
  「データを適合させる」or「明示的な例外として文書化」のどちらかで解決。黙認しない。
- **次フェーズへの引継ぎ条件**: 主 Save / Load の validation 境界が確定・実装済み。

### A-06 Exceptional Persistence Paths

- **目的**: substructure / workspace / artifactBundle / sidecar / apollo import 経路差 の扱いを契約化し、
  必要な Guard を追加する。
- **前提**: A-02〜A-05 で主経路契約が確定。例外経路との比較軸が明確。
- **変更候補ファイル**:
  - 新規: `frontend/src/persistence/__tests__/exceptionalPersistencePaths.test.ts`
  - 更新 (文書): 本計画 §5 / §4.1、必要なら [project-persistence-map.md](project-persistence-map.md) §12 の該当記述
- **新規/更新テスト候補**:
  - workspace roundtrip (unit2 のみ) の保証範囲 test。
  - artifactBundle 埋め込みが raw project であることの契約 test。
  - substructure 単独形式の roundtrip (既存 `adapterPersistence.test.ts` 流用) + 公式 `projectSubstructure` の
    main 経路未使用を regression でロック。
  - apollo import の version 事前必須 (経路差) の文書化・ロック。
- **実装内容**: 主にテスト追加と文書更新。各経路を「正式な例外」として明記。
- **やってはいけないこと**: 経路を無理に 1 つへ統合しない。substructure AdapterEnvelope を Schema 適合へ強制しない。
  workspace を full chain 化しない。artifactBundle の serializer 通過化をしない。
- **Completion Gate**: exceptionalPersistencePaths.test.ts PASS + 既存 workspace / adapterPersistence / importExport test 回帰なし。
  `npm run test:fast` + `npm run typecheck` PASS。
- **STOP 条件**: 例外経路の契約範囲が実装と食い違う場合、監査マップを更新して一致させる。
- **次フェーズへの引継ぎ条件**: 例外経路の扱いが本計画 §5 で契約済み。

### A-07 Migration Guard

- **目的**: schemaVersion 更新時の migration 実装漏れを検知する。
- **前提**: A-02〜A-06 完了。現行は `CURRENT_PROJECT_SCHEMA_VERSION = 1` のみ。
- **変更候補ファイル**:
  - 更新: `frontend/src/projectMigration.ts` (version dispatch の最小骨格)
  - 新規: `frontend/src/persistence/__tests__/migrationGuard.test.ts`
- **新規/更新テスト候補**:
  - migration registry の version 連続性 (CURRENT 増加時に各旧 version の migration エントリ必須)。
  - `migrateProject` が version 分岐を持ち、未知 / 非対応 version を拒否または明示報告すること。
- **実装内容**: 最小骨格の registry (例: `{ 1: (raw) => raw }`) と `CURRENT_PROJECT_SCHEMA_VERSION` の整合 guard。
  将来 version を増やす実装は行わない (v1 のみ)。**`schemaVersion` 欠落は legacy 基準 v1 として確定し、
  CURRENT まで順次 migration する契約とする**。CURRENT が 2 以上になった場合でも欠落データが最新版扱いに
  ならないことを test で保証する。
- **やってはいけないこと**: 無根拠な migration 互換性破壊をしない。存在しない v2 の変換を想定した過剰実装をしない。
- **Completion Gate**: migrationGuard.test.ts PASS + `projectMigration.test.ts` 回帰なし。
  `npm run test:fast` + `npm run typecheck` PASS。
- **STOP 条件**: version 増加時に何を migration すべきかが監査から確定できない場合は「未確定」として文書化
  (推測で確定しない)。
- **次フェーズへの引継ぎ条件**: migration 拡張機構と guard が確定。

### A-08 Gate Integration

- **目的**: Phase A の重要チェックが日常 Gate (`test:fast` = 現行 CI 対象) で実行されることを確認する。
- **前提**: A-02〜A-07 の Phase A test 群が FAST 分類 (`frontend/src/**/*.test.ts`, jsdom なし) に存在。
- **変更候補ファイル**: テスト配置の確認のみ。`.github/workflows/ci.yml` は変更しない。
- **新規/更新テスト候補**: なし (配置確認)。
- **実装内容**: 全 Phase A test が `npm run test:fast` に含まれること (境界ロジックは A-05 で純関数化済み)、
  CI 相当 (`test:fast` + `typecheck` + `build`) が green であることを確認。App.tsx 配線のみを検証する
  `App.linerSaveLoad.test.tsx` は `test:ui` で確認し、現行 CI 対象外であることを認識したうえで、
  境界の**実質ロジックは FAST test で検知される**ことを確認する。
- **やってはいけないこと**: CI へ full E2E / `test:ui` / backend test を追加しない
  (現行方針 [development-test-rules.md](development-test-rules.md) §H)。重い test を FAST へ入れない。
  境界ロジックを UI テストだけに閉じて FAST 検知を外さない。
- **Completion Gate**: `npm run test:fast` で Phase A test 全件 PASS + CI 相当 PASS。
- **STOP 条件**: なし (最終確認フェーズ)。
- **次フェーズへの引継ぎ条件**: Phase A Completion Gate の判定へ進める。

### A-09 Persistence Completion Gate (Wave 3 追加)

- **目的**: Wave 1/2 で成立した Persistence 安全柵を、日常 Gate で機械検知できる
  Completion 状態として確定し、Acceptance を文書化する。
- **前提**: A-02〜A-08 の全 Persistence test が `test:fast` (FAST 分類) に含まれる。
- **変更ファイル**: `frontend/src/apollo/sampleProjects.ts` (Apollo sample を公式 Schema へ是正)、
  `frontend/src/persistence/__tests__/validationBoundary.test.ts` (Apollo sample roundtrip test 追加)。
- **Acceptance**:
  - 正常: serialize → save validation → JSON → migrate → load validation → hydrate が成立 (A-04 roundtrip)。
  - legacy: schemaVersion 欠落 → v1 扱い → sequential migration → validation → hydrate (A-07 migrationGuard)。
  - invalid: fail-closed (A-05 validationBoundary)。
  - future version: fail-closed 拒否 (A-07 migrationGuard)。
  - exceptional paths: 契約通り別経路 (A-06 exceptionalPaths)。
  - Save/Close/Reopen: canonical data 消失なし (A-04 roundtrip + A-07 migration)。
  - Apollo: `createApollo200mContinuousBridgeSample` を公式 Schema へ是正済み。
    - materials/sections の 0 値 → 実数値 (elasticModulus=2.5e7 等)。
    - supports の追加プロパティ `id`/`label` を除去 (Schema は緩めない)。
    - Schema を広げる逃げをしない。暗黙例外を作らない。
- **Completion Gate**: 本 Acceptance を満たす test 一式 (persistence 全 test) が
  `npm run test:fast` で PASS。`npm run typecheck` PASS。
- **STOP 条件**: Apollo sample が公式 Schema に不適合のまま PASS としないこと。

---

## 8. Phase A 全体 Completion Gate

以下の全項目を機械判定で満たすことが Phase A 完了条件。

| # | Gate | 判定方法 | 担当 |
|---|---|---|---|
| G1 | `npm run test:fast` PASS | コマンド実行 | A-02〜A-08 全部 |
| G2 | `npm run typecheck` PASS | コマンド実行 | 全フェーズ |
| G3 | `npm run build` PASS | コマンド実行 | A-05 / 最終 |
| G4 | Schema Drift Guard PASS | A-02 test | A-02 |
| G5 | Default Project Conformance PASS | A-03 test | A-03 |
| G6 | Generic Persistence Roundtrip PASS | A-04 test | A-04 |
| G7 | Validation Boundary test PASS | A-05 test | A-05 |
| G8 | Exceptional Persistence Paths: **正式契約化済み かつ 対応する Guard/Test PASS** (文書化のみでの完結は不可) | A-06 test | A-06 |
| G9 | Migration Guard PASS | A-07 test | A-07 |
| G10 | Gate Integration 確認 (全 Phase A test — 境界ロジックは純関数化 — が `test:fast` に含まれる。App 配線は `test:ui` で確認) | A-08 | A-08 |
| G11 | 既存 test 回帰なし (`projectMigration` / `linerProjectDraft` / `App.linerSaveLoad` / `importExport` / `workspace` / `adapterPersistence` / `projectSchemaRegression` / `migrationIntegration`) | `npm run test:fast` + 該当 `test:ui` | 全フェーズ |
| G12 | Phase A で残した既知例外が文書化済み (本計画 §5 / §9 + [project-persistence-map.md](project-persistence-map.md)) | 文書確認 | A-06 / 最終 |
| G13 | 新規 ProjectModel フィールド追加時に更新漏れを自動検知できる (drift guard が G4 で green) | A-02 test | A-02 |
| G14 | site-context-prototype 統合開始を阻害する Persistence blocker がない | §9 の既知例外を確認 | 最終 |

**最終 Gate**: `npm run test:full` (= `test:fast` + `test:ui` + `test:3d` + `test:slow` + `test:electron` +
`test:regression` + `test:parity-cli`) + `npm run typecheck` + `npm run build`。原則 1 回のみ実行。

### 8.1 既存テストの再利用方針

- Phase A-00 付録A で確認された既存 test (`projectMigration` / `linerProjectDraft` / `importExport` /
  `projectSchemaRegression` / `migrationIntegration` / `workspace` / `adapterPersistence` / `persistence` /
  backend `test_project_schema.py` + `test_api.py`) を**主経路・例外経路の回帰基盤として再利用**する。
- Phase A で新規に追加する test は原則 `frontend/src/persistence/` 配下 (FAST 分類) に集中させ、
  既存 test の置換・弱体化はしない。

---

## 9. Phase A 後へ延期する項目 (既知例外として明記)

1. substructure データの ProjectModel (`project.json`) 埋め込み — 公式 Schema の optional `substructure`
   は現行 main 経路で未使用。統合時は schema と serializer を拡張する必要あり (A-06 で契約化のみ)。
2. substructure 実保存形式 (AdapterEnvelope) と公式 Schema の `projectSubstructure` の統一。
3. Apollo workspace の共通 full chain 化 (現行は unit2 のみ)。
4. artifactBundle の serializer 通過化 / ZIP 内 project.json の Schema 適合化。
5. 各 sidecar の schema 内部定義と TS 型の完全一致の全量検証 (未確定事項)。
6. backend `/api/projects/save|load` の公式 Schema validation と保存形式 (legacy project JSON) の正本化。
7. autosave (`AUTOSAVE_ENABLED=false`) の復旧 or 廃止の決定。
8. 主経路 saveProject の state 副作用 (`setProject(serializedProject)`, `App.tsx:787,794`) の見直し。
9. apollo import/export と通常ルートの経路差 (version 事前必須) の統一。
10. CI 拡張 (backend / `test:ui` / e2e を CI へ追加)。
11. Electron persistence IPC `resolveSafe` (`desktop/electron/projectPersistenceIpc.ts:18`) の
    `..` パストラバーサル対応 (独立したセキュリティ課題、追跡対象)。
12. `next/project` (zod Project) と ProjectModel の関係整理。

> 各項目とも、Phase A 終了時点で「既知例外として文書化されている」ことをもって Phase A 完了とする。
> 例外を黙って残すことはない。

---

## 10. 一気通貫実行時の運用ルール

以下は A-02〜最終 Gate を一気通貫で実装する際の固定ルール
([development-test-rules.md](development-test-rules.md) を踏襲)。

- main ブランチ上で直接作業。他 branch / worktree の作成・利用禁止。PR 用ブランチ禁止。
- 小さな作業単位ごとに commit / push (例: 各フェーズ完了、または 1 フェーズ内の論理単位)。
- 各フェーズで対象 test を**先に**実行し、失敗を確認してから実装 (red → green)。
- 毎回全 E2E / 全 test:full は回さない。変更種別に応じた Gate のみ (vitest-gates.md 参照)。
- milestone (Phase A 完了) 時にのみ `npm run test:full` を原則 1 回。
- assertion 弱体化禁止 / `skip`・`fixme`・`todo` 逃げ禁止。
- Schema を緩めて逃げない (`additionalProperties:false` 含む)。
- 無根拠な migration 互換性破壊禁止。
- 15〜20 分以上同一問題に詰まったら原因調査へ切り替え (上位エージェント委任可)。
- production bug の修正と test debt の解消を同じコミットに混ぜない。
- 開始前から存在した無関係差分 (例: `final_report.txt` の削除、未追跡レポート) を触らない。

---

## 11. site-context-prototype 統合開始条件

以下の**全て**が満たされた時のみ、site-context-prototype 統合フェーズへ進める。

1. Phase A Completion Gate (§8) の全項目 PASS。
2. Schema Drift Guard が稼働しており、新規 ProjectModel フィールド追加 → schema 更新漏れが自動検知される。
3. 主 Save が非適合出力を書かない (fail-closed が実装済み)。
4. 標準生成 Project の Persistence 正常条件 (createDefaultProject 適合 / createEmptyProject 非保存) が確定済み。
5. §9 の既知例外がすべて文書化済みで、site-context-prototype 統合を阻害する Persistence blocker がない。

---

## 12. 本計画の変更・更新方針

- 本計画は Phase A-01 で確定した内容を記録する。A-02 以降で実装中に契約の誤りが発覚した場合、
  本計画と [project-persistence-map.md](project-persistence-map.md) を同一作業単位で更新し、
  Sol レビューは 1 回のみ (計画確定時) とし、再レビューはしない。
- 監査結果にない事実を推測で確定しない。不明事項は「未確定」と明記する。

---

## 13. Sol レビュー結果と反映 (Phase A-01 最終確認)

Phase A-01 終了時に Codex CLI (GPT-5.6 Sol) による 1 回のレビューを実施した。
結果は「重大な欠陥あり」で、P0 1 件 / P1 4 件の指摘。**追加確認・計画修正を 1 回だけ実施**し、
再レビューは行わない。

| # | 分類 | 指摘 | 反映 |
|---|---|---|---|
| S1 | P0 | `schemaVersion` 欠落を `CURRENT_PROJECT_SCHEMA_VERSION` で埋める契約は、CURRENT が 2 以上になった際、未 version の旧データを最新版扱いにして migration を迂回する。欠落値を legacy 基準 version (現行 v1) として確定し、CURRENT まで順次 migration する契約・test へ修正 | §4 schemaVersion / migration 行、§5 #5、§7 A-07 へ反映 |
| S2 | P1 | A-02 の drift guard がテスト側の手動 key 列挙を許すと、型と列挙の同時更新漏れで guard が green のままになる。`Record<keyof ProjectModel, true>` 等でコンパイル時完全列挙を必須化 | §7 A-02 実装内容へ反映 |
| S3 | P1 | Apollo 画面の Save / Load は通常経路と別分岐だが、公式 Schema validation が「追加検討/例外」のままだと F4 を満たさず完了できる。通常・Apollo 両分岐の書込み直前 / hydrate 前の公式 Schema validation と fail-closed test を A-05 必須条件へ | §3 F4、§4 import/export 行、§5 #4、§7 A-05 へ反映 |
| S4 | P1 | `App.linerSaveLoad.test.tsx` は UI Gate 対象で、A-08 が「全 Phase A test が test:fast 対象」だと現行 CI で App 境界の回帰が日常検知されない。境界処理を純関数へ抽出して FAST テスト化 | §3 F7、§7 A-05 / A-08、§8 G10 へ反映 |
| S5 | P1 | G8 が「test PASS **または** 正式契約化」だと文書化だけで Guard/Test を迂回できる。契約化 **かつ** Guard/Test PASS に修正 | §8 G8 へ反映 |

> 検証メモ: Sol はレビュー時に `npm run test:fast` の 7 件失敗 (Apollo hygiene/parity 系) を報告したが、
> Phase A-01 側で同一ツリーに対し `npm run test:fast` を再実行した結果は **425 files / 3164 tests 全 PASS**
> であり、再現しなかった (環境差または一時的なものと判断)。`npm run typecheck` は PASS。
