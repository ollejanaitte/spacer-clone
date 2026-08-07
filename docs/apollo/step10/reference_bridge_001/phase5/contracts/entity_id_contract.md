# Entity ID Contract — Common Bridge Data Model

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 P5-1

## 1. Required ID types

The Common Bridge Data Model MUST define the following ID types:

| ID type | Purpose |
|---------|---------|
| `bridgeId` | Root bridge document identity |
| `alignmentId` | Alignment / centerline |
| `supportId` | Support / pier / abutment |
| `girderId` | Girder / main girder line |
| `gridPointId` | Grid point on girder/grid line |
| `nodeId` | Structural node |
| `memberId` | Structural member |
| `materialId` | Material definition |
| `sectionId` | Section definition |
| `loadCaseId` | Load case |
| `loadCombinationId` | Load combination |
| `analysisResultId` | Analysis result reference (future) |
| `designCheckId` | Design check / adopted design value |
| `reportItemId` | Report specification item |
| `drawingSheetId` | Drawing sheet |
| `drawingItemId` | Drawing item |
| `sourceRecordId` | Source golden/OCR/source record |
| `traceabilityId` | Traceability link |

## 2. Rules

1. **Stable**: an ID must not change across save/reload, serialize/deserialize, or migration.
2. **Deterministic where possible**: same source input yields same ID.
3. **Save/reload invariant**: round-trip preserves every ID byte-for-byte.
4. **Display name separated from ID**: `displayName` is metadata, never the identity.
5. **No array index as ID**: positional indices must not serve as entity IDs.
6. **No Reference-Bridge prefix in Common contract**: prefixes such as `RB-S10-001`
   are fixture-level only; the Common ID namespace is bridge-agnostic.
7. **ID uniqueness within document**: entity IDs are unique within their kind
   (and globally unique when they reference the same identity namespace).

## 3. ID forms

- Common contract IDs are strings. Deterministic IDs are constructed from stable
  semantic keys (kind + stable coordinate/name token), never from array position.
- Source golden IDs (`G-GEO-*`, `G-SM-*`, `G-DES-*`, `G-RPT-*`, `G-DWG-*`,
  `ENT-*`, `GEO-*`, etc.) are preserved as `sourceRecordIds` / `goldenId`
  references; the Common Model assigns its own stable `*Id`.

## 4. Reference mapping

Reference Bridge 001 fixture IDs are stable and recorded in
`reference_bridge_mapping_contract.md`. The mapping preserves the correspondence
between Common IDs and Golden entity IDs for traceability.
