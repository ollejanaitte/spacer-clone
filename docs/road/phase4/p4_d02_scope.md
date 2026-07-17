# P4-D02 Scope — LDIST Equivalent

**Date:** 2026-07-17
**Status:** AUTHORITATIVE — supervisor SCOPE_VERDICT APPROVED (2026-07-17)

**Authoritative parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)
**Extraction record:** [p4_d02_ldist_extraction_record.md](p4_d02_ldist_extraction_record.md)
**P4-D01 baseline:** `061ccfc` (origin/main, P4-D01 COMPLETE)
**Prior verdict:** `P4_D02_SCOPE_VERDICT: NOGO` (2026-07-17) — §15 未凍結・extraction record 未作成を解消する改訂

---

## 1. P4-D02 正式名称

**LDIST Equivalent**（格点間距離・張り出し長）

Phase 4 正式名称 **Road Advanced Calculation & Utilities** の第 2 実装ステップ。JIP-LINER の **LDIST** モジュールに相当する計算・入出力を `RoadDesignDocument` 上で再現する。

| 正本ラベル | 意味 |
| --- | --- |
| P4-D02 | LDIST Equivalent（本スコープ） |
| P4-D03 | HAUNCH Equivalent（本スコープ外） |
| P4-D04 | HOSO Equivalent（本スコープ外） |
| P4-D05 | Review Diagrams and Utilities UI（LDIST 図面注記は任意） |
| P4-D06 | Reports and CSV（フル帳票 UI は D06；D02 は export hooks / 列仕様まで） |

---

## 2. 目的

P4-D01 で確立した **複数 alignment・active alignment・安定 line ID** を前提に、JIP-LINER §5.8 の意味論に沿った **格点間距離** と **張り出し長** を測点（station）ごとに計算し、診断・保存・export hooks まで提供する。

成功基準（正本）:

- 純粋・決定論的 LDIST 計算モジュール（`algorithmVersion` 付き）
- RDD 経由の入力永続化（`ldistCapability.state: "supported"`）
- Stage 8 **R8-12** + **O1** 手計算ベースライン（straight + skew ≥2 シナリオ）
- `ldist_results.csv` / report `ldistResults` 列仕様（pure builder + unit test で D02-C07；ダウンロード UI は D06）
- fail-closed 診断（無効参照のサイレント省略禁止）

**数式・幾何定義:** JIP §5.8 本文に閉形式の幾何式は無い。プロジェクト幾何 O1 は Stage 8 R8-12 + 監督凍結 **N1** に従い、[p4_d02_ldist_extraction_record.md](p4_d02_ldist_extraction_record.md) に記載。**D02-C01** は当 extraction record の監督承認で充足する（実装着手前必須）。

---

## 3. 対象

### 3.1 計算ファミリ（監督凍結 N1 反映）

| ファミリ | 概要 | 主な出力キー |
| --- | --- | --- |
| Grid distance — Mode A | 同一セクション上のライン交点 \(P_{\text{from}}, P_{\text{to}}\) 間のベクトル距離 \(d=\|P_{\text{from}}-P_{\text{to}}\|\) | `distanceM`, `fromLineId`, `toLineId` |
| Grid distance — Mode B | Mode A 距離 × \(\sin(\theta_{\text{ref}})\)；\(\theta_{\text{ref}}\) = セクション方向と基準ライン方向の交角（JIP §5.8.2 文言） | 同上 + `signConvention` |
| Overhang | 既定基準 = pier line（`pierLineGeometry`）。左/右ラインとセクション交点までの距離 | `overhangM`, `side`, `pierId?` |
| Skew context | 斜交ピアは `pierLineGeometry` + 同一測点に pier 複数時は `pierId` 必須 | `skewAngleRad`, diagnostics |

### 3.2 入力ソース（既存パイプライン）

| 入力 | 所在 | 用途 |
| --- | --- | --- |
| Active alignment | `domainDraft.activeAlignmentId` / RDD `alignments[]` | 計算スコープのデフォルト |
| Offset lines / centerline | `CrossSectionOffsetLineDraft[]`, `deriveLinerCenterlineId` | 計算ライン参照 |
| Grid points / sections | `buildIntermediateResult` → `grid`, `sections` | セクション×ライン交点 \(P\) |
| Stations | `stations.entries` またはジョブ明示 station リスト | サンプリング位置 |
| Bridge layout | spans / piers, `pierLineGeometry` | 張り出し・斜交参照 |
| LDIST job 定義 | geometry extension `domainDraft.ldistJobs[]` | 永続化されるユーザー意図 |

### 3.3 永続化・契約（監督凍結 N2）

- Write target: `project.liner.roadDesignDocument` のみ
- `ldistCapability`: ジョブ存在時 `state: "supported"`
- `ldistJobs[]`: `spacer.liner/domain-draft-vnext-geometry` payload **v0.2.0** の `domainDraft` 配下（同 extension JSON 内 sibling 可）。**専用 extension key は採用しない**（P4-D07 候補として保留）
- `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION`: **0.1.0 維持**
- 計算結果: **再計算のみ**（extension / RDD へのキャッシュ永続化しない）

### 3.4 UI（監督凍結 N3）

- Setup `/pro/liner/setup` に **新規 tab**（推奨 id: `utilities` または `ldist`）
- ジョブ定義・実行/クリア・結果テーブル・診断パネル
- **Review tab（Bridge Layout）は変更しない**

### 3.5 Export hooks（D02 範囲 — 監督凍結 N3）

- Report section key: `ldistResults`
- CSV file: `ldist_results.csv`
- 列キー: `jobId`, `fromLineId`, `toLineId`, `stationPhysicalDistance`, `displayedStation`, `distanceM`, `overhangM`, `side`, `signConvention`
- **D02-C07:** pure CSV/report builder + unit test で充足。**ダウンロードボタン UI は P4-D06**

### 3.6 検証

- Stage 8 **R8-12** + O1（straight + skew）
- 許容差: [`numerical_accuracy.md`](../design/numerical_accuracy.md) + R8-12 ABS distance register
- Vitest: calculator、mapper round-trip、invalid ref fail-closed、export builder
- E2E 結果表示: D02-C06；CSV download 最終ゲート: P4-D08 / D06

---

## 4. 非対象

| 項目 | 理由 / 担当ステップ |
| --- | --- |
| HAUNCH 計算 | P4-D03（JIP §6） |
| HOSO / 舗装厚計算 | P4-D04（JIP §7） |
| 確認図・寸法線描画の本実装 | P4-D05（JIP §8） |
| CSV/HTML **ダウンロード UI** | P4-D06 |
| 専用 extension key（`ldist` 独立 key） | P4-D07 候補（今回不採用） |
| Legacy migration 最終統合 | P4-D07 |
| Playwright 最終ゲート一式 | P4-D08 |
| `DrawingDocument` / `domainDraft` canonical write | 凍結ポリシー違反 |
| FEM / Frame 連携 | Road scope 外 |
| TOOL / branch-merge / widening / per-line height | deferred |
| JIP `.lin`, LS1/LS2, 帳票ビューワ | 記録のみ無視；RDD export に置換 |
| 結果キャッシュ永続化 | N2 凍結で禁止 |
| 未承認 extraction による numeric COMPLETE | D02-C01/C03 BLOCKER |

---

## 5. 既存実装との接続（D01 含む）

### 5.1 Repository 現況（調査時点 2026-07-17）

| 項目 | 値 |
| --- | --- |
| Branch | `main` |
| HEAD | `061ccfc` = `origin/main`（P4-D01 COMPLETE） |
| Stash | なし |
| 想定外 | `Bridge_Modeler_V2_改良方針案.txt` が `D` — **未触・未 stage・未復元** |

### 5.2 P4-D01 完了資産

| 資産 | パス | LDIST 接続 |
| --- | --- | --- |
| Multi-alignment | `schema/types.ts` | `alignmentId` スコープ |
| Mapper | `linerDomainDraftRoadDesignMapper.ts` | `ldistCapability: absent` stub |
| Geometry extension v0.2.0 | `LINER_DOMAIN_DRAFT_GEOMETRY_PAYLOAD_VERSION_V2` | `ldistJobs[]` 拡張先 |
| Pipeline | `pipeline.ts` | `buildIntermediateResult` → sections/grid |
| Pier geometry | `pierLineGeometry.ts` | overhang 既定基準 |
| E2E | `p4-d01-multi-alignment.spec.ts` | save/load パターン |

### 5.3 未実装（D02 作業）

`ldist` calculator、`ldistJobs` mapper 読書、`LINER_LDIST_*` 診断、utilities/ldist tab UI、export builder。

### 5.4 アーキテクチャ接続

```text
UI (utilities/ldist tab)
  → domainDraft.ldistJobs[]
  → domainDraftToRoadDesignDocument (geometry extension v0.2.0)
  → buildIntermediateResult → LDIST calculator (algorithmVersion)
  → result rows (memory only) + diagnostics
  → pure ldistResults / ldist_results.csv builder (D02-C07)
```

---

## 6. JIP-LINER 仕様対応表

**抽出ソース:** `マニュアル/JIP-LINER_マニュアル.pdf`
**§5.8 範囲:** PDF pp.**128–130** / 印刷頁 **122–124**
**詳細 extraction:** [p4_d02_ldist_extraction_record.md](p4_d02_ldist_extraction_record.md)

### 6.1 §5.8 転記

| PDF p. | Print p. | JIP 節 | 内容要約 | 分類 |
| --- | --- | --- | --- | --- |
| 128 | 122 | §5.8.1 | 帳票出力対象スパン一覧（追加/編集/削除 UI） | UI参考のみ |
| 129 | 123 | §5.8.2 | 距離モード (A) セクション距離そのまま / (B) × 基準ライン交角のサイン（基準ライン指定必須）；計算ライン（主桁）；計算セクション | 公式仕様（意味論） |
| 130 | 124 | §5.8.3 | 張り出し長：左/右ライン + 計算セクション（格点間距離と同様の指定） | 公式仕様（意味論） |
| 128–130 | 122–124 | §5.8 全体 | スパン単位・帳票ビューワ前提 | 旧製品固有（採用不可） |

### 6.2 幾何式と O1（監督凍結 N1）

| 項目 | JIP §5.8 | プロジェクト定義（extraction record） |
| --- | --- | --- |
| Mode A | 「セクション上の距離をそのまま」 | \(d=\|P_{\text{from}}-P_{\text{to}}\|\)（plan XY 交点間） |
| Mode B | 「交角のサインの値を乗じた距離」 | \(d=\|P_{\text{from}}-P_{\text{to}}\|\times\sin(\theta_{\text{ref}})\)；\(\sin=0\) / 退化 → fail-closed |
| Overhang | 左/右ライン指定のみ | pier line 基準；交点までの距離（細部は extraction record） |
| 閉形式幾何式 | **本文に無し** | R8-12 O1 で補完（捏造禁止） |

### 6.3 境界（§6/§7/§8 — 参照のみ）

| Print p. | 節 | 送付先 |
| --- | --- | --- |
| 125+ | §6 ハンチ | P4-D03 |
| 137+ | §7 舗装厚 | P4-D04 |
| 143+ / 151 | §8 / §8.8 寸法線 | P4-D05 |

### 6.4 LS1/LS2

§3.5.2 と §2.3 の拡張子記述矛盾は **記録のみ**。本プロジェクトは LS1/LS2 を採用せず RDD export に置換（監督凍結 N3）。

---

## 7. データモデル案（監督凍結 N2/N3 反映）

### 7.1 RDD 表面

```typescript
ldistCapability?: { state: "absent" | "supported" };
```

### 7.2 `domainDraft.ldistJobs[]`（geometry extension v0.2.0 内）

```typescript
type LdistJobKind = "grid_distance" | "overhang";
type LdistDistanceMode = "mode_a" | "mode_b";

interface LdistLinePair {
  fromLineId: string;
  toLineId: string;
}

interface LdistJobDraft {
  id: string;
  alignmentId: string;
  kind: LdistJobKind;
  label?: string;
  spanId?: string;              // optional filter（N3）
  stationScope: "all_generated" | { stationIds: string[] } | { physicalDistances: number[] };
  sectionIds?: string[];        // 省略 = all sections
  // grid_distance
  distanceMode?: LdistDistanceMode;
  referenceLineId?: string;     // mode_b 必須
  pairs: LdistLinePair[];       // 明示ペアのみ（全組合せ自動展開しない）
  // overhang
  enabled?: boolean;
  leftLineId?: string;
  rightLineId?: string;
  pierId?: string;              // 同一測点に pier 複数時必須
}
```

### 7.3 計算結果（非永続化）

```typescript
interface LdistResultRow {
  jobId: string;
  stationPhysicalDistance: number;
  displayedStation: number;
  fromLineId?: string;
  toLineId?: string;
  distanceM?: number;
  overhangM?: number;
  side?: "left" | "right";
  pierId?: string;
  signConvention?: string;
  sourceRevision: string;
  algorithmVersion: string;     // 例: "ldist-0.1.0"
}
```

---

## 8. UI案（監督凍結 N3）

| 領域 | 決定 |
| --- | --- |
| 配置 | Setup **新規 tab** `utilities` または `ldist` |
| ジョブ一覧 | 追加/編集/削除；種別 grid_distance / overhang |
| 格点間距離 | 明示 `pairs[]`、Mode A/B、基準ライン（B 時必須）、セクション scope |
| 張り出し長 | 左/右ライン、セクション、pier 選択（複数 pier 時必須） |
| `spanId` | optional filter（alignment 全体可） |
| 結果 | テーブル + 診断（メモリ上；保存しない） |
| 非配置 | Review tab、CSV ダウンロードボタン（D06） |

---

## 9. 計算フロー（監督凍結 N1 反映）

```text
1. Hydrate domainDraft.ldistJobs[] from geometry extension v0.2.0
2. Validate job refs (alignment, pairs, referenceLineId for mode_b, pierId if needed)
3. buildIntermediateResult(alignment bundle) → sections, grid, piers
4. For each job × station × section (per scope):
   a. Resolve P_from, P_to = section × line intersections (plan XY)
   b. grid_distance mode_a: d = ||P_from - P_to||
   c. grid_distance mode_b: d = ||P_from - P_to|| × sin(θ_ref); degenerate → LINER_LDIST_DEGENERATE_GEOMETRY
   d. overhang: pier line at station → distance to left/right line intersection
5. Emit rows + LINER_LDIST_* diagnostics (no silent skip)
6. Pure export builder → ldistResults / ldist_results.csv (unit tested)
```

**algorithmVersion:** `ldist-0.1.0`（初版；extraction record 参照）

---

## 10. Validation / fail-closed

| 条件 | 診断コード |
| --- | --- |
| 未知 line / alignment / pier ref | `LINER_LDIST_*_REFERENCE_MISSING` |
| mode_b で referenceLineId 欠落 | `LINER_LDIST_REFERENCE_LINE_REQUIRED` |
| station 範囲外 | `LINER_LDIST_STATION_OUT_OF_RANGE` |
| \(\sin(\theta_{\text{ref}})=0\) または退化幾何 | `LINER_LDIST_DEGENERATE_GEOMETRY` |
| 同一測点 pier 複数で pierId 欠落 | `LINER_LDIST_PIER_ID_REQUIRED` |
| error-level diagnostics 時 export | ブロック（正本 fail-closed） |

---

## 11. Hydrate / migration

| ケース | 方針 |
| --- | --- |
| ldist なし既存プロジェクト | `ldistCapability: absent`；hydrate 可 |
| 初回ジョブ保存 | `domainDraft.ldistJobs` 追加；capability → `supported` |
| 結果キャッシュ | **書かない**（N2） |
| RDD schemaVersion | **0.1.0 維持** |
| 専用 extension key | **今回不採用**（D07 候補） |

---

## 12. 保存・再読込

1. UI → `domainDraft.ldistJobs[]`
2. `domainDraftToRoadDesignDocument` → geometry extension v0.2.0 + `ldistCapability`
3. `project.liner.roadDesignDocument` のみ persist
4. Reload → jobs 復元；**結果は毎回再計算**

---

## 13. テスト計画

| 層 | 内容 | Gate |
| --- | --- | --- |
| Extraction approval | [p4_d02_ldist_extraction_record.md](p4_d02_ldist_extraction_record.md) 監督承認 | D02-C01 |
| Unit calculator | Mode A straight；Mode B；overhang skew pier | D02-C02/C03 |
| Unit validation | invalid refs fail-closed | D02-C05 |
| Mapper | `ldistJobs` round-trip | D02-C04 |
| Export builder | pure CSV/report 列・行数 | D02-C07 |
| UI | utilities/ldist tab + 結果テーブル | D02-C06 |

**O1 fixtures:** `gc-ldist-straight-orthogonal`, `gc-ldist-skew-pier`（extraction record §4）

---

## 14. Completion gate（D02-C01..C07）

| ID | 達成定義 | 証跡 |
| --- | --- | --- |
| D02-C01 | 監督承認済み extraction record | `p4_d02_ldist_extraction_record.md` 承認欄 |
| D02-C02 | 純粋 calculator + `algorithmVersion` | `frontend/src/liner/core/ldist/` + unit |
| D02-C03 | O1 ≥2 PASS | fixture JSON + Vitest |
| D02-C04 | `ldistJobs` round-trip + capability | mapper test |
| D02-C05 | `LINER_LDIST_*` fail-closed | diagnostic tests |
| D02-C06 | UI エディタ + 結果表示 | component/E2E trace |
| D02-C07 | pure builder + unit test（**DL UI 不要**） | builder test |

**BLOCKER:** D02-C01（extraction 未承認）または D02-C03 欠落時は numeric COMPLETE 禁止。

---

## 15. 監督凍結済み決定（N1–N3）

| ID | 領域 | 凍結内容 |
| --- | --- | --- |
| **N1** | Numeric / Extraction | Semantic authority = JIP §5.8（PDF 128–130 / print 122–124）。幾何 O1 = R8-12（セクション×ライン交点の plan XY ベクトル距離）。Mode A: \(d=\|P_{\text{from}}-P_{\text{to}}\|\)。Mode B: × \(\sin(\theta_{\text{ref}})\)；退化 → `LINER_LDIST_DEGENERATE_GEOMETRY`。Overhang 既定 = pier line；複数 pier → `pierId` 必須。許容差 = `numerical_accuracy.md` + R8-12 ABS。JIP 閉形式式なしを extraction record に明記。 |
| **N2** | Persistence | `ldistJobs[]` は geometry extension v0.2.0 `domainDraft` 配下。専用 key 不採用（D07 候補）。RDD `schemaVersion` 0.1.0。結果再計算のみ（キャッシュなし）。 |
| **N3** | Span / lines / sign / UI / C07 | `spanId` optional。ライン組合せ = 明示 `pairs[]` のみ。Sign = N1 Mode B（追加 JIP 調査なし）。UI = 新規 tab `utilities`/`ldist`。LS1/LS2 無視（記録のみ）。D02-C07 = pure builder + unit test；DL UI は D06。 |

**残存ブロッカー（実装着手前）:** extraction record の監督 **extraction approval**（D02-C01）のみ。上記 N1–N3 は凍結済みで再裁定不要。

---

## 16. D03 以降へ送る事項

| 送付先 | 事項 |
| --- | --- |
| P4-D03 | JIP §6（print 125+） |
| P4-D04 | JIP §7（print 137+） |
| P4-D05 | JIP §8；§8.8 寸法モードは LDIST と概念共有 |
| P4-D06 | CSV/HTML ダウンロード UI、`report_output_spec.md` 追記 |
| P4-D07 | 専用 extension key 候補、legacy migration |
| P4-D08 | P4-E2E-02 最終（CSV download 含む） |

---

## 改訂履歴

| Date | Change |
| --- | --- |
| 2026-07-17 | 初版 PROPOSED |
| 2026-07-17 | NOGO 後改訂：N1–N3 凍結、extraction record 参照、§15 置換、PDF/print 頁併記 |
