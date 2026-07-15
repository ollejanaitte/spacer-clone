# Implementation Dependency Graph

## Critical Path

```text
PR-00 architecture manifest and dependency guard
  -> PR-01 coordinate/unit
  -> PR-02 stable ID/revision/provenance/checksum
  -> PR-03 target envelopes/schemas
  -> PR-04 validation/architecture tests
  -> IF0 / G0

IF0
  -> PR-05 raw/quarantine/version classifier
  -> PR-06 migration registry and legacy readers
  -> PR-07 target repository and atomic backend [OD10-01]
  -> PR-08 ProjectModel split migration
  -> PR-09 BridgeProject/BridgeDefinition split migration [OD6-01/02, OD9-01]
  -> PR-10 route/alias registry
  -> PR-11 result binding/staleness core
  -> IF1 / G2 (+ relevant G7)

IF0/IF1
  -> PR-12..14 shared neutral mechanisms -> SP1
  -> PR-15 package schema
  -> PR-16 TransferRecord
  -> PR-17 Road exporter/preview
  -> PR-18 Frame preflight/dry-run
  -> PR-19 three-way diff/conflict
  -> PR-20 atomic apply/rollback [source gates]
  -> IF2 / G3

IF1/IF2/SP1
  -> PR-21..30 Road slices -> G1/G3
  -> PR-31..38 Frame slices/results -> IF3/G4/G5
  -> PR-39..42 GDRAW/PRINT/DRAFT/Viewer -> G6
  -> PR-43..45 performance/recovery/Autosave -> G7
  -> PR-46..47 evidence-only legacy contraction -> policy gate
```

## Interface Freezes

| Freeze | Contents | Required reviewers | Unblocks |
|---|---|---|---|
| IF0 | SoT, envelopes/references, coordinate/unit, stable ID, revision/provenance/checksum, validation, dependency direction | Architecture, Road, Frame, Migration, Verification | Target adapters, shared mechanisms, algorithm integration preparation |
| IF1 | Raw/unknown handling, migration registry, target repository transaction, result binding/staleness | IF0 owners plus Persistence/Compatibility | Transfer apply foundation, Road/Frame target repositories |
| SP1 | Drawing/DXF/file/error/history/table/render neutral mechanisms | Shared, Road, Frame, Output Verification | Product drawing/output adapters |
| IF2 | Package, capabilities/apply profile, TransferRecord, diff/conflict/apply/rollback | Road, Frame, Transfer, Migration, Verification | Geometry-linked road/frame integration and INFLOAD reference use |
| IF3 | Frame result resources, bindings, staleness, output adapter contract | Frame Engine/Results, Output, Verification | PRINT/DRAFT/Viewer authoritative output |

An interface change after freeze is a versioned contract change with affected owner approval and
rerun of its upstream/downstream gates. Feature branches do not edit frozen shared contract files.

## PR Group Matrix

| PRs | Phase | Change group | Primary dependency | Gate/rollback |
|---|---|---|---|---|
| 00-04 | P0 | Architecture, primitive contracts, target schemas, validation | D6-D10 | G0; additive exposure off |
| 05-11 | P1 | Raw/readers, migration, atomic repository, routes, results | IF0, `OD10-01` | G2/G7; raw/prior manifest/legacy path |
| 12-14 | P2 | Shared Drawing/DXF and platform protocols | IF0/IF1 | G0/G6 foundation; compatibility facade |
| 15-20 | P3 | Package/record/export/preflight/diff/apply/rollback | IF0/IF1/SP1, source gates | G3; preview/apply flag/inverse revision |
| 21-30 | P4 | Road adapter and feature slices | IF1, IF2 where linked | G1/G3/G6; capability off/prior road revision |
| 31-38 | P5 | Frame lifecycle/mechanics/loads/combinations/results | IF1, IF2 for geometry, PR-11 | G4/G5/G7; case off/solver fallback/result invalidation |
| 39-42 | P6 | GDRAW, PRINT, DRAFT, Viewer/output adapters | SP1, passed P4/P5, IF3 | G6; previous output path |
| 43-45 | P7 | Performance, recovery, visual evidence, Autosave | Stable P1/P3-P6, open budgets/backend | G6/G7; Autosave off/manual save |
| 46-47 | P8 | Per-surface legacy write/entry contraction | G2/G3/G7, `OD6-04`, `OD10-02` | Re-enable legacy-only surface |

The exact PR-00..47 rows, dependencies, change areas, tests/gates, and exposure rollback are retained
in [stage10_gap_migration_sequence.md](./stage10_gap_migration_sequence.md).

## Parallel Workstreams

| Workstream | Owns | Consumes/produces | Merge order and conflict rule |
|---|---|---|---|
| WS-A Contracts | SoT, schemas, IDs, revision, validation, freezes | Produces IF0; co-owns IF1 hashes | Merges first; only WS-A edits shared contract files until freeze |
| WS-B Migration/Storage | Raw store, readers, repository, routes, audit, rollback | Consumes IF0; produces IF1 with WS-A | PR-05 through 11 in order; repository transaction edits serialized |
| WS-C Shared Platform | Neutral Drawing/DXF/file/history/render | Consumes IF0/IF1; produces SP1 | Facade first; no Road/Frame domain imports |
| WS-D Road | RoadDocument, importer, road/bridge features, GDRAW | Consumes IF0/IF1/IF2/SP1 | Fixtures early; schema then algorithm/test then UI/exposure |
| WS-E Frame | FrameDocument, engine, mechanics, INFLOAD, results, PRINT/DRAFT | Consumes IF0/IF1/IF2; produces IF3 | Solver assembly owner serializes core interface changes |
| WS-F Verification | Oracles, fixtures, tolerance/gate records, visual/compat tests | Reviews all freezes and G0-G7 | Independent test review; cannot waive missing oracle/tolerance |
| WS-G Performance/Recovery | Environments, fault injection, budgets, Autosave evidence | Consumes stable slices; produces G7 evidence | Harness early; no concurrent persistence transaction merge; Autosave last |
| WS-H Release/Data Governance | Usage/retention/notices/contraction | Consumes all gates and open policies | One legacy surface and decision per PR in P8 |

## Parallelization Rules

1. O1/O2 fixtures, legacy corpus inventory, route matrix, performance harness design, and semantic
   drawing fixtures may start after PR-00 without creating target contract copies.
2. Road/frame algorithm isolation may proceed after IF0; target integration waits for IF1/IF2.
3. Shared Drawing/DXF extraction may parallel P1 after IF0, but transaction-related file services wait
   for IF1 ownership.
4. A feature branch cannot define a shadow coordinate, unit, ID, revision, package, or persistence
   schema. Contract proposals flow through WS-A and affected product owners.
5. Branches merge into the approved phase base in dependency order, not into one another.
6. A PR may split smaller. It may not combine upward into schema + migration + cutover + exposure.
7. Feature exposure is last and names a reversible control that is not an ordinary dual-write switch.
8. Branch deletion is not part of this plan.

## Blocker Propagation

| Open item | Blocks | Does not block |
|---|---|---|
| `OD6-01` coordinate authority | Affected migration commit and transfer apply | Contract/raw/quarantine/reader/preview work |
| `OD6-02` stable IDs | Affected mapping/migration/apply | Namespaces, collision diagnostics, fixtures |
| `OD9-01` ambiguous bridge fields | Affected Bridge/BD migration/apply/load claim | Raw/classifier/dry-run implementation |
| `OD8-01` tolerances | Affected numerical feature release | Algorithm/fixture development with non-production bands |
| `OD8-02` reference corpus | SPACER parity/broad claim | O1/O2-qualified acceptance |
| `OD8-03` budgets | Performance G7 and production Autosave | Baseline measurement/harness work |
| `OD8-04` visual environment | Visual G6 claim | Semantic output verification |
| `OD10-01` physical persistence | Production target writer/apply/Autosave | Repository interface/fault-suite implementation |
| `OD10-02` retention policy | P8 entry/write contraction | Reader/telemetry/restore preparation |
