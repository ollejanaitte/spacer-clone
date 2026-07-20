# P4-D07 Scope — Persistence / Legacy / Migration

**Date:** 2026-07-21
**Status:** AUTHORITATIVE — `P4_D07_SCOPE_VERDICT: APPROVED` (2026-07-21, supervisor message)

**Extraction record:** [p4_d07_official_spec_extraction.md](p4_d07_official_spec_extraction.md) — **APPROVED** (EXTRACTION gate)

**Authoritative parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)
**Execution plan:** [phase4_d03_to_final_execution_plan.md](phase4_d03_to_final_execution_plan.md)
**Pattern reference:** [p4_d06_scope.md](p4_d06_scope.md)
**P4-D06 baseline:** `1e2e0990` — Reports and CSV COMPLETE (P4-D06)

---

## 1. D-step ID と正式名称

| 項目 | 値 |
| --- | --- |
| **D-step ID** | **P4-D07** |
| **正式名称** | **Persistence / Legacy / Migration** |

Phase 4 正式名称 **Road Advanced Calculation & Utilities** の第 7 実装ステップ。P4 入力の round-trip、legacy read-old、純粋 migration を統合し、**dual write 禁止**・**schema bump 禁止**を維持する。

| 正本ラベル | 意味 |
| --- | --- |
| P4-D01..D04 | Multi-alignment / LDIST / HAUNCH / HOSO 形状 |
| P4-D05 | Formal Drawing / Preview UI |
| P4-D06 | Reports and CSV |
| **P4-D07** | **Persistence / Legacy / Migration（本スコープ）** |
| P4-D08 | E2E and Final Verification |

---

## 2. 目的

P4 フィールド（multi-alignment、LDIST、HAUNCH、HOSO）の **save/load round-trip**、**legacy read-old**、**idempotent migration** を `RoadDesignDocument` 単一 write-target で完遂する。

成功基準（正本 completion gate D07-C01..C06）:

| ID | 要点 |
| --- | --- |
| D07-C01 | Save = `roadDesignDocument` only（`domainDraft` / `draft` / `drawingDocument` 非永続化） |
| D07-C02 | P4 fields round-trip（alignments, ldist, haunch, hoso） |
| D07-C03 | Migration step(s) idempotent |
| D07-C04 | Legacy read-old for pre-P4 projects |
| D07-C05 | No dual write; legacy unchanged |
| D07-C06 | `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` = `0.1.0`（bump 禁止） |

---

## 3. 対象（In scope）

### 3.1 Write path

```text
serializeProjectForPersistence
  → domainDraftToRoadDesignDocument(domainDraft)
  → project.liner.roadDesignDocument = document
  → strip domainDraft / draft / drawingDocument from persisted JSON
```

### 3.2 Read path

```text
hydrateProjectLinerFromPersistence
  → roadDesignDocumentToDomainDraft OR migrateLinerDraftToVNext (read-old)
  → in-memory domainDraft for UI
```

### 3.3 P4 field placement（監督凍結）

| Data | Placement |
| --- | --- |
| Multi-alignment geometry | Geometry extension payload `0.2.0` sibling fields（専用 key 不採用） |
| LDIST / HAUNCH / HOSO inputs | Extension arrays + capability `state` |
| LDIST / HAUNCH / HOSO cached results | **永続化なし**（recompute by default） |

Extension key: `spacer.liner/domain-draft-vnext-geometry`

### 3.4 Migration / legacy

| 項目 | 方針 |
| --- | --- |
| Migration registry | Pure steps; same-version no-op clone |
| Legacy adapter | `adaptLegacyRoadInput`; quarantine unknowns |
| `migrateLinerDraftToVNext` | `project.liner.draft` / `domainDraft` read-old |
| Geometry payload | v0.1.0 flat → v0.2.0 multi-alignment normalize on read |

---

## 4. 対象外（Out of scope）

| 項目 | 理由 |
| --- | --- |
| Full Importer target workflow (PR-26) | phase4_planning_freeze |
| Branch/merge topology migration | Deferred |
| Result cache persistence | 監督凍結 open item |
| `schemaVersion` bump | 別途承認が必要 |
| Dual write to `domainDraft` | 禁止 |

---

## 5. 品質ゲート

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | TS |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm run test -- src/liner src/contracts/persistence src/contracts/legacy src/contracts/migration` | D07 unit/integration |
| `npm run test:regression` | Golden regression |
| `git diff --check` | Whitespace |

---

## 6. 監督凍結（open item 解決）

| Item | Decision |
| --- | --- |
| Extension key split | **Geometry extension v0.2.0 sibling fields 維持**（専用 key 不採用） |
| Result cache persistence | **なし**（recompute by default） |

---

## 7. Approval record

| Field | Value |
| --- | --- |
| Verdict | **APPROVED** |
| Date | 2026-07-21 |
| Branch | `feat/phase4-p4-d07-persistence-migration` |
| Baseline | `1e2e099073d5b9128937378889e1fe9209eccd99` |
