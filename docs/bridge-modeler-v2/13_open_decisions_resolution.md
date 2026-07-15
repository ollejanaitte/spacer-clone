# 13 — Open Decisions Resolution

Date: 2026-07-14  
Status: **LOCKED** (Grok supervisor確認済み)  
Authority: `_supervisor_decisions.md`  
Scope: OD-01〜05 の決定事項と矛盾解消方針

---

## 1. 概要

本文書は OD-01〜05 の確定済み設計を文書化する。MiMo は判断せず、監督指示を正確に転記・整形する。

## 2. OD 状態サマリ

| ID | 决定 | ADR | Status |
| --- | --- | --- | --- |
| OD-01 | ProjectModel 拡張キー `bridgeModelerV2` | ADR-BMV2-015 | **RESOLVED** |
| OD-02 | Phase1〜5連続実装の正は Frontend ドメイン | ADR-BMV2-016 | **RESOLVED** |
| OD-03 | GirderLine offset は piecewise-linear | ADR-BMV2-017 | **RESOLVED** |
| OD-04 | Full structure regeneration | ADR-BMV2-018 | **RESOLVED** |
| OD-05 | 直ちに Legacy 削除せず、条件付き撤去 | ADR-BMV2-019 | **RESOLVED** |

---

## OD-01 → ADR-BMV2-015

### Decision

ProjectModel 拡張キーとして正式名 `bridgeModelerV2` を採用。

### Context

ProjectModel には既存の camelCase 拡張スロット `liner` / `linerTrace` が存在する（types.ts:193-195）。V2 ドキュメントの永続化キーを決定する必要がある。

### Options

- A: `bridgeModelerV2` — camelCase 拡張スロット
- B: `bridge` — Legacy API payload と衝突（main.py:1019）
- C: `BridgeProject` 内ネスト
- D: `generatedFem` 流用

### Selected option

**A: `bridgeModelerV2`**

型: `ProjectModel.bridgeModelerV2?: BridgeModelerV2Document`

### Rejected options

| Option | 理由 |
| --- | --- |
| B: `bridge` | Legacy API payload と衝突（main.py:1019） |
| C: `BridgeProject` 内ネスト | 既存型と不整合 |
| D: `generatedFem` 流用 | 意図が異なる（分析結果専用） |

### Consequences

- schemaVersion: `BridgeModelerV2Document.schemaVersion = "bmv2-1.0.0"`
- document.id: ユーザー/作成時 UUID（`bmv2-` + crypto.randomUUID）— エンティティ stable ID とは別
- generated analysis / results / drawings: 既定は永続化しない（派生）。任意キャッシュは `bridgeModelerV2.derivedCache?` に置き dirty/revision 必須。MVP連続実装では derivedCache 未使用可
- unknown fields: 読み込み時保持（forward-compat）、書き込み時 strip しない
- 破損: schemaVersion 不一致は fatal diagnostic、ロード拒否して UI で修復導線
- Legacy BridgeProject: 別経路。同一 ProjectModel に共存可だが相互参照なし

### Affected phases

- P1（persistence）以降全 Phase

### Blocking PRs

- PR-BMV2-005 の blocking cleared

### Verification

- [ ] `bridgeModelerV2` キーが ProjectModel type に追加される
- [ ] Legacy `bridge` キーとの衝突がないことを確認
- [ ] schemaVersion 不一致時に fatal diagnostic が出ることを確認

---

## OD-02 → ADR-BMV2-016

### Decision

Phase1〜5連続実装の正は Frontend ドメイン。永続化は host ProjectModel JSON（`bridgeModelerV2`）+ 既存 `/api/projects/save|load|autosave`。

### Context

V2 ドキュメントの永続化方法を決定する。Frontend-only で先行するか Backend REST を追加するか。

### Options

- A: frontend-only (ProjectModel JSON)
- B: Backend REST (`/api/bridge-modeler-v2/...`)

### Selected option

**A: frontend-only**

Phase1〜5は Frontend ドメイン。Backend REST は将来オプション。

### Rejected options

| Option | 理由 |
| --- | --- |
| B: Backend REST | Phase1-5必須ではない。同一形状を返す adapter 境界を予約 |

### Consequences

- FEM生成: Frontend 段階パイプラインが ProjectModel を生成
- Legacy `/api/fem/generate`（BridgeProject入力）は V2経路で使用禁止
- 解析: 生成済み ProjectModel を `/api/analysis/run`（および eigen 等）へ送信
- Backend 専用 REST は将来オプション。同一 BridgeModelerV2Document 形状を返す adapter 境界を予約
- Timeout/cancel: backendにABSENT。V2クライアントは fetch AbortController を契約。サーバ側timeoutは非ブロックOpenとして RISK に残すが実装開始は妨げない
- Offline: 編集はローカル状態で可能。解析・サーバ保存はオンライン必須

### Affected phases

- 全 Phase（Phase1〜5）

### Blocking PRs

- PR-BMV2-005 の blocking cleared（OD-01 と併せて）

### Verification

- [ ] Frontend のみで永続化が完結することを確認
- [ ] Legacy `/api/fem/generate` が V2 経路から除外されることを確認
- [ ] `/api/projects/save|load|autosave` で `bridgeModelerV2` が保存されることを確認

---

## OD-03 → ADR-BMV2-017

### Decision（初回実装）

GirderLine offset は piecewise-linear。

### Context

ガーダーの "follow widening" を continuous offset function で実装するか piecewise stations で実装するかを決定する。

### Options

- A: continuous offset function
- B: piecewise stations

### Selected option

**B: piecewise-linear**

制御点 `offsetControlPoints: { stationM: number, offsetM: number }[]`（最低2点=始端・終端）。

### Rejected options

| Option | 理由 |
| --- | --- |
| A: continuous function | 後続拡張として扱う。初回実装では複雑さが不必要 |

### Consequences

- Constant offset = 2点が同一 offset の特殊ケース
- 左右符号: 橋軸進行方向に対し右が正（ADR-BMV2-009準拠）
- 制御点外: clamp to nearest endpoint（外挿しない）。不連続禁止（同一stationに複数点不可）
- 後続拡張（非初回）: continuous function、道路幅員境界追従、LINER既存ライン参照、分岐合流
- PR-BMV2-007 はこの方式で実装

### Affected phases

- P2（structure）

### Blocking PRs

- PR-BMV2-007

### Verification

- [ ] offsetControlPoints の最低2点制約が守られることを確認
- [ ] 同一 station に複数制御点がないことを確認
- [ ] clamp 行為が外挿しないことを確認
- [ ] Constant offset が特殊ケースとして動作することを確認

---

## OD-04 → ADR-BMV2-018

### Decision（初回）

Full structure regeneration。

### Context

FEM 再生成の粒度を span-local にするか full structure にするかを決定する。

### Options

- A: span-local (部分再生成)
- B: full structure (全体再生成)

### Selected option

**B: Full structure regeneration**

### Rejected options

| Option | 理由 |
| --- | --- |
| A: span-local | 後続拡張として扱う。初回実装では保守性が不十分 |

### Consequences

**保持:**
- ユーザー入力（RoadAlignmentReference, BridgeInterval, BridgeStructureModel, Deck*, TrafficLoadZone, LoadPath, LoadCase定義, drawing settings）

**無効化/再計算:**
- GenerationStationSet, AnalysisModelSpec出力, ProjectModel生成物, analysisResults, DrawingDocument, DXF, IdCorrespondence（再生成で再構築だが同一入力なら同一ID）

span-local partial regen は後続拡張。

### Dirty dependency 表

| Change | dirty targets |
| --- | --- |
| alignment revision / start-end station | interval preview, structure preview XYZ, stationSet, analysis, projectModel, results, drawings, dxf |
| support/skew/girder offset/cross girder/section/material/bearing | structure preview, stationSet, analysis, projectModel, results, drawings, dxf |
| deck/TrafficLoadZone/load case | load distribution, projectModel loads, results, load drawings |
| solver setting | results only (model IDs保持可) |
| drawing setting | drawings, dxf only |

### Affected phases

- P3（FEM generation）以降

### Blocking PRs

- PR-BMV2-012

### Verification

- [ ] Full structure regeneration が全入力変更に対して正しく動作することを確認
- [ ] Dirty dependency 表に従い、変更対象が正しく無効化されることを確認
- [ ] 同一入力で再生成した場合に IdCorrespondence が同一 ID を保持することを確認

---

## OD-05 → ADR-BMV2-019

### Decision

直ちに Legacy BridgeWizard を撤去しない。撤去 PR は前提条件充足後に実施。

### Context

Legacy BridgeWizard の非推奨化・削除の条件を決定する。V2 と Legacy の並存期間を定義する。

### Options

- A: V2 全 Phase 完了時
- B: ユーザー移行率ベース
- C: 条件付き撤去（前提条件クリア後）

### Selected option

**C: 条件付き撤去**

撤去 PR 前提条件:

1. Slice E（Phase5）完了
2. Legacy機能同等性チェックリスト合格（簡易グリッド生成の代替がV2で可能）
3. 既存BridgeProjectデータ: 自動移行なし継続可。optional one-way import が提供済み、または「移行不要」のプロダクト承認
4. `VITE_BRIDGE_MODELER_V2` が既定ON相当で最低2リリース、その間Legacy到達可能
5. 利用確認（telemetryまたは手動プロダクト確認）
6. ユーザー告知完了
7. rollback可能期間（最低1リリース）確保
8. 専用 deprecation PR（Legacy削除）は上記全条件後

### Rejected options

| Option | 理由 |
| --- | --- |
| A: V2 全 Phase 完了時 | 単一条件では不十分。データ移行・ユーザー影響を考慮 |
| B: ユーザー移行率ベース | テレメトリ未整備の場合に判断困難 |

### Consequences

- Legacy BridgeWizard は V2 全 Phase 完了後も一定期間並存
- Deprecation PR は全前提条件充足後に専用 PR として実施
- rollback 可能期間が確保される

### Affected phases

- P5（results & drawings）以降

### Blocking PRs

- PR-BMV2-022（Legacy coexistence）

### Verification

- [ ] 前提条件 1〜8 が全項目充足されることを確認
- [ ] Deprecation PR が全条件後に作成されることを確認
- [ ] rollback 可能期間が確保されることを確認

---

## 3. Dirty Dependency 表（OD-04 由来）

| Change | dirty targets |
| --- | --- |
| alignment revision / start-end station | interval preview, structure preview XYZ, stationSet, analysis, projectModel, results, drawings, dxf |
| support/skew/girder offset/cross girder/section/material/bearing | structure preview, stationSet, analysis, projectModel, results, drawings, dxf |
| deck/TrafficLoadZone/load case | load distribution, projectModel loads, results, load drawings |
| solver setting | results only (model IDs保持可) |
| drawing setting | drawings, dxf only |

## 4. Naming Lock 表

| Concept | Official V2 name | Forbidden / Legacy |
| --- | --- | --- |
| V2 root aggregate | `BridgeModelerV2Document` | never call it `BridgeProject` |
| Structure | `BridgeStructureModel` | distinct from `BridgeDefinition` |
| Analysis | `AnalysisModelSpec` → generates `ProjectModel` | `ProjectModel` remains FEM persistence shape |
| Host key | `ProjectModel.bridgeModelerV2` | `bridge`, `BridgeProject` 内ネスト, `generatedFem` |

## 5. 矛盾解消ノート

| ID | 内容 | 処理 |
| --- | --- | --- |
| C-01 | PR-BMV2-001 の前提PRを PR-BMV2-008 に更新 | 文書修正は次バッチ。ここでは方針のみ記載 |
| C-02 | AnalysisModelSpec の正は 04 の定義。01は参照に置換 | 本文書で反映済み |
| C-03 | BridgeInterval.id は Phase1で生成。形式 `intv:{stableLabelOrUuid}` | 本文書で反映済み |
| C-04 | 配列index ID禁止。xgir/dz/tlz/lp は意味キー（例 `xgir:{fromGirId}:{toGirId}:{stationMm}`） | 本文書で反映済み |
| C-05 | V2解析経路は FE ProjectModel → /api/analysis/run。/api/fem/generate はLegacy専用 | 本文書で反映済み |

## 6. 完了条件

- [x] OD-01〜05 が RESOLVED
- [x] blocking OD = 0
- [x] 3ファイル（13, _supervisor, 12）更新済み
- [x] docs 以外の変更なし

## 7. 未解決事項

（なし — 全 OD が RESOLVED）
