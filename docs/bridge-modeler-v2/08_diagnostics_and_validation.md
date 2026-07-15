# 08 — Diagnostics and Validation

Date: 2026-07-14  
Status: 計画文書（監督決定に基づく）  
Authority: `_supervisor_decisions.md` — ADR-BMV2-013  
Scope constraint: Diagnostics envelope 仕様、BMV2_ 接頭辞、必須診断一覧、fatal vs warning

---

## 1. 目的

Bridge Modeler V2 の診断情報（diagnostics）とバリデーションの体系を定義する。各 Phase で生成される診断情報は統一された envelope 形式を持ち、`BMV2_` 接頭辞で識別される。Fatal errors は FEM emit を block し、warnings は emit 許可 + banner 表示とする（ADR-BMV2-013）。

## 2. 対象範囲

| 対象 | 説明 |
| --- | --- |
| DiagnosticsEnvelope | 統一診断 envelope 型 |
| Severity | `info` / `warning` / `error` |
| Code prefix | `BMV2_` |
| Phase プレフィックス | `BMV2_P1_` 〜 `BMV2_P5_` |
| Fatal vs Warning | error = block、warning = banner |
| 必須診断一覧 | 各 Phase の必須診断コード |

## 3. 対象外

| 対象外 | 根拠 |
| --- | --- |
| Legacy の diagnostics | 変更しない |
| LINER の diagnostics | V2 の envelope は LINER と同構造だが独立 |
| Backend solver の diagnostics | 既存 solver の出力を V2 envelope に変換 |

## 4. DiagnosticsEnvelope 型

```typescript
type DiagnosticsEnvelope = {
  severity: "info" | "warning" | "error";
  code: string;        // prefix: "BMV2_"
  message: string;
  path?: string;       // JSON pointer to affected field
  entityIds?: string[]; // affected entity IDs
};
```

### 4.1 Severity 定義

| Severity | 意味 | FEM emit 影響 | UI 表現 |
| --- | --- | --- | --- |
| `error` | Fatal — 必須条件を満たさない | Block（発行不可） | エラーバナー |
| `warning` | 非致命 — 確認が必要 | 許可（banner 付き） | 警告バナー |
| `info` | 情報 — 参考情報 | 影響なし | 情報メッセージ |

### 4.2 Code 命名規則

```
BMV2_P{Phase}_{SUFFIX}

例:
  BMV2_P1_NO_ALIGNMENT      — Phase 1: alignment 未選択
  BMV2_P2_MIN_SUPPORTS      — Phase 2: supports 不足
  BMV2_P3_EMPTY_STATION_SET — Phase 3: station set 空
  BMV2_P4_NO_DECK_SURFACE   — Phase 4: deck surface 未定義
  BMV2_P5_INVALID_DRAWING   — Phase 5: DrawingDocument 無効
```

## 5. 必須診断一覧

### 5.1 Phase 1 — LINER Bridge Interval Reference

| Code | Severity | メッセージ例 | 条件 |
| --- | --- | --- | --- |
| `BMV2_P1_NO_ALIGNMENT` | error | LINER alignment が選択されていない | linerModelId, alignmentId が空 |
| `BMV2_P1_INVALID_STATION_RANGE` | error | start station >= end station | startStationM >= endStationM |
| `BMV2_P1_STATION_OUT_OF_RANGE` | warning | station が alignment 範囲外 | station < min or > max |
| `BMV2_P1_STALE_ALIGNMENT` | warning | LINER alignment の sourceRevision が変化 | sourceRevision 不一致 |
| `BMV2_P1_REVISION_CALC_FAILED` | error | sourceRevision 計算失敗 | sourceRevisionFor() 呼び出し失敗 |

### 5.2 Phase 2 — Bridge Structure

| Code | Severity | メッセージ例 | 条件 |
| --- | --- | --- | --- |
| `BMV2_P2_MIN_SUPPORTS` | error | supports が不足（最低 2 つ必要） | supports.length < 2 |
| `BMV2_P2_DUPLICATE_SUPPORT_STATION` | warning | 同一 station に複数 supports | supports の station 重複 |
| `BMV2_P2_INVALID_GIRDER_SPAN` | warning | girder の spanId が無効 | spanIds が interval 外 |
| `BMV2_P2_INVALID_BEARING_SUPPORT` | error | bearing の supportId が無効 | supportId が supports に存在しない |
| `BMV2_P2_INVALID_SECTION_REF` | warning | sectionRefId が sections に存在しない | sectionRefId が不正 |
| `BMV2_P2_INVALID_MATERIAL_REF` | warning | materialRefId が materials に存在しない | materialRefId が不正 |
| `BMV2_P2_EXCESSIVE_SKEW_ANGLE` | warning | skew angle が大きい | skewAngleDeg > 45 |

### 5.3 Phase 3 — FEM Generation

| Code | Severity | メッセージ例 | 条件 |
| --- | --- | --- | --- |
| `BMV2_P3_EMPTY_STATION_SET` | error | station set が空 | stationSet.length == 0 |
| `BMV2_P3_XYZ_EVAL_FAILED` | error | XYZ 評価に失敗 | 評価不可 station あり |
| `BMV2_P3_INSUFFICIENT_NODES` | error | node 数が不足（最低 4 つ必要） | nodes.length < 4 |
| `BMV2_P3_INSUFFICIENT_MEMBERS` | error | member 数が不足（最低 1 つ必要） | members.length < 1 |
| `BMV2_P3_MISSING_SECTION` | error | 全 members に section が割り当てられていない | section 割り当てなし |
| `BMV2_P3_MISSING_MATERIAL` | error | 全 members に material が割り当てられていない | material 割り当てなし |
| `BMV2_P3_SUPPORT_NOT_MAPPED` | error | support が FEM node にマッピングされていない | マッピングなし |
| `BMV2_P3_DUPLICATE_NODE_ID` | error | Node ID が重複 | 同一 stable ID が複数 |
| `BMV2_P3_MEMBER_DIRECTION_ZERO` | warning | member 方向ベクトルがゼロ | start == end |
| `BMV2_P3_SOLVER_FAILED` | error | Backend solver 実行失敗 | solver error |

### 5.4 Phase 4 — Load Surface

| Code | Severity | メッセージ例 | 条件 |
| --- | --- | --- | --- |
| `BMV2_P4_NO_DECK_SURFACE` | error | deck surface が未定義 | deckSurface == null |
| `BMV2_P4_INVALID_DECK_WIDTH` | error | deck width が 0 以下 | width <= 0 |
| `BMV2_P4_INVALID_ZONE_RANGE` | error | deck zone の station range が無効 | start >= end |
| `BMV2_P4_INVALID_ZONE_OFFSET` | error | deck zone の offset が無効 | offsetLeft >= offsetRight |
| `BMV2_P4_INVALID_DECK_REF` | warning | TrafficLoadZone の deckSurfaceRef が無効 | refId が存在しない |
| `BMV2_P4_INVALID_TLZ_REF` | warning | LoadPath の trafficLoadZoneRef が無効 | refId が存在しない |
| `BMV2_P4_INVALID_FEM_TARGET` | warning | FEM target の refId が ProjectModel に存在しない | target が不正 |
| `BMV2_P4_DISTRIBUTION_FACTOR_SUM` | warning | distribution factor の合計が 1.0 でない | 合計 != 1.0 |

### 5.5 Phase 5 — Results, Drawing, DXF

| Code | Severity | メッセージ例 | 条件 |
| --- | --- | --- | --- |
| `BMV2_P5_INVALID_DRAWING_DOCUMENT` | error | DrawingDocument が無効 | version, sheets が不足 |
| `BMV2_P5_INVALID_DXF` | error | DXF が無効 | validateDxfDocument 失敗 |
| `BMV2_P5_PREVIEW_MISMATCH` | warning | Preview と DXF が不一致 | 同一 document でない |
| `BMV2_P5_INCOMPLETE_RESULTS` | warning | 全 nodes に結果がない | results 欠落 |
| `BMV2_P5_DXF_LAYER_TRUNCATED` | info | DXF レイヤー名が切り捨てられた | name > max length |
| `BMV2_P5_DRAWING_BUILD_FAILED` | error | DrawingDocument ビルダー失敗 | builder error |

### 5.6 Persistence（永続化）

| Code | Severity | メッセージ例 | 条件 |
| --- | --- | --- | --- |
| `BMV2_PERSIST_UNSUPPORTED_VERSION` | error | スキーマバージョンが未対応 | version != bmv2-1.0.0 |
| `BMV2_PERSIST_INVALID_JSON` | error | 有効な JSON でない | parse 失敗 |
| `BMV2_PERSIST_INCOMPLETE_DOCUMENT` | warning | 必須フィールドが不足 | validation 失敗 |
| `BMV2_PERSIST_MISSING_KEY` | error | Project JSON に V2 key が存在しない | key 未発見 |
| `BMV2_PERSIST_SAVE_FAILED` | error | 保存に失敗 | save error |
| `BMV2_PERSIST_LOAD_FAILED` | error | 読み込みに失敗 | load error |

## 6. Diagnostics Collector

### 6.1 診断収集フロー

```mermaid
graph TD
    A[FEM Pipeline Step] -->|diagnostics| B[DiagnosticsCollector]
    B --> C[DiagnosticsEnvelope[]]
    C --> D{has error?}
    D -->|Yes| E[Block FEM emit]
    D -->|No| F[Allow emit + show warnings]
    
    C --> G[DiagnosticsList UI]
    G --> H[Error: Red banner]
    G --> I[Warning: Yellow banner]
    G --> J[Info: Message]
```

### 6.2 Collector Interface

```typescript
type DiagnosticsCollector = {
  add(diag: DiagnosticsEnvelope): void;
  getAll(): DiagnosticsEnvelope[];
  hasErrors(): boolean;
  hasWarnings(): boolean;
  getBySeverity(severity: "info" | "warning" | "error"): DiagnosticsEnvelope[];
  getByCode(code: string): DiagnosticsEnvelope[];
  getByEntityId(entityId: string): DiagnosticsEnvelope[];
};
```

## 7. Validation 体系

### 7.1 Validation タイプ

| タイプ | 説明 | 時機 |
| --- | --- | --- |
| Input validation | ユーザー入力の妥当性 | 入力時 |
| State validation | V2 document の完全性 | 保存時 |
| Pipeline validation | FEM pipeline 各ステップ | 実行時 |
| Cross-reference validation | エンティティ間参照の整合性 | 各 Phase 完了時 |

### 7.2 Validation ルール

| ルール | 内容 | Phase |
| --- | --- | --- |
| Required fields | 必須フィールドの存在チェック | 全 Phase |
| Range check | 数値の範囲チェック | 全 Phase |
| Reference integrity | 参照先の存在チェック | Phase 2-5 |
| Station range | station が interval 内であること | Phase 1-3 |
| ID uniqueness | Stable ID の一意性 | Phase 2-3 |
| Distribution sum | distribution factor の合計 = 1.0 | Phase 4 |
| DrawingDocument validity | version, sheets 存在 | Phase 5 |

## 8. Fatal vs Warning 判断基準

### 8.1 Error（Fatal）の基準

| 基準 | 例 |
| --- | --- |
| 必須入力が欠落 | alignment 未選択、supports 不足 |
| データ整合性の破壊 | reference が存在しない、ID 重複 |
| FEM 生成が不可能 | station set 空、node 不足 |
| 保存が不可能 | version 不正、JSON 無効 |

### 8.2 Warning の基準

| 基準 | 例 |
| --- | --- |
| 妥当性の疑い | skew angle 大きい、station range 外 |
| 推奨されない状態 | distribution factor 合計 != 1.0 |
| 一部の不完全さ | results 一部欠落 |
| 古いデータ | sourceRevision 変化（stale） |

## 9. UI での診断表示

### 9.1 DiagnosticsList コンポーネント

| 表示項目 | 内容 |
| --- | --- |
| Severity icon | 🔴 error / 🟡 warning / 🔵 info |
| Code | `BMV2_P*_XXXX` |
| Message | 人間が読めるメッセージ |
| Path | JSON pointer（任意） |
| Entity IDs | 影響を受けるエンティティ（任意） |

### 9.2 Banner

| Severity | バナー色 | 表示位置 |
| --- | --- | --- |
| error | Red | 画面上部（FEM emit block 時） |
| warning | Yellow | 画面上部（emit 許可時） |
| info | Blue | パネル内 |

## 10. テスト方針

| テスト種別 | 内容 |
| --- | --- |
| Unit | DiagnosticsCollector の追加/取得 |
| Unit | Validation ルールごとの正否判定 |
| Unit | Severity 判断の正確性 |
| Integration | Pipeline step → Diagnostics → UI 表示 |
| Regression | Fatal error が FEM emit を block すること |

### テスト証拠

- `frontend/src/liner/drawing/model/diagnostics.ts:1-8` — LINER の diagnostics 型参考
- `frontend/src/bridge/types.ts:85-90` — Legacy の BridgeFemResponse.diagnostics 参考
- `frontend/src/bridge/bridgeValidation.test.ts` — validation パターン参考

## 11. 完了条件

1. `DiagnosticsEnvelope` 型が ADR-BMV2-013 に従って定義される
2. 全 Phase の必須診断コードが定義される
3. `BMV2_` 接頭辞が一貫して使用される
4. Fatal errors が FEM emit を block する
5. Warnings が emit 許可 + banner 表示になる
6. DiagnosticsCollector が各 pipeline step で動作する

## 12. 未決事項

| ID | 内容 | 影響 |
| --- | --- | --- |
| (なし) | 診断体系は監督決定 ADR-BMV2-013 に従い明確 | — |

---

## ADR 転記

| ID | タイトル | 本文書との関連 |
| --- | --- | --- |
| ADR-BMV2-013 | Diagnostics envelope | §4, §5, §6, §8 |
