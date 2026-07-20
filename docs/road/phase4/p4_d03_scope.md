# P4-D03 Scope — HAUNCH Equivalent

**Date:** 2026-07-21  
**Status:** AUTHORITATIVE — SCOPE APPROVED

**Extraction record (D03-C01):** [p4_d03_haunch_extraction_record.md](p4_d03_haunch_extraction_record.md) — **APPROVED** (2026-07-21, supervisor freezes S3/S6/S9/S14/S15/S16/S17)

**Authoritative parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)  
**Execution plan:** [phase4_d03_to_final_execution_plan.md](phase4_d03_to_final_execution_plan.md)  
**Pattern reference:** [p4_d02_scope.md](p4_d02_scope.md) (P4-D02 frozen decisions N1–N3)  
**P4-D01 baseline:** `061ccfc` — multi-alignment COMPLETE  
**P4-D02 baseline:** `2e2931f` — LDIST COMPLETE (`frontend/src/liner/core/ldist/**`)

---

## 1. D-step ID と正式名称

| 項目 | 値 |
| --- | --- |
| **D-step ID** | **P4-D03** |
| **正式名称** | **HAUNCH Equivalent**（ハンチ相当計算） |

Phase 4 正式名称 **Road Advanced Calculation & Utilities** の第 3 実装ステップ。JIP-LINER の **HAUNCH** モジュール（マニュアル **§6**）に相当するハンチ定義・領域計算を `RoadDesignDocument` 上で再現する。

| 正本ラベル | 意味 |
| --- | --- |
| P4-D01 | Multiple Alignment and Line Management（前提完了） |
| P4-D02 | LDIST Equivalent（パターン参照；数値依存なし） |
| **P4-D03** | **HAUNCH Equivalent（本スコープ）** |
| P4-D04 | HOSO Equivalent（本スコープ外） |
| P4-D05 | Review Diagrams and Utilities UI（HAUNCH 図面注記は任意） |
| P4-D06 | Reports and CSV（フル帳票 UI は D06；D03 は export hooks / 列仕様まで） |
| P4-D07 | Persistence / Legacy / Migration（legacy 統合・extension key 裁定は D07） |
| P4-D08 | E2E and Final Verification（P4-E2E-03 最終ゲート） |

---

## 2. 目的

P4-D01 で確立した **複数 alignment・active alignment・安定 line ID** を前提に、JIP-LINER **§6** の意味論に沿った **ハンチ領域定義** と **派生標高・厚さ** を測点（station）ごとに計算し、診断・保存・export hooks まで提供する。

成功基準（正本）:

- 純粋・決定論的 HAUNCH 計算モジュール（`algorithmVersion` 付き）
- RDD 経由の入力永続化（`haunchCapability.state: "supported"`）
- **4 タイプファミリ必須:** 2-point / 3-point / plane / range
- Stage 8 **R8-13** + **O1** 手計算ベースライン（**ファミリごと ≥1、計 ≥4 シナリオ**）
- `haunch_results.csv` / report `haunchResults` 列仕様（pure builder + unit test で D03-C06；ダウンロード UI は D06）
- fail-closed 診断（無効参照・非互換範囲重複・禁止負厚のサイレント省略禁止）

**数式・幾何定義:** JIP §6 本文の公式は [p4_d03_haunch_extraction_record.md](p4_d03_haunch_extraction_record.md) で抽出・監督承認済み（**D03-C01 充足**）。§5 O1 補完と凍結 S3/S6/S9/S14/S15/S16/S17 に従う。

---

## 3. 対象（In scope）

### 3.1 計算タイプファミリ（4 種必須）

| ファミリ | 概要 | 主な出力キー |
| --- | --- | --- |
| **Two-point haunch** | 2 点（測点/標高アンカー）で定義されるハンチ | `haunchTopElevationM`, `haunchThicknessM`, `side` |
| **Three-point haunch** | 3 点定義による測点/標高平面上のハンチ | 同上 |
| **Plane haunch** | 領域上の平面ハンチ面 | 同上 |
| **Range haunch** | 測点範囲と境界ルールによるハンチ領域 | 同上 |

各ファミリは R8-13 の境界測点行・内部測点行をカバーする O1 ベースラインを持つ（D03-C03）。

### 3.2 入力ソース（既存パイプライン）

| 入力 | 所在 | 用途 |
| --- | --- | --- |
| Active alignment | `domainDraft.activeAlignmentId` / RDD `alignments[]` | 計算スコープのデフォルト |
| Vertical profile | `buildIntermediateResult` → profile samples | 標高データム；station ごとの deck/profile 参照 |
| Cross-section / deck refs | `CrossSectionTemplateDraft`, offset lines | 任意；deck 文脈参照 |
| Stations | `stations.entries` または定義の station 範囲 | サンプリング位置 |
| HAUNCH 定義 | geometry extension `domainDraft.haunchDefinitions[]` | 永続化されるユーザー意図 |

### 3.3 永続化・契約（D02 パターン踏襲）

| 項目 | 方針 |
| --- | --- |
| Write target | `project.liner.roadDesignDocument` のみ |
| `haunchCapability` | 定義存在時 `state: "supported"`；未定義時 `absent` |
| `haunchDefinitions[]` | `spacer.liner/domain-draft-vnext-geometry` payload **v0.2.0** の `domainDraft` 配下（sibling フィールド）。**専用 extension key は今回採用しない**（P4-D07 候補として保留） |
| `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` | **0.1.0 維持（bump 禁止）** |
| `payloadVersion` | geometry extension **v0.2.0** 維持（D02 と同パターン）。payload minor bump は D07 で再検討可 |
| 計算結果 | **再計算のみ**（extension / RDD へのキャッシュ永続化しない） |

### 3.4 UI

- Setup `/pro/liner/setup` の **utilities tab**（D02 既設）に HAUNCH 定義エディタ + 結果テーブル + 診断パネルを追加
- 定義の追加/編集/削除；タイプファミリ選択；station 範囲・点参照・side 指定
- bridge/deck 文脈からのリンクは任意（BridgeDefinition 書き換えはしない）
- **Review tab（Bridge Layout）は変更しない**

### 3.5 Export hooks（D03 範囲）

| 項目 | 値 |
| --- | --- |
| Report section key | `haunchResults` |
| CSV file | `haunch_results.csv` |
| 列キー | `definitionId`, `type`, `stationPhysicalDistance`, `haunchTopElevationM`, `haunchThicknessM`, `side` |
| **D03-C06** | pure CSV/report builder + unit test で充足。**ダウンロードボタン UI は P4-D06** |

### 3.6 検証

- Stage 8 **R8-13** + O1（ファミリごと ≥1、計 ≥4 fixtures）
- 許容差: [`numerical_accuracy.md`](../design/numerical_accuracy.md) + R8-13 **COMBINED** elevation register
- Vitest: calculator per-family、mapper round-trip、invalid ref fail-closed、export builder
- UI 表示: D03-C06；save/reload E2E 最終: P4-D08 / P4-E2E-03

---

## 4. 非対象（Out of scope）

| 項目 | 理由 / 担当ステップ |
| --- | --- |
| HOSO / 舗装厚計算 | P4-D04（JIP §7） |
| 確認図・寸法線描画の本実装 | P4-D05（JIP §8） |
| HAUNCH 図面オーバーレイ | P4-D05（D05-C07 N/A  unless supervisor amendment） |
| CSV/HTML **ダウンロード UI** | P4-D06 |
| 専用 extension key（`haunch` 独立 key） | P4-D07 候補（今回不採用） |
| Legacy migration 最終統合・idempotent migration registry 拡張 | P4-D07 |
| Playwright 最終ゲート一式 | P4-D08 |
| `DrawingDocument` / `domainDraft` canonical write | 凍結ポリシー違反 |
| FEM / Frame 連携 / BridgeDefinition 再実装 | Road scope 外 |
| TOOL / branch-merge / widening / per-line height | deferred |
| JIP `.lin`, LS1/LS2, 帳票ビューワ | 記録のみ無視；RDD export に置換 |
| 結果キャッシュ永続化 | 禁止（正本 recompute policy） |
| 未承認 extraction による numeric COMPLETE | D03-C01/C03 BLOCKER |
| **P4-D02 Mode B 厳密 JIP 互換への拡張** | D02 N1 凍結；監督 scope amendment なしに拡張禁止 |
| PDF §6 公式の詳細抽出 | **次 STEP B**（本スコープ外） |
| 実装計画の詳細 | **次 STEP C**（本スコープ外） |

---

## 5. 入力

| 入力 | ソース | 検証 |
| --- | --- | --- |
| `haunchDefinitions[]` | geometry extension v0.2.0 `domainDraft` | 安定 `id`、`type` enum、station 範囲、点参照、`side` |
| Active alignment | P4-D01 | 必須；`alignmentId` スコープ |
| Vertical profile | pipeline intermediate | 標高データム一貫性 |
| Cross-section / deck refs | 任意 | 欠落参照 → fail-closed |
| Station list / range | 定義内 station scope | alignment 範囲内 |

---

## 6. 出力

| フィールド | 単位 | 備考 |
| --- | --- | --- |
| `definitionId` | string | 安定 ID |
| `type` | enum | 2-point / 3-point / plane / range |
| `stationPhysicalDistance` | m | 物理測点 |
| `displayedStation` | — | 表示測点（pipeline 規約） |
| `haunchTopElevationM` | m | ハンチ上面標高 |
| `haunchThicknessM` | m | 該当時のみ |
| `side` / `sign` | enum | extraction record で確定（捏造禁止） |
| `sourceRevision` | string | パイプライン由来 |
| `algorithmVersion` | string | 例: `haunch-0.1.0`（初版；extraction 後確定） |

**永続化:** 出力行はメモリ上のみ。reload 後は入力 + `algorithmVersion` から再計算。

---

## 7. データ構造

### 7.1 RDD 表面

```typescript
haunchCapability?: { state: "absent" | "supported" };
```

現状: mapper は `haunchCapability: { state: "absent" }` stub（`linerDomainDraftRoadDesignMapper.ts`）。

### 7.2 Extension placement（D02 パターン）

| 項目 | 配置 |
| --- | --- |
| Extension key | `spacer.liner/domain-draft-vnext-geometry` |
| `payloadVersion` | `0.2.0`（`LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2`） |
| 入力配列 | `domainDraft.haunchDefinitions[]`（sibling to `ldistJobs[]`, `alignments[]` 等） |
| RDD `schemaVersion` | `0.1.0` 維持 |
| 専用 key | **不採用**（D07 再検討） |

### 7.3 `haunchDefinitions[]`（設計案 — 実装型は STEP C で確定）

```typescript
type HaunchTypeFamily =
  | "two_point"
  | "three_point"
  | "plane"
  | "range";

interface HaunchDefinitionDraft {
  id: string;                    // stable ID; stableIdRegistry / deriveStableUuid 規約
  alignmentId: string;
  type: HaunchTypeFamily;
  label?: string;
  stationRange: { fromM: number; toM: number };
  side?: "left" | "right" | "both";  // 凍結 S6 — extraction record §11
  // type-specific anchors (station/elevation points, plane coeffs, range boundaries)
  anchors?: HaunchAnchorDraft[];
  // optional deck/cross-section refs
  deckRefId?: string;
}
```

**注:** フィールド詳細・enum 値・type-specific 形状は [p4_d03_haunch_extraction_record.md](p4_d03_haunch_extraction_record.md) §11 監督凍結に従う。

### 7.4 計算結果（非永続化）

```typescript
interface HaunchResultRow {
  definitionId: string;
  type: HaunchTypeFamily;
  stationPhysicalDistance: number;
  displayedStation: number;
  haunchTopElevationM: number;
  haunchThicknessM?: number;
  side?: string;
  sourceRevision: string;
  algorithmVersion: string;
}
```

---

## 8. UI

| 領域 | 決定 |
| --- | --- |
| 配置 | Setup **utilities tab**（D02 `LdistJobEditor` と共存） |
| 定義一覧 | 追加/編集/削除；4 タイプファミリ |
| 入力 | station 範囲、点参照、side、任意 deck 文脈 |
| 結果 | テーブル + 診断（メモリ上；保存しない） |
| 非配置 | Review tab、CSV ダウンロードボタン（D06） |
| i18n | `LINER_HAUNCH_*` 診断 messageKey |

---

## 9. 計算責務

| 責務 | 方針 |
| --- | --- |
| **Pure calculator** | `frontend/src/liner/core/haunch/`（新規）；UI / mapper から分離 |
| **`algorithmVersion`** | 定数エクスポート（D02 `LDIST_ALGORITHM_VERSION` パターン） |
| **Recompute** | load 後毎回 `buildIntermediateResult` + calculator；結果キャッシュ禁止 |
| **Pipeline hook** | `pipeline.ts` から optional passthrough（D02 パターン） |
| **診断** | `LINER_HAUNCH_*` 安定コード；error-level 時は該当行を省略せず診断 emit |

### 9.1 計算フロー（概略）

```text
1. Hydrate domainDraft.haunchDefinitions[] from geometry extension v0.2.0
2. Validate definition refs (alignment, anchors, station range, optional deck refs)
3. buildIntermediateResult(alignment bundle) → profile, stations, cross-section samples
4. For each definition × station (per scope):
   a. Resolve elevation datum from profile pipeline at station
   b. Apply type-family logic per §6 extraction record (STEP B)
   c. Emit haunchTopElevationM, haunchThicknessM, side/sign
5. Emit rows + LINER_HAUNCH_* diagnostics (no silent skip)
6. Pure export builder → haunchResults / haunch_results.csv (unit tested)
```

---

## 10. 保存責務

| 項目 | 方針 |
| --- | --- |
| Write target | `project.liner.roadDesignDocument` のみ |
| Mapper | `domainDraftToRoadDesignDocument` / `roadDesignDocumentToDomainDraft` で `haunchDefinitions` + `haunchCapability` round-trip |
| Strip | persist 時 `domainDraft` / `drawingDocument` を JSON から除去（既存パターン） |
| 結果 | **RDD / extension に書かない**（no result cache） |
| Capability | 定義 ≥1 → `haunchCapability.state: "supported"` |

---

## 11. Hydrate / migration（D03 境界 vs D07）

| ケース | D03 責務 | D07 責務 |
| --- | --- | --- |
| haunch なし既存プロジェクト | `haunchCapability: absent`；hydrate 可 | — |
| 初回定義保存 | `haunchDefinitions` 追加；capability → `supported` | — |
| geometry extension v0.1.0 → v0.2.0 | D01/D02 既存 migration 経路を利用 | 追加 step が必要なら D07 |
| Legacy pre-P4 プロジェクト | 読み込み可能（定義なし） | `legacyRoadAdapter` + migration registry |
| 専用 extension key 採用 | **決定しない**（D02 同様 geometry sibling） | 監督裁定・registry step |
| 結果キャッシュ | **書かない** | 禁止維持 |
| `schemaVersion` bump | **禁止** | 別承認 artifact なしに不可 |

---

## 12. Validation

| 条件 | 期待動作 |
| --- | --- |
| 未知 alignment / line / deck ref | error diagnostic；該当行 numeric なし |
| station 範囲外 | error |
| 非互換範囲の重複 | error（正本 abnormal conditions） |
| マニュアルが禁止する負の厚さ | error（R8-14 型 rejection パターン参照） |
| profile 不在 at station | error |
| 退化幾何（共線点等） | extraction record 確定後に warning/error 裁定 |

---

## 13. Fail-closed

| 状況 | 動作 |
| --- | --- |
| 無効参照 | 診断 emit；サイレント行省略禁止 |
| error-level diagnostics 存在時 export | ブロック（`hasHaunchErrors` パターン；D02 `hasLdistErrors` 同等） |
| 未抽出 formula での numeric claim | COMPLETE 禁止；dev build で `Extraction Required` 診断可 |
| 曖昧 legacy 入力 | D07 まで quarantine；D03 では新規入力のみ |
| 地盤/profile 捏造 | 禁止；profile unavailable → error |

---

## 14. Stable ID

| ルール | 要件 |
| --- | --- |
| 新規 `haunchDefinitions[].id` | `stableIdRegistry` / `deriveStableUuid`（Phase 3 bridge layout 同パターン） |
| 既存 Phase 0–3 ID | alignment / profile / cross-section / line ID は変更禁止 |
| Cross-alignment | 定義は `alignmentId` で名前空間分離；他 alignment 参照禁止 |
| 参照 | calculator / export は ID のみ；persisted JSON で array index 依存禁止 |
| Migration | サイレント ID 再生成禁止（D07 `MigrationIdMapping`） |

---

## 15. Schema / payload version

| バージョン | 方針 |
| --- | --- |
| `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` | **0.1.0 維持（bump 禁止）** |
| Geometry extension `payloadVersion` | **0.2.0**（D02 確立済み）。HAUNCH 入力は sibling 追加のみ |
| Payload minor bump | D07 で再検討可（専用 key 分割時など） |
| `algorithmVersion` | calculator 内定数；formula 変更時のみ increment |

---

## 16. 先行 D-step との接続

### 16.1 P4-D01（IDs・alignment）

| 資産 | パス | HAUNCH 接続 |
| --- | --- | --- |
| Multi-alignment | `schema/types.ts` | `haunchDefinitions[].alignmentId` スコープ |
| Active alignment | `domainDraft.activeAlignmentId` | デフォルト計算スコープ |
| Mapper | `linerDomainDraftRoadDesignMapper.ts` | `haunchCapability: absent` stub → D03 で read/write |
| Geometry extension v0.2.0 | `LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2` | `haunchDefinitions[]` 拡張先 |
| E2E | `p4-d01-multi-alignment.spec.ts` | save/load パターン再利用 |

### 16.2 P4-D02（パターンのみ — 数値依存なし）

| パターン | D02 実装 | D03 踏襲 |
| --- | --- | --- |
| Pure calculator | `core/ldist/` | `core/haunch/` mirror |
| Validation | `validateLdistJobs.ts` | `validateHaunchDefinitions.ts` |
| Diagnostics | `LINER_LDIST_*` | `LINER_HAUNCH_*` |
| Export builder | `exports/ldistReportExport.ts` | `exports/haunchReportExport.ts` |
| UI tab | utilities tab + `LdistJobEditor` | 同 tab に HAUNCH パネル追加 |
| Capability flip | `ldistCapability` supported when jobs | `haunchCapability` supported when definitions |
| Mode B 凍結 | N1: `sin(θ_ref)` MVP | **拡張禁止**（監督 amendment なし） |

---

## 17. 後続 D-step との境界

| 後続 | 境界 |
| --- | --- |
| **P4-D04 HOSO** | 舗装厚・`hosoDefinitions` / `hosoCapability`；HAUNCH 計算に依存しない（並列可） |
| **P4-D05 diagrams** | 確認図強化；HAUNCH オーバーレイは D05-C07 **N/A**（監督 amendment まで） |
| **P4-D06 export UI** | `haunch_results.csv` / `haunchResults` の **ダウンロード UI** と HTML 帳票統合 |
| **P4-D07 migration** | legacy read-old、専用 extension key 裁定、idempotent migration steps、D02 保留分の統合 |
| **P4-D08 E2E** | P4-E2E-03 HAUNCH/HOSO save/reload；最終 quality gate；extraction sign-off（D08-C05） |

---

## 18. 実装予定領域（概略 — mirror 方針）

D02 `core/ldist/` 構成を mirror する（**本 STEP ではコード変更なし**）。

| 領域 | パス（予定） | 根拠（ldist 既存） |
| --- | --- | --- |
| Types / contracts | `frontend/src/liner/schema/types.ts` | `LdistJobDraft` 同様 |
| Pure calculator | `frontend/src/liner/core/haunch/` | `computeLdistResults.ts`, `types.ts`, `diagnostics.ts`, `validate*.ts`, `index.ts` |
| Per-family compute | `core/haunch/computeTwoPoint.ts` 等 | `computeGridDistance.ts`, `computeOverhang.ts` |
| Pipeline hook | `frontend/src/liner/core/pipeline/pipeline.ts` | `ldistJobs` optional passthrough 既存 |
| Mapper | `frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.ts` | `ldistJobs` + `ldistCapability` 既存 |
| UI adapter | `frontend/src/liner/adapters/linerUiAdapter.ts` | `updateLdistJobs` 系 CRUD |
| UI components | `frontend/src/liner/components/Haunch*.tsx` | `LdistJobEditor.tsx`, `LdistResultsPanel.tsx` |
| Utilities tab | `frontend/src/liner/pages/LinerEditPage.tsx` | utilities tab 既設 |
| Export builder | `frontend/src/liner/exports/haunchReportExport.ts` | `ldistReportExport.ts` |
| Extraction doc | `docs/road/phase4/p4_d03_haunch_extraction_record.md` | D03-C01（STEP B） |
| Fixtures | `core/haunch/__tests__/fixtures/` | `gc-ldist-*` パターン |

---

## 19. Completion gate（D03-C01..C06）

| ID | 達成定義 | 必須証跡 | 必須テスト | 失敗条件 | N/A |
| --- | --- | --- | --- | --- | --- |
| **D03-C01** | §6 formula extraction record committed（監督承認） | [p4_d03_haunch_extraction_record.md](p4_d03_haunch_extraction_record.md) | Supervisor approval | 未承認 extraction で実装 | — |
| **D03-C02** | Four type families implemented（2-point, 3-point, plane, range） | Source + test file list | Per-family unit tests | いずれかファミリ欠落 | — |
| **D03-C03** | O1 baseline per family（≥4）pass R8-13 | Fixture paths per family | Vitest per family | いずれか oracle 失敗 | — |
| **D03-C04** | RDD round-trip for `haunchDefinitions` | Mapper test output | `linerDomainDraftRoadDesignMapper.test.ts` | Definitions lost | — |
| **D03-C05** | `haunchCapability.state: "supported"` when definitions exist | RDD sample | Validation test | Wrong state | — |
| **D03-C06** | UI + `haunch_results.csv` / report section | Export samples | Export Vitest | Missing UI or export | — |

**Step BLOCKER:** ~~**D03-C01**（extraction 未承認）~~ **D03-C01 充足**（2026-07-21）。残 BLOCKER: **D03-C03**（いずれかファミリの O1 欠落）— いずれかの released family で numeric COMPLETE 禁止。

---

## 20. BLOCKER 条件

| ID | 条件 | 参照 |
| --- | --- | --- |
| B-D03-01 | ~~§6 extraction record 未作成または未承認~~ **D03-C01 充足**（extraction APPROVED 2026-07-21） | D03-C01；planning freeze S2 |
| B-D03-02 | 4 ファミリのいずれか未実装 | D03-C02 |
| B-D03-03 | いずれかファミリの O1 baseline 失敗 | D03-C03 |
| B-D03-04 | `haunchDefinitions` mapper round-trip 失敗 | D03-C04 |
| B-D03-05 | `schemaVersion` 0.1.0 以外への bump（別承認なし） | planning freeze S1 |
| B-D03-06 | Phase 0–3 回帰（golden, E2E, RDD） | planning freeze S3 |

---

## 21. 既知制約

| # | 制約 |
| --- | --- |
| K1 | **GitHub checks 未設定** — 検証証跡は **「local validation only」** と記載。**「CI PASS」禁止** |
| K2 | **P4-D02 Mode B** は alignment azimuth ベース MVP（N1 凍結）。HAUNCH 実装がきっかけで LDIST Mode B を厳密 JIP 互換へ拡張しない |
| K3 | **公式数式** — [p4_d03_haunch_extraction_record.md](p4_d03_haunch_extraction_record.md) **APPROVED**（D03-C01 充足）。実装は §5 O1 + §11 凍結に従う |
| K4 | **Four type families 必須** — 2-point, 3-point, plane, range のいずれも省略不可（D03-C02） |
| K5 | **`ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` = 0.1.0** — bump は別承認 artifact 必須 |
| K6 | **結果キャッシュ永続化禁止** — reload 後 recompute のみ |
| K7 | **parityCli `.tmp` artifacts** — P4 回帰と混同しない（execution plan 記載） |

---

## 22. 監督判断が必要な点

| # | 項目 | 現状 | 影響 | 推奨デフォルト |
| --- | --- | --- | --- | --- |
| S1 | §6 PDF → extraction record | **APPROVED** — [p4_d03_haunch_extraction_record.md](p4_d03_haunch_extraction_record.md) | D03-C01 充足 | — |
| S2 | §6 印刷頁範囲 | extraction record §2 に記録済み | — | — |
| S3 | Elevation datum vs profile pipeline | **凍結** — extraction §11 S3 | O1 幾何の一意性 | `buildIntermediateResult` profile elevation |
| S4 | Extension key 分割 | planning freeze open item #2 | D07 | geometry extension v0.2.0 sibling（D02 同様） |
| S5 | utilities tab 内 HAUNCH 配置 | 未凍結（sub-panel vs 同一スクロール） | UI UX | D02 LDIST 直下に HAUNCH セクション（同一 tab） |
| S6 | `side` / `sign` enum 詳細 | **凍結** — extraction §11 S6 | CSV 列・診断 | `left` \| `right` \| `both` optional |
| S7 | D05-C07 diagram overlays at D08 | N/A unless amended | D08 要件 | 現状 N/A 維持 |
| S8 | 本スコープ文書の `P4_D03_SCOPE_VERDICT` | **SCOPE APPROVED**（AUTHORITATIVE） | STEP C 着手可 | 監督レビュー完了 |

---

## 23. JIP-LINER 仕様対応（参照のみ — 抽出は STEP B）

| ソース | 節 | 用途 |
| --- | --- | --- |
| JIP-LINER manual | **§6**（execution plan: print **125+**） | Semantic authority — haunch regions, types, elevations |
| [stage8_verification_plan.md](../../planning/stage6-10/stage8_verification_plan.md) | **R8-13** | 2/3-point/plane/range；COMBINED elevation register |
| [numerical_accuracy.md](../design/numerical_accuracy.md) | — | 長さ・標高許容差 |
| [p4_d02_scope.md](p4_d02_scope.md) §6.3 | §7 → D04, §8 → D05 | 境界参照 |

**本 STEP A では PDF 本文の転記・公式抽出は行わない。** 正本は [p4_d03_haunch_extraction_record.md](p4_d03_haunch_extraction_record.md)（APPROVED 2026-07-21）。

---

## 24. Repository 現況（調査時点 2026-07-21）

| 項目 | 値 |
| --- | --- |
| Branch | `main` |
| HEAD | `2e2931f` = `origin/main`（P4-D02 COMPLETE） |
| `haunchCapability` | stub `absent`（mapper のみ） |
| `haunchDefinitions` | **未実装** |
| `core/haunch/` | **不存在** |
| LDIST mirror 参照 | `frontend/src/liner/core/ldist/`（15 files） |
| Utilities tab | `LinerEditPage.tsx` — LDIST のみ |

---

## 25. 改訂履歴

| Date | Change |
| --- | --- |
| 2026-07-21 | 初版 PROPOSED（STEP A — 正式スコープ抽出のみ） |
| 2026-07-21 | SCOPE APPROVED（AUTHORITATIVE）；extraction record APPROVED リンク・D03-C01 充足を反映 |

---

## 26. スコープ判定（作業員提案）

| 項目 | 提案 |
| --- | --- |
| **Verdict** | **`P4_D03_SCOPE_VERDICT: APPROVED`**（AUTHORITATIVE） |
| **理由** | 正本 3 点セット + execution plan + D02 パターンから必須項目を抽出済み。4 ファミリ・永続化・fail-closed・D03-C01..C06・後続境界を明文化。未決事項は §22 に隔離し BLOCKER（extraction）を明示。実装/code 変更は本 STEP 対象外。 |
| **NOGO 条件** | 監督が §22 S1/S3/S5 を本稿で凍結できない場合、または 4 ファミリ縮小を要求する場合 |
