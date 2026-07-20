# P4-D07 Official Spec Extraction — Persistence Policy

**Date:** 2026-07-21
**Status:** APPROVED — supervisor EXTRACTION gate (2026-07-21)

**Scope parent:** [p4_d07_scope.md](p4_d07_scope.md)
**Phase 4 parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)

---

## 1. Purpose

[phase4_planning_freeze.md](phase4_planning_freeze.md) persistence policy、[phase4_design_document.md](phase4_design_document.md) P4-D07 節、[schema_migration_policy.md](../legacy-integration/schema_migration_policy.md) から、save/load / migration / legacy の **semantic authority** を抽出する。

---

## 2. Source documents

| Source | Use |
| --- | --- |
| [phase4_planning_freeze.md](phase4_planning_freeze.md) §Persistence policy | Write target, no dual write, no DrawingDocument persist |
| [phase4_design_document.md](phase4_design_document.md) P4-D07 | Write/read paths, field placement, tests |
| [schema_migration_policy.md](../legacy-integration/schema_migration_policy.md) | Semver, read compatibility, idempotent migration |
| [phase4_completion_gate.md](phase4_completion_gate.md) | D07-C01..C06 |

---

## 3. Write-target adoption

| Surface | Policy | P4-D07 |
| --- | --- | --- |
| `project.liner.roadDesignDocument` | Canonical persisted road state | **採用** |
| `project.liner.domainDraft` | In-memory UI only | **非永続化** |
| `project.liner.draft` | Legacy read-old only | **非永続化** |
| `project.drawingDocument` / `liner.drawingDocument` | Runtime regeneration | **非永続化** |
| P4 capability blocks | `topologyCapability`, `ldistCapability`, `haunchCapability`, `hosoCapability` | **採用** |
| Geometry extension | `spacer.liner/domain-draft-vnext-geometry` payload `0.2.0` | **採用** |

---

## 4. P4 field placement（監督凍結）

| Field group | Storage | Dedicated extension key |
| --- | --- | --- |
| Multi-alignment `alignments[]` | Geometry payload v0.2.0 `domainDraft` | **不採用** |
| `ldistJobs` | Geometry payload sibling + `ldistCapability` | **不採用** |
| `haunchDefinitions` | Geometry payload sibling + `haunchCapability` | **不採用** |
| `hosoDefinitions` | Geometry payload sibling + `hosoCapability` | **不採用** |
| LDIST/HAUNCH/HOSO result rows | Recompute on load | **永続化なし** |

---

## 5. Migration rules

| Rule | Authority |
| --- | --- |
| Same `schemaVersion` migration = explicit no-op clone | migration registry |
| Geometry payload v0.1.0 flat accepted on read; writes use v0.2.0 | linerDomainDraftRoadDesignMapper |
| `migrateLinerDraftToVNext` for `project.liner.draft` / `domainDraft` | projectLinerMigration |
| Legacy importer → RDD via adapter; no legacy write | persistence save path |
| Idempotent: repeated load/save yields identical target JSON | D07-C03 |
| Source legacy JSON unchanged on read | D07-C05 |

---

## 6. Schema version

| Constant | Value | P4-D07 |
| --- | --- | --- |
| `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` | `0.1.0` | **固定**（bump 禁止） |
| Geometry extension `payloadVersion` | `0.2.0` write / `0.1.0` read | **採用** |
| `PROJECT_LINER_METADATA_SCHEMA_VERSION` | `0.1.0` | 変更なし |

---

## 7. Test evidence mapping

| Gate | Primary test |
| --- | --- |
| D07-C01 | `linerProjectDraft.test.ts`, `App.linerSaveLoad.test.tsx` |
| D07-C02 | `linerDomainDraftRoadDesignMapper.test.ts`, `linerProjectDraft.test.ts` |
| D07-C03 | `linerDomainDraftRoadDesignMapper.test.ts`, `migrationIntegration.test.ts`, `linerDomainDraftMigration.test.ts` |
| D07-C04 | `legacyRoadAdapter.test.ts` |
| D07-C05 | `migrationIntegration.test.ts`, `linerProjectDraft.test.ts` |
| D07-C06 | `linerDomainDraftRoadDesignMapper.test.ts`, `migrationIntegration.test.ts`, `contractVersionRegistry.ts` |

---

## 8. Out of scope confirmation

| Item | Status |
| --- | --- |
| Full Importer target workflow | **非採用** |
| Result cache in extensions | **非採用** |
| Dedicated P4 extension keys | **非採用**（監督凍結） |
| `schemaVersion` 0.2.0 bump | **非採用** |
