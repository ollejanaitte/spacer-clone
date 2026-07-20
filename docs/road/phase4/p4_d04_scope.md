# P4-D04 Scope — HOSO Equivalent

**Date:** 2026-07-21  
**Status:** AUTHORITATIVE — `P4_D04_SCOPE_VERDICT: APPROVED` (2026-07-21)

**Extraction record (D04-C01):** `p4_d04_hoso_extraction_record.md` — **APPROVED** (STEP B complete)

**Authoritative parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)  
**Execution plan:** [phase4_d03_to_final_execution_plan.md](phase4_d03_to_final_execution_plan.md)  
**Pattern reference:** [p4_d03_scope.md](p4_d03_scope.md) (P4-D03 frozen pattern), [p4_d02_scope.md](p4_d02_scope.md) (P4-D02 N1–N3)  
**P4-D01 baseline:** `061ccfc` — multi-alignment COMPLETE  
**P4-D02 baseline:** `2e2931f` — LDIST COMPLETE (`frontend/src/liner/core/ldist/**`)  
**P4-D03 baseline:** `ee067d8` — HAUNCH COMPLETE (`frontend/src/liner/core/haunch/**`)

---

## 1. D-step ID と正式名称

| 項目 | 値 |
| --- | --- |
| **D-step ID** | **P4-D04** |
| **正式名称** | **HOSO Equivalent**（舗装厚相当計算） |

Phase 4 正式名称 **Road Advanced Calculation & Utilities** の第 4 実装ステップ。JIP-LINER の **HOSO** モジュール（マニュアル **§7**）に相当する舗装厚定義・領域計算を `RoadDesignDocument` 上で再現する。

| 正本ラベル | 意味 |
| --- | --- |
| P4-D01 | Multiple Alignment and Line Management（前提完了） |
| P4-D02 | LDIST Equivalent（パターン参照；数値依存なし） |
| P4-D03 | HAUNCH Equivalent（パターン参照；数値依存なし） |
| **P4-D04** | **HOSO Equivalent（本スコープ）** |
| P4-D05 | Review Diagrams and Utilities UI（HOSO 図面注記は任意） |
| P4-D06 | Reports and CSV（フル帳票 UI は D06；D04 は export hooks / 列仕様まで） |
| P4-D07 | Persistence / Legacy / Migration（legacy 統合・extension key 裁定は D07） |
| P4-D08 | E2E and Final Verification（P4-E2E-03 最終ゲート） |

---

## 2. 目的

P4-D01 で確立した **複数 alignment・active alignment・安定 line ID** を前提に、JIP-LINER **§7** の意味論に沿った **舗装厚定義** と **派生厚さ・標高** を測点（station）および横断 offset ごとに計算し、診断・保存・export hooks まで提供する。

成功基準（正本）:

- 純粋・決定論的 HOSO 計算モジュール（`algorithmVersion` 付き）
- RDD 経由の入力永続化（`hosoCapability.state: "supported"`）
- **5 タイプファミリ必須:** auto / longitudinal / transverse / two-point / three-point
- Stage 8 **R8-14** + **O1** 手計算ベースライン（**ファミリごと ≥1、計 ≥5 シナリオ**）
- `hoso_results.csv` / report `hosoResults` 列仕様（pure builder + unit test で D04-C06；ダウンロード UI は D06）
- fail-closed 診断（無効参照・負厚さ拒否・禁止サイレント省略）
- **負の厚さ拒否**（D04-C04；R8-14 negative rejection）

**数式・幾何定義:** JIP §7 本文の公式は `p4_d04_hoso_extraction_record.md`（STEP B）で抽出・監督承認が必要（**D04-C01 BLOCKER**）。本 STEP A では転記しない。

---

## 3. 対象（In scope）

### 3.1 計算タイプファミリ（5 種必須）

| ファミリ | 概要 | 主な出力キー |
| --- | --- | --- |
| **Auto thickness** | 道路モデル入力からルール駆動で厚さを決定 | `pavementThicknessM`, `pavementElevationM` |
| **Longitudinal** | 測点方向に変化する厚さ定義 | 同上 + `stationPhysicalDistance` |
| **Transverse** | 横断 offset 方向に変化する厚さ定義 | 同上 + `offsetM` |
| **Two-point** | 2 点（測点/offset/厚さアンカー）で定義される厚さ場 | 同上 |
| **Three-point** | 3 点定義による測点×offset 平面上の厚さ場 | 同上 |

各ファミリは R8-14 の境界測点行・内部サンプル行をカバーする O1 ベースラインを持つ（D04-C03）。

### 3.2 入力ソース（既存パイプライン）

| 入力 | 所在 | 用途 |
| --- | --- | --- |
| Active alignment | `domainDraft.activeAlignmentId` / RDD `alignments[]` | 計算スコープのデフォルト |
| Vertical profile | `buildIntermediateResult` → profile samples | 標高データム；`pavementElevationM` 参照 |
| Crossfall | `crossfallResolution.ts` / pipeline cross-section samples | 横断勾配；transverse / offset サンプル |
| Cross-section / deck refs | `CrossSectionTemplateDraft`, offset lines | 横断文脈・offset 基準 |
| Stations | `stations.entries` または定義の station 範囲 | サンプリング位置 |
| HOSO 定義 | geometry extension `domainDraft.hosoDefinitions[]` | 永続化されるユーザー意図 |

### 3.3 永続化・契約（D02/D03 パターン踏襲）

| 項目 | 方針 |
| --- | --- |
| Write target | `project.liner.roadDesignDocument` のみ |
| `hosoCapability` | 定義存在時 `state: "supported"`；未定義時 `absent` |
| `hosoDefinitions[]` | `spacer.liner/domain-draft-vnext-geometry` payload **v0.2.0** の `domainDraft` 配下（sibling フィールド）。**専用 extension key は今回採用しない**（P4-D07 候補として保留） |
| `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` | **0.1.0 維持（bump 禁止）** |
| `payloadVersion` | geometry extension **v0.2.0** 維持（D02/D03 と同パターン）。payload minor bump は D07 で再検討可 |
| 計算結果 | **再計算のみ**（extension / RDD へのキャッシュ永続化しない） |

### 3.4 UI

- Setup `/pro/liner/setup` の **utilities tab**（D02/D03 既設）に HOSO 定義エディタ + 結果テーブル + 診断パネルを追加
- 定義の追加/編集/削除；タイプファミリ選択；station 範囲・offset 範囲・点参照
- bridge/deck 文脈からのリンクは任意（BridgeDefinition 書き換えはしない）
- **Review tab（Bridge Layout）は変更しない**

### 3.5 Export hooks（D04 範囲）

| 項目 | 値 |
| --- | --- |
| Report section key | `hosoResults` |
| CSV file | `hoso_results.csv` |
| 列キー | `definitionId`, `type`, `stationPhysicalDistance`, `offsetM`, `pavementThicknessM`, `pavementElevationM` |
| **D04-C06** | pure CSV/report builder + unit test で充足。**ダウンロードボタン UI は P4-D06** |

### 3.6 検証

- Stage 8 **R8-14** + O1（ファミリごと ≥1、計 ≥5 fixtures）
- 許容差: [`numerical_accuracy.md`](../design/numerical_accuracy.md) + R8-14 **COMBINED** thickness register
- **負厚さ拒否テスト**（D04-C04）— R8-14 negative rejection
- Vitest: calculator per-family、mapper round-trip、invalid ref fail-closed、negative thickness、export builder
- UI 表示: D04-C06；save/reload E2E 最終: P4-D08 / P4-E2E-03

---

## 4. 非対象（Out of scope）

| 項目 | 理由 / 担当ステップ |
| --- | --- |
| HAUNCH 計算の再実装・変更 | P4-D03 COMPLETE；D04 は HAUNCH に数値依存しない |
| 確認図・寸法線描画の本実装 | P4-D05（JIP §8） |
| HOSO 図面オーバーレイ | P4-D05（D05-C07 N/A unless supervisor amendment） |
| CSV/HTML **ダウンロード UI** | P4-D06 |
| 専用 extension key（`hoso` 独立 key） | P4-D07 候補（今回不採用） |
| Legacy migration 最終統合・idempotent migration registry 拡張 | P4-D07 |
| Playwright 最終ゲート一式 | P4-D08 |
| `DrawingDocument` / `domainDraft` canonical write | 凍結ポリシー違反 |
| FEM / Frame 連携 / BridgeDefinition 再実装 | Road scope 外 |
| TOOL / branch-merge / widening / per-line height | deferred |
| Widening quartic/transition（PR-24） | deferred |
| JIP `.lin`, LS1/LS2, 帳票ビューワ | 記録のみ無視；RDD export に置換 |
| 結果キャッシュ永続化 | 禁止（正本 recompute policy） |
| 未承認 extraction による numeric COMPLETE | D04-C01/C03 BLOCKER |
| **P4-D02 Mode B 厳密 JIP 互換への拡張** | D02 N1 凍結；監督 scope amendment なしに拡張禁止 |
| PDF §7 公式の詳細抽出 | **次 STEP B**（本スコープ外） |
| 実装計画の詳細 | **次 STEP C**（本スコープ外） |

---

## 5. 入力

| 入力 | ソース | 検証 |
| --- | --- | --- |
| `hosoDefinitions[]` | geometry extension v0.2.0 `domainDraft` | 安定 `id`、`type` enum、station/offset 範囲、点参照 |
| Active alignment | P4-D01 | 必須；`alignmentId` スコープ |
| Vertical profile | pipeline intermediate | 標高データム一貫性 |
| Crossfall | `crossfallResolution` / pipeline | transverse ファミリ必須；欠落 → fail-closed |
| Cross-section / deck refs | 任意 | 欠落参照 → fail-closed |
| Station list / range | 定義内 station scope | alignment 範囲内 |
| Offset samples | 定義内 offset scope または pipeline grid | transverse / 2-point / 3-point |

---

## 6. 出力

| フィールド | 単位 | 備考 |
| --- | --- | --- |
| `definitionId` | string | 安定 ID |
| `type` | enum | auto / longitudinal / transverse / two_point / three_point |
| `stationPhysicalDistance` | m | 物理測点 |
| `displayedStation` | — | 表示測点（pipeline 規約） |
| `offsetM` | m | 横断 offset（該当ファミリ） |
| `pavementThicknessM` | m | 非負（マニュアル禁止時は error） |
| `pavementElevationM` | m | 該当時のみ |
| `sourceRevision` | string | パイプライン由来 |
| `algorithmVersion` | string | 例: `hoso-0.1.0`（初版；extraction 後確定） |

**永続化:** 出力行はメモリ上のみ。reload 後は入力 + `algorithmVersion` から再計算。

---

## 7. データ構造

### 7.1 RDD 表面

```typescript
hosoCapability?: { state: "absent" | "supported" };
```

現状: mapper は `hosoCapability: { state: "absent" }` stub（`linerDomainDraftRoadDesignMapper.ts`）。

### 7.2 Extension placement（D02/D03 パターン）

| 項目 | 配置 |
| --- | --- |
| Extension key | `spacer.liner/domain-draft-vnext-geometry` |
| `payloadVersion` | `0.2.0`（`LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2`） |
| 入力配列 | `domainDraft.hosoDefinitions[]`（sibling to `ldistJobs[]`, `haunchDefinitions[]`, `alignments[]` 等） |
| RDD `schemaVersion` | `0.1.0` 維持 |
| 専用 key | **不採用**（D07 再検討） |

### 7.3 `hosoDefinitions[]`（設計案 — 実装型は STEP C で確定）

```typescript
type HosoTypeFamily =
  | "auto"
  | "longitudinal"
  | "transverse"
  | "two_point"
  | "three_point";

interface HosoDefinitionDraft {
  id: string;                    // stable ID; stableIdRegistry / deriveStableUuid 規約
  alignmentId: string;
  type: HosoTypeFamily;
  label?: string;
  stationRange: { fromM: number; toM: number };
  offsetRange?: { fromM: number; toM: number };  // transverse / 2-point / 3-point
  // type-specific anchors (station/offset/thickness points, auto rules)
  anchors?: HosoAnchorDraft[];
  // optional deck/cross-section refs
  deckRefId?: string;
  enabled?: boolean;
}
```

**注:** フィールド詳細・enum 値・type-specific 形状・auto ルールは `p4_d04_hoso_extraction_record.md`（STEP B）監督凍結に従う。JIP 生タイプ番号は API 表面に露出しない（D03 パターン）。

### 7.4 計算結果（非永続化）

```typescript
interface HosoResultRow {
  definitionId: string;
  type: HosoTypeFamily;
  stationPhysicalDistance: number;
  displayedStation: number;
  offsetM?: number;
  pavementThicknessM: number;
  pavementElevationM?: number;
  sourceRevision: string;
  algorithmVersion: string;
}
```

---

## 8. UI

| 領域 | 決定 |
| --- | --- |
| 配置 | Setup **utilities tab**（D02 `LdistJobEditor`、D03 `HaunchDefinitionEditor` と共存） |
| 定義一覧 | 追加/編集/削除；5 タイプファミリ |
| 入力 | station 範囲、offset 範囲、点参照、任意 deck 文脈 |
| 結果 | テーブル + 診断（メモリ上；保存しない） |
| 非配置 | Review tab、CSV ダウンロードボタン（D06） |
| i18n | `LINER_HOSO_*` 診断 messageKey |

---

## 9. 計算責務

| 責務 | 方針 |
| --- | --- |
| **Pure calculator** | `frontend/src/liner/core/hoso/`（新規）；UI / mapper から分離 |
| **`algorithmVersion`** | 定数エクスポート（D02 `LDIST_ALGORITHM_VERSION`、D03 `HAUNCH_ALGORITHM_VERSION` パターン） |
| **Recompute** | load 後毎回 `buildIntermediateResult` + calculator；結果キャッシュ禁止 |
| **Crossfall** | `crossfallResolution.ts` 経由；export での再サンプリング禁止 |
| **Pipeline hook** | `pipeline.ts` から optional passthrough（D02/D03 パターン） |
| **診断** | `LINER_HOSO_*` 安定コード；error-level 時は該当行を省略せず診断 emit |

### 9.1 計算フロー（概略）

```text
1. Hydrate domainDraft.hosoDefinitions[] from geometry extension v0.2.0
2. Validate definition refs (alignment, anchors, station/offset range, optional deck refs)
3. buildIntermediateResult(alignment bundle) → profile, stations, crossfall, cross-section samples
4. For each definition × station × offset (per scope):
   a. Resolve elevation datum from profile pipeline at station
   b. Resolve crossfall at station/offset via crossfallResolution
   c. Apply type-family logic per §7 extraction record (STEP B)
   d. Emit pavementThicknessM, pavementElevationM
   e. Reject negative thickness where manual forbids (D04-C04)
5. Emit rows + LINER_HOSO_* diagnostics (no silent skip)
6. Pure export builder → hosoResults / hoso_results.csv (unit tested)
```

---

## 10. 保存責務

| 項目 | 方針 |
| --- | --- |
| Write target | `project.liner.roadDesignDocument` のみ |
| Mapper | `domainDraftToRoadDesignDocument` / `roadDesignDocumentToDomainDraft` で `hosoDefinitions` + `hosoCapability` round-trip |
| Strip | persist 時 `domainDraft` / `drawingDocument` を JSON から除去（既存パターン） |
| 結果 | **RDD / extension に書かない**（no result cache） |
| Capability | 定義 ≥1 → `hosoCapability.state: "supported"` |

---

## 11. Hydrate / migration（D04 境界 vs D07）

| ケース | D04 責務 | D07 責務 |
| --- | --- | --- |
| hoso なし既存プロジェクト | `hosoCapability: absent`；hydrate 可 | — |
| 初回定義保存 | `hosoDefinitions` 追加；capability → `supported` | — |
| geometry extension v0.1.0 → v0.2.0 | D01/D02/D03 既存 migration 経路を利用 | 追加 step が必要なら D07 |
| Legacy pre-P4 プロジェクト | 読み込み可能（定義なし） | `legacyRoadAdapter` + migration registry |
| 専用 extension key 採用 | **決定しない**（D02/D03 同様 geometry sibling） | 監督裁定・registry step |
| 結果キャッシュ | **書かない** | 禁止維持 |
| `schemaVersion` bump | **禁止** | 別承認 artifact なしに不可 |

---

## 12. Validation

| 条件 | 期待動作 |
| --- | --- |
| 未知 alignment / line / deck ref | error diagnostic；該当行 numeric なし |
| station 範囲外 | error |
| offset 範囲外（transverse 等） | error |
| 非互換範囲の重複 | error（正本 abnormal conditions） |
| **負の厚さ**（マニュアル禁止） | error（**D04-C04**；R8-14 negative rejection） |
| profile 不在 at station | error |
| crossfall 不在 at station/offset | error（transverse ファミリ） |
| 退化幾何（共線点等） | extraction record 確定後に warning/error 裁定 |

---

## 13. Fail-closed

| 状況 | 動作 |
| --- | --- |
| 無効参照 | 診断 emit；サイレント行省略禁止 |
| error-level diagnostics 存在時 export | ブロック（`hasHosoErrors` パターン；D02 `hasLdistErrors`、D03 `hasHaunchErrors` 同等） |
| 未抽出 formula での numeric claim | COMPLETE 禁止；dev build で `Extraction Required` 診断可 |
| 曖昧 legacy 入力 | D07 まで quarantine；D04 では新規入力のみ |
| profile / crossfall 捏造 | 禁止；unavailable → error |
| 負厚さのサイレント clamp | **禁止** — 明示 diagnostic（D04-C04） |

---

## 14. Stable ID

| ルール | 要件 |
| --- | --- |
| 新規 `hosoDefinitions[].id` | `stableIdRegistry` / `deriveStableUuid`（Phase 3 bridge layout 同パターン） |
| 既存 Phase 0–3 ID | alignment / profile / cross-section / line ID は変更禁止 |
| Cross-alignment | 定義は `alignmentId` で名前空間分離；他 alignment 参照禁止 |
| 参照 | calculator / export は ID のみ；persisted JSON で array index 依存禁止 |
| Migration | サイレント ID 再生成禁止（D07 `MigrationIdMapping`） |

---

## 15. Schema / payload version

| バージョン | 方針 |
| --- | --- |
| `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` | **0.1.0 維持（bump 禁止）** |
| Geometry extension `payloadVersion` | **0.2.0**（D02/D03 確立済み）。HOSO 入力は sibling 追加のみ |
| Payload minor bump | D07 で再検討可（専用 key 分割時など） |
| `algorithmVersion` | calculator 内定数；formula 変更時のみ increment |

---

## 16. 先行 D-step との接続

### 16.1 P4-D01（IDs・alignment）

| 資産 | パス | HOSO 接続 |
| --- | --- | --- |
| Multi-alignment | `schema/types.ts` | `hosoDefinitions[].alignmentId` スコープ |
| Active alignment | `domainDraft.activeAlignmentId` | デフォルト計算スコープ |
| Mapper | `linerDomainDraftRoadDesignMapper.ts` | `hosoCapability: absent` stub → D04 で read/write |
| Geometry extension v0.2.0 | `LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2` | `hosoDefinitions[]` 拡張先 |
| E2E | `p4-d01-multi-alignment.spec.ts` | save/load パターン再利用 |

### 16.2 P4-D02（パターンのみ — 数値依存なし）

| パターン | D02 実装 | D04 踏襲 |
| --- | --- | --- |
| Pure calculator | `core/ldist/` | `core/hoso/` mirror |
| Validation | `validateLdistJobs.ts` | `validateHosoDefinitions.ts` |
| Diagnostics | `LINER_LDIST_*` | `LINER_HOSO_*` |
| Export builder | `exports/ldistReportExport.ts` | `exports/hosoReportExport.ts` |
| UI tab | utilities tab + `LdistJobEditor` | 同 tab に HOSO パネル追加 |
| Capability flip | `ldistCapability` supported when jobs | `hosoCapability` supported when definitions |
| Mode B 凍結 | N1: `sin(θ_ref)` MVP | **拡張禁止**（監督 amendment なし） |

### 16.3 P4-D03（パターンのみ — 数値依存なし）

| パターン | D03 実装 | D04 踏襲 |
| --- | --- | --- |
| Pure calculator | `core/haunch/` | `core/hoso/` mirror |
| Per-family compute | `computeTwoPoint.ts` 等 | `computeAuto.ts`, `computeLongitudinal.ts` 等 |
| Definition editor | `HaunchDefinitionEditor.tsx` | `HosoDefinitionEditor.tsx` |
| Export fail-closed | `hasHaunchErrors` | `hasHosoErrors` |
| Geometry sibling | `haunchDefinitions[]` in extension v0.2.0 | `hosoDefinitions[]` sibling 追加 |
| JIP raw type 非露出 | `jipType` fail-closed marker | 同パターン（legacy import 用） |

**並列性:** HAUNCH 計算結果に HOSO は依存しない。D03 COMPLETE 後に D04 着手可（execution plan 並列グループ）。

---

## 17. 後続 D-step との境界

| 後続 | 境界 |
| --- | --- |
| **P4-D05 diagrams** | 確認図強化；HOSO オーバーレイは D05-C07 **N/A**（監督 amendment まで） |
| **P4-D06 export UI** | `hoso_results.csv` / `hosoResults` の **ダウンロード UI** と HTML 帳票統合 |
| **P4-D07 migration** | legacy read-old、専用 extension key 裁定、idempotent migration steps、D02/D03 保留分の統合 |
| **P4-D08 E2E** | P4-E2E-03 HAUNCH/HOSO save/reload；最終 quality gate；extraction sign-off（D08-C05） |

---

## 18. 実装予定領域（概略 — mirror 方針）

D03 `core/haunch/` 構成を mirror する（**本 STEP ではコード変更なし**）。

| 領域 | パス（予定） | 根拠（haunch/ldist 既存） |
| --- | --- | --- |
| Types / contracts | `frontend/src/liner/schema/types.ts` | `HaunchDefinitionDraft` 同様 |
| Pure calculator | `frontend/src/liner/core/hoso/` | `computeHaunchResults.ts`, `types.ts`, `diagnostics.ts`, `validate*.ts`, `index.ts` |
| Per-family compute | `core/hoso/computeAuto.ts` 等 | `computeTwoPoint.ts`, `computeLongitudinal.ts` 等 |
| Crossfall hook | `frontend/src/liner/core/grid/crossfallResolution.ts` | execution plan 指定；既存 pipeline 利用 |
| Pipeline hook | `frontend/src/liner/core/pipeline/pipeline.ts` | `haunchDefinitions` optional passthrough 既存 |
| Mapper | `frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.ts` | `haunchDefinitions` + `haunchCapability` 既存 |
| UI adapter | `frontend/src/liner/adapters/linerUiAdapter.ts` | `updateHaunchDefinitions` 系 CRUD |
| UI components | `frontend/src/liner/components/Hoso*.tsx` | `HaunchDefinitionEditor.tsx`, `HaunchResultsPanel.tsx` |
| Utilities tab | `frontend/src/liner/pages/LinerEditPage.tsx` | utilities tab 既設（LDIST + HAUNCH） |
| Export builder | `frontend/src/liner/exports/hosoReportExport.ts` | `haunchReportExport.ts` |
| Extraction doc | `docs/road/phase4/p4_d04_hoso_extraction_record.md` | D04-C01（STEP B） |
| Fixtures | `core/hoso/__tests__/fixtures/` | `gc-haunch-*` / `gc-ldist-*` パターン |

---

## 19. Completion gate（D04-C01..C06）

| ID | 達成定義 | 必須証跡 | 必須テスト | 失敗条件 | N/A |
| --- | --- | --- | --- | --- | --- |
| **D04-C01** | §7 formula extraction record committed（監督承認） | `p4_d04_hoso_extraction_record.md` | Supervisor approval | 未承認 extraction で実装 | — |
| **D04-C02** | Five type families implemented（auto, longitudinal, transverse, 2-point, 3-point） | Source + test file list | Per-family unit tests | いずれかファミリ欠落 | — |
| **D04-C03** | O1 baseline per family pass R8-14 | Fixture paths per family | Vitest per family | いずれか oracle 失敗 | — |
| **D04-C04** | Negative thickness rejection | Test name in verification | Unit test | Negative thickness accepted | — |
| **D04-C05** | RDD round-trip; `hosoCapability.state: "supported"` when definitions exist | Mapper test output | `linerDomainDraftRoadDesignMapper.test.ts` | Definitions lost or wrong state | — |
| **D04-C06** | UI + `hoso_results.csv` / report section | Export samples | Export Vitest | Missing UI or export | — |

**Step BLOCKER:** **D04-C01**（extraction 未承認）、**D04-C03**（いずれかファミリの O1 欠落）、**D04-C04**（負厚さ受理）— いずれかの released family で numeric COMPLETE 禁止。

---

## 20. BLOCKER 条件

| ID | 条件 | 参照 |
| --- | --- | --- |
| B-D04-01 | §7 extraction record 未作成または未承認 | D04-C01；planning freeze S2 |
| B-D04-02 | 5 ファミリのいずれか未実装 | D04-C02 |
| B-D04-03 | いずれかファミリの O1 baseline 失敗 | D04-C03 |
| B-D04-04 | 負の厚さが受理される | D04-C04；R8-14 |
| B-D04-05 | `hosoDefinitions` mapper round-trip 失敗 | D04-C05 |
| B-D04-06 | `schemaVersion` 0.1.0 以外への bump（別承認なし） | planning freeze S1 |
| B-D04-07 | Phase 0–3 回帰（golden, E2E, RDD） | planning freeze S3 |

---

## 21. 既知制約

| # | 制約 |
| --- | --- |
| K1 | **GitHub checks 未設定** — 検証証跡は **「local validation only」** と記載。**「CI PASS」禁止** |
| K2 | **P4-D02 Mode B** は alignment azimuth ベース MVP（N1 凍結）。HOSO 実装がきっかけで LDIST Mode B を厳密 JIP 互換へ拡張しない |
| K3 | **公式数式** — `p4_d04_hoso_extraction_record.md` **未作成**（D04-C01 BLOCKER）。実装前に §7 抽出・監督承認必須 |
| K4 | **Five type families 必須** — auto, longitudinal, transverse, two_point, three_point のいずれも省略不可（D04-C02） |
| K5 | **`ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` = 0.1.0** — bump は別承認 artifact 必須 |
| K6 | **結果キャッシュ永続化禁止** — reload 後 recompute のみ |
| K7 | **parityCli `.tmp` artifacts** — P4 回帰と混同しない（execution plan 記載） |
| K8 | **負厚さ拒否必須** — サイレント clamp 禁止（D04-C04） |

---

## 22. 監督判断が必要な点

| # | 項目 | 現状 | 影響 | 推奨デフォルト |
| --- | --- | --- | --- | --- |
| S1 | §7 PDF → extraction record | **未着手**（STEP B） | D04-C01 BLOCKER | STEP B 完了後に監督承認 |
| S2 | §7 印刷頁範囲 | D02 境界表: print **137+**；D03 extraction 境界: PDF p.143 / print p.137 | extraction 範囲の一意性 | STEP B で PDF/print 頁を記録・凍結 |
| S3 | Auto thickness ルール定義 | 正本「rule-driven」；詳細未定 | auto ファミリ O1 の一意性 | extraction record で JIP §7 意味論に沿って凍結 |
| S4 | Profile + crossfall 結合 | design doc: 両方必須（transverse） | elevation/thickness 一意性 | `buildIntermediateResult` + `crossfallResolution`；export 再サンプリング禁止 |
| S5 | Extension key 分割 | planning freeze open item #2 | D07 | geometry extension v0.2.0 sibling（D02/D03 同様） |
| S6 | utilities tab 内 HOSO 配置 | 未凍結 | UI UX | D03 HAUNCH 直下に HOSO セクション（同一 tab） |
| S7 | Transverse offset サンプル解像度 | 未凍結 | 結果行数・性能 | pipeline grid / 定義明示 offset のみ；全組合せ自動展開しない（D02 pairs パターン） |
| S8 | D05-C07 diagram overlays at D08 | N/A unless amended | D08 要件 | 現状 N/A 維持 |
| S9 | 本スコープ文書の `P4_D04_SCOPE_VERDICT` | **PROPOSED** | STEP B/C 着手可否 | 監督レビュー待ち |

---

## 23. JIP-LINER 仕様対応（参照のみ — 抽出は STEP B）

| ソース | 節 | 用途 |
| --- | --- | --- |
| JIP-LINER manual | **§7**（execution plan: print **137+**；D03 extraction 境界: PDF p.143 / print p.137） | Semantic authority — pavement thickness, type families |
| [stage8_verification_plan.md](../../planning/stage6-10/stage8_verification_plan.md) | **R8-14** | auto/longitudinal/transverse/2-3-point；COMBINED thickness register；negative rejection |
| [numerical_accuracy.md](../design/numerical_accuracy.md) | — | 長さ・厚さ・標高許容差 |
| [p4_d02_scope.md](p4_d02_scope.md) §6.3 | §7 → D04, §8 → D05 | 境界参照 |
| [p4_d03_haunch_extraction_record.md](p4_d03_haunch_extraction_record.md) | §6 境界 | §7 開始頁の参考 |

**本 STEP A では PDF 本文の転記・公式抽出は行わない。** 正本は `p4_d04_hoso_extraction_record.md`（STEP B 作成予定）。

---

## 24. Repository 現況（調査時点 2026-07-21）

| 項目 | 値 |
| --- | --- |
| Branch | `main` |
| HEAD | `ee067d8` = `origin/main`（P4-D03 COMPLETE） |
| `hosoCapability` | stub `absent`（mapper のみ） |
| `hosoDefinitions` | **未実装** |
| `core/hoso/` | **不存在** |
| HAUNCH mirror 参照 | `frontend/src/liner/core/haunch/`（23 files） |
| LDIST mirror 参照 | `frontend/src/liner/core/ldist/`（15 files） |
| Crossfall | `frontend/src/liner/core/grid/crossfallResolution.ts`（既存） |
| Utilities tab | `LinerEditPage.tsx` — LDIST + HAUNCH のみ |

---

## 25. 改訂履歴

| Date | Change |
| --- | --- |
| 2026-07-21 | 初版 PROPOSED（STEP A — 正式スコープ抽出のみ） |

---

## 26. スコープ判定（作業員提案）

| 項目 | 提案 |
| --- | --- |
| **Verdict** | **`P4_D04_SCOPE_VERDICT: APPROVED`**（条件付き） |
| **理由** | 正本 3 点セット + execution plan + D02/D03 パターンから必須項目を抽出済み。5 ファミリ・永続化・fail-closed・D04-C01..C06（C04 負厚さ含む）・後続境界を明文化。未決事項は §22 に隔離し BLOCKER（extraction / O1 / negative thickness）を明示。実装/code 変更は本 STEP 対象外。 |
| **条件** | STEP B で §7 extraction record 作成・監督承認（D04-C01）後に numeric 実装着手可。S3（auto ルール）と S2（頁範囲）は extraction record 内で凍結必須。 |
| **NOGO 条件** | 監督が 5 ファミリ縮小を要求する場合、または §22 S3/S4 を本稿で凍結できず extraction も deferred の場合 |
