# BridgeProject → GeometryEngineInput mapping 表（Phase 3-3）

## 1. mapping（CBDM → GeometryEngineInput）

| GeometryEngineInput | CBDM source | 抽出/導出 | 注記 |
|---------------------|-------------|-----------|------|
| `supports[].id` | `bridgeGeometry.supports[].id` | 直接 | |
| `supports[].stationM` | `fields.station` または `fields.stationM` | 直接（数値） | bound では全 support 必須 |
| `supports[].skewRad` | `fields.skew` または `fields.skewRad` | 直接（数値） | 無ければ engine が 0（legacy） |
| `spanLengthsM[]` | `bridgeGeometry.spans[].fields.spanLength` | startStation 順に整列 | **Phase 3-3 追加** |
| `bridgeLengthM` | alignment aggregate `bridgeLength` または support span | 直接/導出 | **Phase 3-3 追加** |
| `deckSpecs[].widthM` | `bridgeGeometry.deck[].fields.widthM` | 直接 | thicknessM は SUPERSTRUCTURE 入力（無→NOT_AVAILABLE） |
| `girders[].offsetM` | —（CBDM に無し） | **SUPERSTRUCTURE 入力** | invent 禁止 |
| `alignmentIds[]` | `alignments.alignments[].id` | 直接 | |
| `gridPointIds[]` | `bridgeGeometry.gridPoints[].id` | 直接 | Phase 3-2 CBDM は空（endpoint fallback） |
| `unresolved[]` | resolutionRegistry + analysisReference | 直接 | |

## 2. engine の正準採用（Phase 3-3 P1）

- `input.supports` が**全て finite stationM** を持つ場合、それを **global alignment station** として採用。
  - support line station = global（例: 50..450）
  - girder / deck の station 範囲 = [first, last]
  - skew = per-support（finite 時）
- legacy（station 無し）: 従来の span 累積（0..bridgeLengthM）・skew=0。
- **mixed station は fail-closed**（一部だけ station がある場合はエラー）。

## 3. WF-01 alignment-binding 仕様

- capability `alignment-binding`: IMPLEMENTED / ACTIVE
- WF-01 evidence: `linerEvidence`（`project.liner` 有無 → VALID/EMPTY）
- 空プロジェクト: WF-01 = RECOMMENDED（推奨工程の先頭）
- liner あり: WF-01 = READY（入力 VALID・結果未生成）
- 依存ガード: `BINDING_PREREQUISITE_GUARD = "PENDING_STEP_4E"`（WF-02 gating は不変）

## 4. 未 binding / 未消費 の区別

| 項目 | 状態 |
|------|------|
| support station / skew / XYZ / tangent | **BOUND**（engine が正準採用） |
| span lengths / bridge length | **BOUND**（adapter → engine） |
| deck width | **BOUND**（deckSpecs） |
| deck thickness | 受け渡し不可（CBDM に無し）→ **SUPERSTRUCTURE 入力待ち**（NOT_AVAILABLE 明示） |
| girder offsets | **SUPERSTRUCTURE 入力**（binding 対象外） |
| grade / crossfall / vertical | **受け渡し済み・未消費**（AlignmentConnector は `grade?`/`crossfallPercent?` を返すが、engine は未使用。Phase 3-3 スコープ外） |
| grid panel / cross girder / section stations | **未 binding**（CBDM に無し。RB-001 の gridPanelSpecs 等は SAMPLE mode 専用） |
