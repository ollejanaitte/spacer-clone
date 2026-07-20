# P4-D07 Implementation Plan — Persistence / Legacy / Migration

**Date:** 2026-07-21
**Status:** AUTHORITATIVE — PLAN APPROVED by supervisor (2026-07-21)
**Authoritative scope:** [p4_d07_scope.md](p4_d07_scope.md)
**Extraction:** [p4_d07_official_spec_extraction.md](p4_d07_official_spec_extraction.md) (APPROVED)
**Baseline:** `1e2e0990` (P4-D06 COMPLETE)
**Branch:** `feat/phase4-p4-d07-persistence-migration`

---

## 1. Purpose

D01–D06 で確立した P4 形状を **単一 write-target**（`roadDesignDocument`）で round-trip し、legacy read-old と idempotent migration を統合検証する。

**In scope:** save/load strip、geometry extension v0.2.0、legacy adapter 確認、統合テスト強化、D07-C01..C06 証跡。

**Out of scope:** Full Importer workflow、schema bump、dual write、result cache persistence、D08 E2E gate。

---

## 2. Architecture summary

```text
App save/load
  → serializeProjectForPersistence / hydrateProjectLinerFromPersistence (linerProjectDraft)
  → domainDraftToRoadDesignDocument / roadDesignDocumentToDomainDraft (mapper)
  → extensions["spacer.liner/domain-draft-vnext-geometry"] payload 0.2.0

Legacy open
  → migrateLinerDraftToVNext (project.liner.draft)
  OR adaptLegacyRoadInput (importer JSON via persistence gateway)

Migration framework
  → createMigrationRegistry same-version no-op
  → geometry payload v0.1.0 normalize on read (mapper)
```

---

## 3. File inventory

### 3.1 Modified implementation

| Path | Change |
| --- | --- |
| `liner/adapters/linerProjectDraft.ts` | Strip `drawingDocument` on serialize; RDD-only persist |
| `liner/adapters/linerDomainDraftRoadDesignMapper.ts` | (existing) P4 capability + geometry payload v0.2.0 |
| `liner/schema/projectLinerMigration.ts` | (existing) read-old draft migration |
| `contracts/persistence/*` | (existing) load/save gateway |
| `contracts/legacy/road/adapter.ts` | (existing) importer read-old |
| `contracts/migration/registry.ts` | (existing) pure migration framework |

### 3.2 Tests

| Path | Gate |
| --- | --- |
| `liner/adapters/linerProjectDraft.test.ts` | D07-C01, C02, C05 |
| `liner/adapters/linerDomainDraftRoadDesignMapper.test.ts` | D07-C02, C03, C06 |
| `liner/schema/__tests__/linerDomainDraftMigration.test.ts` | D07-C03 |
| `contracts/persistence/__tests__/migrationIntegration.test.ts` | D07-C03, C05, C06 |
| `contracts/legacy/__tests__/legacyRoadAdapter.test.ts` | D07-C04 |
| `App.linerSaveLoad.test.tsx` | D07-C01 |

### 3.3 New docs

| Path | Role |
| --- | --- |
| `docs/road/phase4/p4_d07_scope.md` | AUTHORITATIVE scope |
| `docs/road/phase4/p4_d07_official_spec_extraction.md` | Persistence policy extraction |
| `docs/road/phase4/p4_d07_implementation_plan.md` | This file |

---

## 4. Gate mapping

| Criterion | Implementation | Test |
| --- | --- | --- |
| D07-C01 | `serializeProjectForPersistence` strips draft/domainDraft/drawingDocument | `linerProjectDraft.test.ts`, `App.linerSaveLoad.test.tsx` |
| D07-C02 | Mapper round-trip alignments/ldist/haunch/hoso | `linerDomainDraftRoadDesignMapper.test.ts`, `linerProjectDraft.test.ts` |
| D07-C03 | Same-version no-op + geometry v0.1 read + save/load cycle | `migrationIntegration.test.ts`, mapper + migration tests |
| D07-C04 | `adaptLegacyRoadInput` for importer projects | `legacyRoadAdapter.test.ts` |
| D07-C05 | No dual write; legacy source unchanged | `migrationIntegration.test.ts`, `linerProjectDraft.test.ts` |
| D07-C06 | `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` = `0.1.0`; reject 0.2.0 save | mapper + integration + registry |

---

## 5. Supervisor frozen decisions

| Item | Decision |
| --- | --- |
| Extension key | Geometry extension v0.2.0 sibling fields（専用 key 不採用） |
| Result cache | 永続化なし |

---

## 6. Verification commands

```bash
cd frontend && npm run typecheck && npm run lint && npm run build
cd frontend && npm run test -- src/liner src/contracts/persistence src/contracts/legacy src/contracts/migration
cd frontend && npm run test:regression
git diff --check
```

---

## 7. COMPLETE candidate

All D07-C01..C06 gates pass with evidence above; no schema bump; no dual write; `.tmp/parity-cli/**` excluded from staging.
