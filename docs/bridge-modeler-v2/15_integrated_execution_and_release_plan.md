# 15 — Integrated Execution and Release Plan

Date: 2026-07-14  
Status: 計画文書（監督決定に基づく）  
Authority: `_supervisor_decisions.md`  
Scope constraint: 統合ブランチ方針、Vertical Slice 定義、Checkpoint、release gate

---

## 1. 目的

Bridge Modeler V2 の全 PR（PR-BMV2-001〜023）を Vertical Slice 単位で統合し、段階的に main へ merge する計画を定義する。各 Slice の前提 PR、完了条件、必須テスト、手動確認、rollback 方針、次 Slice 引渡しを規定する。

## 2. 統合ブランチ方針

| 項目 | 内容 |
| --- | --- |
| ブランチ名 | `feature/bridge-modeler-v2` |
| 方針 | 長期統合ブランチ。PR-BMV2-001〜023 をこのブランチへ順次 merge |
| main merge | feature flag OFF 既定。完成した vertical slice 単位で merge 可 |
| UI 未完成時 | feature flag で隠すため main merge 可 |
| Legacy 回帰テスト | 各 main merge ゲートで必須 |

## 3. Vertical Slices

### Slice A (Phase1): LINER選択→始終測点→保存再読込→区間preview

| 項目 | 内容 |
| --- | --- |
| **含む PR** | PR-BMV2-008, PR-BMV2-001, PR-BMV2-014, PR-BMV2-002, PR-BMV2-022, PR-BMV2-003, PR-BMV2-004, PR-BMV2-005 |
| **前提** | なし |
| **完了条件** | LINER 選択→始終測点→保存再読込 (bridgeModelerV2)→区間 preview が動作する |
| **必須テスト** | unit: adapter/station, persist roundtrip, E2E flag off legacy |
| **手動確認** | 曲線線形で XYZ 目視 |
| **rollback** | flag off + revert slice commits |
| **次 Slice 引渡し** | `RoadAlignmentReference` + `BridgeInterval` persisted |

### Slice B (Phase2): 構造入力→主桁横桁→3D構造preview

| 項目 | 内容 |
| --- | --- |
| **含む PR** | +PR-BMV2-006, PR-BMV2-007, PR-BMV2-009, PR-BMV2-010 |
| **前提** | Slice A 完了 |
| **完了条件** | A1/P1/A2→主桁横桁→3D 構造 preview が動作する |
| **必須テスト** | stable ID roundtrip, offsetControlPoints interpolation unit |
| **手動確認** | — |
| **rollback** | structure section disable |
| **次 Slice 引渡し** | `BridgeStructureModel` |

### Slice C (Phase3+solver): FEM生成→ProjectModel→Viewer→静的解析→結果選択

| 項目 | 内容 |
| --- | --- |
| **含む PR** | +PR-BMV2-011, PR-BMV2-012, PR-BMV2-013, PR-BMV2-015, PR-BMV2-018, PR-BMV2-019 (部分) |
| **前提** | Slice B 完了 |
| **完了条件** | FEM 生成→ProjectModel→Viewer→静的解析→結果選択 が動作する |
| **必須テスト** | 15stage golden, IdCorrespondence, stale result 非表示 |
| **手動確認** | — |
| **rollback** | — |
| **次 Slice 引渡し** | `ProjectModel` + results mapping |

### Slice D (Phase4): Deck/TLZ→分配→再解析

| 項目 | 内容 |
| --- | --- |
| **含む PR** | +PR-BMV2-016, PR-BMV2-017 + rerun analysis |
| **前提** | Slice C 完了 |
| **完了条件** | Deck/TLZ→分配→再解析 が動作する |
| **必須テスト** | excluded zone, factor sum ≈ 1 |
| **手動確認** | — |
| **rollback** | — |
| **次 Slice 引渡し** | loads on `ProjectModel` |

### Slice E (Phase5): DrawingDocument→DXF、preview parity

| 項目 | 内容 |
| --- | --- |
| **含む PR** | +PR-BMV2-020, PR-BMV2-021, PR-BMV2-023 |
| **前提** | Slice D 完了 |
| **完了条件** | DrawingDocument→DXF、preview parity が動作する |
| **必須テスト** | entity count/coord parity, LibreCAD 手動 |
| **手動確認** | — |
| **rollback** | — |
| **次 Slice 引渡し** | release candidate |

## 4. Checkpoints / main 保護 / release gate

| Checkpoint | Slice | 内容 |
| --- | --- | --- |
| CP-A | Slice A 完了後 | Phase1 リリース可能。main merge ゲート |
| CP-B | Slice B 完了後 | Phase2 リリース可能。main merge ゲート |
| CP-C | Slice C 完了後 | Phase3 リリース可能。main merge ゲート |
| CP-D | Slice D 完了後 | Phase4 リリース可能。main merge ゲート |
| CP-E | Slice E 完了後 | 最終リリースゲート |

### Schema 順序

- `bmv2-1.0.0` を PR-BMV2-001 / PR-BMV2-005 で導入
- 破壊的変更禁止（additive only）

### Fixture 順序

- 09/16 定義の fixture 1〜15 を Slice 進行に合わせて追加

### E2E

- 各 Slice 末に追加

### rollback 単位

- rollback 単位 = Slice

### 最終リリースゲート

- Slice E + Legacy 回帰
- OD-05 条件未達でも V2 リリース可（Legacy 残存）

## 5. 完了条件

1. Slice A〜E が全て定義される
2. 各 Slice に前提 PR、完了条件、必須テスト、手動確認、rollback、次 Slice 引渡しが記載される
3. Checkpoint CP-A〜E が存在する
4. schema 順序、fixture 順序、E2E 追加タイミングが規定される
5. 最終リリースゲートが規定される

## 6. 未決事項

| ID | 内容 | 影響 | Status |
| --- | --- | --- | --- |
| OD-05 | Coexistence end criteria | Legacy 非推奨化 | → [15 §Release Gate](#4-checkpoints--main-保護--release-gate) |
