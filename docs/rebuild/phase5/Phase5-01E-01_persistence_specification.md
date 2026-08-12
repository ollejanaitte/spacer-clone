# Phase 5-01 Step E-01: Persistence 設計（凍結案）

## 1. 目的

Phase 5-02の永続化縦断（Create → … → Import → 再検証）を凍結する。
新Project Data Core（`next/persistence`）にSuperstructureDocumentを載せる。

- baseline: `242667fce9532daa35c1240847305559bea911fb`（Step D merge後）
- 日付: 2026-08-12

## 2. 縦断仕様（凍結）

```
Create（業務/Project作成）
  ↓
Bridge Layout選択（modules.bridgeLayout 設定済みであること）
  ↓
Superstructure生成（modules.superstructure 初期化＋SuperstructureDocument作成）
  ↓
Edit（上部工入力: girder/deck/bearing等）
  ↓
Auto Save（modules.superstructure.data.superstructureDocument を自動保存）
  ↓
Close（project.json 確定）
  ↓
Restart
  ↓
Restore（project.json 読込・strict parse）
  ↓
Geometry再生成（SuperstructureDocument → binding → engine → snapshot）
  ↓
Analysis結果復元（再計算 or digest突合）
  ↓
.spacerproj Export（manifest + checksum）
  ↓
Import（再parse・検証）
  ↓
再検証（Integrity Gate・derived一致）
```

## 3. 保存対象（凍結）

| 対象 | 保存 | 備考 |
|---|---|---|
| Project（metadata含む） | 保存 | `project.json` |
| modules.road / terrain / bridgeLayout | 保存 | 正本 |
| modules.superstructure.data.superstructureDocument | **保存（canonical）** | 上部工正本 |
| Span / Support Handoff | **非保存** | derived・再生成＋一致検証 |
| GeometrySnapshot本体 | **非保存** | fingerprintのみ保存・再生成 |
| Analysis結果（member forces等） | **再評価** | 案: digest（計算hash）のみ保存＋再計算時に突合。結果本体は再計算で再現（決定論） |
| reactionResults | 同上 | 再計算で再現 |
| 3Dメッシュ | 非保存 | fingerprint keyで再生成 |

### 3.1 Analysis結果の保存方針（凍結）

- 保存: `reactionResults.digest`・`analysisModel.modelDigest` のみ（fingerprint）
- 再現: reload時にSuperstructureDocument→解析を再実行し、digest一致を検証
- digest不一致（モデル変更・solver変更）→ STALE（結果は非採用・fail-closed）
- 本体保存はしない（決定論再計算を正とする）。巨大化・不正データ混入を防止

## 4. version / schema migration（凍結）

- SuperstructureDocument schemaVersion: `0.1.0`
- PDC `PROJECT_MIGRATIONS`: Phase 5-02でsuperstructure module追加用migrationを定義
  - 旧project（superstructure module空）→ 空moduleを初期化（既存createInitialModules動作に合わせる）
  - 未知schemaVersion → reject（fail-closed）
- schema変更時はversion increment＋migration関数追加（既存PDC流儀）

## 5. invalid data / partial data（凍結）

- `parseProject` strict: unknown module key → reject
- SuperstructureDocumentのparse失敗 → project読込は成功・moduleは `invalid` 状態（fail-closed）
  - 破損を黙って捨てない（validationErrors保持）
- partial data（girderConfiguration欠落等）→ 上部工moduleを `invalid` 表示・write reject
- MISSING値（deck厚さ等）はpartialとして許容（status: MISSING）・rejectしない

## 6. backward compatibility（凍結）

- 旧project（superstructure module無し/空）: 読込可（空module初期化）
- 旧`ProjectModel.apolloBridgeProjectSuperstructure` sidecar: 新システムでは無視（旧システム用）
- 旧BSDD: 無視（新正本ではない）
- `.spacerproj` v1.0.0形式を維持（新module追加のみ）

## 7. autosave / crash recovery（凍結）

- Auto Save: `persistentProjectManager.updateProjectModule` → enqueueSave（既存・serialized）
- 一時ファイル + 最終書込（既存）・`.spacerbak` ローテーション5（既存）
- crash recovery: 起動時 `.backup`/`.spacerbak` からの復元フロー（既存）を適用

## 8. integrity gate（凍結）

Phase 5-02のCompletion Gate（WP-J）:
- SuperstructureDocument valid（schema・fail-closed）
- derived一致（Handoff再生成と一致・snapshot fingerprint突合）
- Reference Bridge比較（E-02）PASS
- 必須tests PASS（E-03）

## 9. 検証・tests観点（WP-I）

- save→restart→restore（SuperstructureDocument復元）
- Geometry再生成（fingerprint一致）
- Analysis digest突合（STALE検出）
- .spacerproj round-trip（manifest・checksum）
- invalid module（reject/invalid状態）
- migration（旧project読込）
