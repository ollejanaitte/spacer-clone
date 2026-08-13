# Phase 7.2D: Persistence / Migration / backward compat + Bridge/downstream + STALE

- Phase: 7.2 Road/LINER Rescue 完全設計・Design Freeze
- baseline: 86d4d72e80dd21863c4dcdf77d6f475f7647355b
- 日付: 2026-08-13
- 凍結: D-08（Persistence/Migration） / D-09（Bridge/downstream） / D-10（STALE）

## 1. Persistence / Migration / backward compatibility（D-08 Freeze）

### 1.1 正本保存（Freeze）

- **正本**: `modules.road.data.roadData`（Canonical Road Input・LinerDomainDraftVNext準拠・`_meta.source`付き）。
- **derived非保存**: RoadDesignDocument・intermediate・mesh・CIMは保存しない（再生成）。
- **legacy read-only保全**: `project.liner` と `modules.road.data.roadInput` は移行後も読める（削除しない・書かない）。
- Auto Save: 正本のみ保存。
- restart restore: 正本読込→derived再生成→下流再計算（既存ProjectManager経路をADAPT）。
- .spacerproj export/import: 正本 + RoadDesignDocument（interchange）をexport・import時に復元。

### 1.2 migration（Freeze・非破壊・fail-closed）

| ケース | 規則 |
|---|---|
| project.linerのみ | domainDraftVNext → 正本（決定論・`_meta.source="liner"`）。 |
| roadInputのみ | label/horizontal/vertical/crossSections → 正本（field-mapping・`_meta.source="roadInput"`）。空/既定→空正本。 |
| 両方 | conflict detection: roadInputがReference Mountain既定のみ→**project.liner優先** / roadInput実編集→**roadInput優先** / 判定不能→**block（fail-closed）**。 |
| 新規 | 空正本（default）。 |
| migration失敗 | fail-closed・元データ不変・issue記録。 |
| version mismatch | 旧0.1.0-0.3.0はmigration registryで処理・非対応→fail-closed。 |
| legacy欠損 | NOT_AVAILABLEで閉じる（発明しない）。 |

- **backward compatibility**: 旧Project（project.liner/roadInput保持）は読込可能・下流（BridgeLayout等）の既存参照が壊れない。
- **checksum/fingerprint**: 正本に `contentChecksum`（canonical JSON sha256・決定論）を付与・stale検出に使用。
- **rollback**: migration前にlegacy dataをそのまま保持（破壊しない）→ いつでも旧経路へ戻せる。

## 2. Bridge Layout / downstream handoff（D-09 Freeze）

### 2.1 RoadはPhase 4〜7の上流

```
Road（正本）→ Bridge Layout → Superstructure → Substructure → Analysis
                  ↘ Road CIM → Integrated 3D
```

### 2.2 変更種別→downstream impact（Freeze）

| Road変更 | Terrain | BridgeLayout | Super/Sub | Analysis | CIM | Integrated3D |
|---|---|---|---|---|---|---|
| station/XY変更 | recompute | recompute | recompute | stale | recompute | recompute |
| horizontal変更 | — | recompute | recompute | stale | recompute | recompute |
| vertical変更 | — | recompute | recompute | stale | recompute | recompute |
| width変更 | — | recompute | recompute | stale | recompute | recompute |
| cross slope変更 | — | recompute | recompute | stale | recompute | recompute |
| line削除/追加 | — | invalid（参照line消滅） | invalid | stale | recompute | recompute |

- **Bridge Layout handoff正式source**: 正本Road → BridgeLayout module（既存Phase 4契約を維持）。
- **stable ID**: 正本のalignment/line IDはuuid5決定論（Phase 7-01 D-11と整合）。
- **station/coordinate reference**: 正本のstationingを唯一の測点source（下流は再計算・再参照）。
- recompute = 下流再生成（決定論）/ stale = 結果無効化（Phase 7 stale契約）/ invalid = 参照不成立（fail-closed）。

## 3. STALE / Invalidation（D-10 Freeze・Phase 7契約と整合）

### 3.1 依存関係

```
Road（正本）→ Bridge Layout → Superstructure/Substructure → Analysis → CIM
```

### 3.2 変更種別→状態（Freeze）

| 変更種別 | 影響 |
|---|---|
| 正本内容変更（station/XY/vertical/width/crossSlope/line） | 下流は **STALE / recompute**（silent維持禁止） |
| line削除で参照消滅 | **INVALID**（fail-closed・block） |
| 正本schema/version変更 | **migration required** |
| 正本内容不変 | **no impact**（fingerprint一致） |

- **STALE判定**: 正本 `contentChecksum` を下流成果のbindingに使用（Phase 7 IF3 stale契約と同じfingerprint比較方式）。
- **矛盾しない**: Phase 7で完成したAnalysis stale contract（3段Gate）はそのまま維持・Road変更はGate1（上流freshness）でSTALE検出。
- **silent divergence防止**: 下流成果は正本checksumと一致しない場合「有効」と表示しない。

### 3.3 invalidation実装方針（Freeze）

- Road正本変更→ `contentChecksum` 更新→ 下流bindingと比較→ 不一致→ STALE/invalid表示。
- 下流モジュール（BridgeLayout/Super/Sub/Analysis）の既存stale機構を利用（新機構を勝手に作らない）。
