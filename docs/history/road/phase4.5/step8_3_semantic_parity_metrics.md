# Phase 4.5 Step 8.3 — Semantic Parity Metrics and Structural Checks

> **Status:** Implemented
> **Date:** 2026-07-11

## Purpose

Step 8.3 extends the Step 8.2 semantic comparison helper with quantitative geometry and topology metrics, per-model structural validation, support parity, and section/material property parity. The goal is Gate A (model validity) and partial Gate B (geometry/topology/property/boundary) detection without changing generators, adapters, golden files, or UI.

Source of truth for evaluation criteria: `docs/liner/phase4.5/step8_semantic_parity_spec.md`.

## Scope

- Geometry metrics (M001–M009 diagnostic subset).
- Topology metrics (degree histogram, connectedness, parallel/self-loop candidates).
- Structural validation (invalid endpoints, self-loops, non-finite geometry, zero-length members, isolation, disconnection).
- Support parity by matched node geometry and boolean fixity.
- Section/material property parity on matched members (physical values, not IDs).
- Backward-compatible `ParityReport` / `ParityReportSummary` extensions.
- Fixture-backed and unit tests under `semanticParity`.

## Non-Scope

- Load, mass, static/dynamic analysis response parity (Step 8.4–8.6).
- Generator, adapter, golden, schema, backend, or UI changes.
- Graph isomorphism or exact mesh topology equality.
- Feature flag rollout criteria (Step 8.7).

## File Structure

| File | Role |
| --- | --- |
| `modelGraph.ts` | Shared graph/geometry helpers (adjacency, lengths, bounding box, orientation) |
| `geometryParity.ts` | Geometry metrics and cross-model geometry comparison |
| `topologyParity.ts` | Topology metrics and connectivity comparison via matched nodes |
| `structuralValidation.ts` | Per-model validity diagnostics |
| `supportParity.ts` | Support matching on matched nodes, fixity comparison |
| `propertyParity.ts` | Section/material/orientation parity on matched members |
| `compare.ts` | Integrates Step 8.2 matching with Step 8.3 metrics |
| `types.ts` | Extended metrics and summary types |
| `normalize.ts` | Adds `materials` normalization (backward-compatible) |
| `__tests__/semanticParityMetrics.test.ts` | Fixture matrix tests |
| `__tests__/geometryParity.test.ts` | Geometry unit tests |
| `__tests__/topologyParity.test.ts` | Topology unit tests |
| `__tests__/structuralValidation.test.ts` | Validation unit tests |
| `__tests__/supportParity.test.ts` | Support unit tests |
| `__tests__/propertyParity.test.ts` | Property unit tests |
| `__tests__/fixtures/semanticParityFixtures.ts` | Readable `ProjectModel` fixtures |

## Geometry Metrics

Computed per model (ID/order independent):

- `nodeCount`, `memberCount`
- `boundingBox` (min/max over finite node coordinates)
- `centroid` (mean of finite node positions)
- `memberLengths` — min, max, mean, total, count
- Cross-model (when matches exist): `maxMatchedNodeDistance`, `maxMatchedMemberLengthDelta`, `matchedMemberLengthDeltas`

Non-finite coordinates produce NaN bounding box/centroid and normalization/validation errors. Comparisons use `coordinate` and `length` tolerance bands from `DEFAULT_SEMANTIC_TOLERANCE`.

## Topology Metrics

Undirected graph from normalized node keys and member endpoint pairs:

- `degreeHistogram`
- `isolatedNodeCount`
- `connectedComponentCount`, `connectedComponentSizes`
- `parallelEdgeCandidateCount` (multiple members on same endpoint pair)
- `selfLoopCandidateCount`
- `unmatchedConnectivityEdgeCount` (left edges not present on right via matched nodes)

Parallel members are recorded as **warnings/ambiguity**, not automatic invalidity. Degree histogram differences are warnings; isolated/disconnected differences are errors.

## Structural Validation

Per-side checks before parity status:

| Code | Severity | Condition |
| --- | --- | --- |
| `SEMANTIC_MEMBER_MISSING_ENDPOINT` | error | Member node reference missing |
| `SEMANTIC_MEMBER_SELF_LOOP` | error | `nodeIKey === nodeJKey` |
| `SEMANTIC_MEMBER_NON_FINITE_GEOMETRY` | error | Non-finite endpoint coordinates |
| `SEMANTIC_MEMBER_ZERO_LENGTH` | blocker | Length below length tolerance |
| `SEMANTIC_NODE_ISOLATED` | blocker | Node degree 0 |
| `SEMANTIC_MODEL_DISCONNECTED` | blocker | More than one connected component |
| `SEMANTIC_PARALLEL_EDGE_CANDIDATE` | warning | Duplicate endpoint pair |

## Connectedness and Zero-Length

- Connectedness: single component required for validity (`connectedComponentCount === 1`).
- Zero-length: `‖end − start‖` compared to `length.absolute` (default `1e-4` m); near-zero members are invalid, not silently equivalent.

## Support Parity

- Supports are keyed by **matched node coordinate keys**, not `nodeId` / support IDs.
- Boolean fixity (`ux`–`rz`) compared exactly on matched node pairs.
- Missing support on one side → structured `support` mismatch (error).
- Multiple supports on the same matched node → ambiguity → **indeterminate**.

## Property Parity

On matched members only:

- Section: `area`, `iy`, `iz`, `j`
- Material: `elasticModulus`, `shearModulus`, `poissonRatio`, `density`
- IDs are used only for lookup; equality is by resolved numeric properties.
- `undefined` is **not** treated as `0`; missing on one side is a mismatch.
- `orientationVector`: same direction passes; opposite direction yields warning mismatch; unrelated directions yield error mismatch. I/J reversal does not affect endpoint matching (Step 8.2 behavior preserved).

## ParityReport Extension

`ParityReport.metrics` adds:

```typescript
{
  geometry: { left, right, equivalent },
  topology: { left, right, equivalent },
  structuralValidation: { left, right },
  support: SupportParitySummary,
  property: PropertyParitySummary,
}
```

`ParityReportSummary` adds optional: `geometryEquivalent`, `topologyEquivalent`, `structurallyValid`, `supportEquivalent`, `propertyEquivalent`.

Existing fields (`status`, `counts`, `mismatches`, `ambiguities`, etc.) are unchanged.

## Status Rules

| Status | Condition |
| --- | --- |
| `invalid` | Normalization or structural validation errors on either side |
| `indeterminate` | Node/member/support ambiguities; comparison cannot be resolved one-to-one |
| `different` | Unmatched items, blocking mismatches, geometry/topology/support/property failures |
| `equivalent` | All required comparisons pass; warnings alone do not upgrade to equivalent |

## Fixtures and Tests

Fixture matrix (`semanticParityMetrics.test.ts`):

| Fixture | Expected status |
| --- | --- |
| equivalent-different-ids | `equivalent` |
| equivalent-reversed-members | `equivalent` |
| coordinate-outside-tolerance | `different` |
| missing-member | `different` |
| disconnected | `invalid` |
| support-mismatch | `different` |
| property-mismatch | `different` |
| near-equal-property | `equivalent` |
| zero-length-member | `invalid` |
| ambiguous-duplicate-node | `indeterminate` |
| duplicate-parallel-member | `indeterminate` |
| invalid-missing-endpoint | `invalid` |

Run tests:

```bash
cd frontend && npm run test -- semanticParity
```

## Step 8.4+ Follow-ups

- **Step 8.4:** Load parity, boundary station alignment, full Gate B property/boundary layers.
- **Step 8.5:** Static analysis parity (Gate C) with solver wrapper.
- **Step 8.6:** Dynamic/modal parity (Gate D).
- **Step 8.7:** Feature flag ON criteria wired to semantic reports; tolerance calibration from regression fixtures.

## Document History

| Date | Change |
| --- | --- |
| 2026-07-11 | Step 8.3: Geometry/topology metrics, structural validation, support/property parity, extended ParityReport, fixtures and unit tests. |
