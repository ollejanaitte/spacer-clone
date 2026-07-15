# Risks, Acceptance Gates, and Rollback

## Risk Scale

| Priority | Meaning |
|---|---|
| P0 | Coordinate/numerical/data corruption, wrong association, irreversible migration, or lost rollback |
| P1 | Major product capability or evidence required for product validity |
| P2 | Output, operation, quality, compatibility, or test completeness |
| P3 | Future improvement, optimization, or isolated ownership cleanup |

## P0 Risk Register

| Risk | Impact | Prevention | Detection/verification | Block/rollback |
|---|---|---|---|---|
| Ambiguous coordinate/axis/sign/unit | Wrong geometry/load/result without visible failure | Explicit contexts, m/rad canonical conversion, fail closed | Asymmetric/nonzero-Z/rotated/mixed-unit R8/T8/M8 | `OD6-01`; no affected commit/apply |
| Unstable/colliding legacy IDs | Updates attach to wrong geometry/FEM entity | Namespaces, aliases/collision record, no index/hash identity | Reorder/save/reload/collision/one-to-many T8/M8 | `OD6-02`; block mapping/apply |
| Source-of-truth overlap/dual write | Road/frame/legacy states diverge | Independent docs, reference-only project, read-old/write-target | G0 dependency/forbidden-field and G2 save tests | Disable target writer; preserve legacy/raw |
| Raw/unknown field loss | Irrecoverable migration data loss | Raw before parse, unknown store, pure migration | Byte/checksum recovery, unknown round-trip M8 | Quarantine; no commit |
| Partial target save/migration | Mixed manifest/document/record state | Atomic repository, checksums, idempotency | Fault injection/crash/concurrency N8/G2/G7 | `OD10-01`; old/new complete only |
| Transfer overwrite of frame mechanics/edits | Invalid structural model | Geometry-only contract, three-way diff, dependency closure | Frame-only/conflict/prohibited-field/stale T8 | Apply off; inverse frame revision |
| Stale or wrongly bound results | Invalid report/design decision | Exact model/load/solver/schema checksums | Save/reload/staleness/recompute M8/N8/F8 | Invalidate result; block authoritative output |
| Autosave before recovery/conflict validity | Repeated corruption or lost user state | Autosave last, target-only, opt-in, manual fallback | Crash/retry/concurrent write/performance G7 | Default/off; manual save and verified revision |

## P1/P2/P3 Register

| Priority | Risk | Control and affected gate |
|---|---|---|
| P1 | Major road gaps: multi/branch/merge/widen, importer, bridge geometry | P4 slices, O1/O2, G1/G2/G3 |
| P1 | Major frame gaps: CONTROL, spring/release/offset, loads/INFLOAD/combinations/results | P5 slices, residual/equilibrium/MAC/subspace, G4/G5 |
| P1 | Ambiguous BridgeProject/BridgeDefinition fields | Raw/quarantine, `OD9-01`, affected G2/G3/G4 |
| P1 | Unapproved numerical tolerances | Per-quantity register `OD8-01`; blocks affected G1/G3/G4/G5 |
| P1 | Missing independent/SPACER corpus | `OD8-02`; no parity claim, prefer O1/O2 |
| P1 | Unknown scale/performance budget | `OD8-03`; blocks performance G7 and Autosave |
| P1 | Legacy contraction strands files/deep links | Retained routes/readers, `OD10-02`, restore drill |
| P2 | GDRAW/PRINT/DRAFT/Viewer output incomplete or misleading | Authoritative input/result checks, semantic/visual G6 |
| P2 | Controlled visual environment unknown | `OD8-04`; semantic checks proceed, visual claim blocked |
| P2 | Route retirement window unknown | `OD6-04`; aliases remain by default |
| P3 | LINER frame STL owner unknown | Retain UNKNOWN, exclude from target release (`OD9-02`) |

## Oracle Hierarchy

| Oracle | Evidence | Use |
|---|---|---|
| O1 | Closed-form/theoretical exact result | Highest priority for isolated geometry/solver quantities |
| O2 | Independent implementation/solver | Cross-check algorithms and coupled cases |
| O3 | Controlled SPACER/reference product result | Compatibility evidence only with exact version/settings/mapping |
| O4 | Qualified golden | Regression after provenance/oracle/tolerance review |
| O5 | Property/invariant | Broad input coverage, not sole numerical truth |
| O6 | Semantic/controlled visual | Drawings/reports/viewer structure and approved appearance |

Numerical assertions identify quantity, canonical unit/sign, oracle, absolute and relative tolerance,
scale floor, boundary inclusivity, conditioning/domain, and evidence owner. Global decimal-place or
single epsilon acceptance is rejected. O3/O4 cannot outrank unaddressed sign/unit/model differences.

## Acceptance Gates

| Gate | Scope | Required evidence | Release behavior | Rollback |
|---|---|---|---|---|
| G0 | Architecture/contracts | Schema round-trip, checksum, forbidden fields, import direction, reference closure | Contract consumers only after IF0 | Disable additive consumer/exposure |
| G1 | Road calculations | R8 feature cases, O1/O2, approved tolerance/sign/unit, save/reload | Release per road capability | Hide capability; prior Road revision/read adapter |
| G2 | Migration/compatibility | M8 raw/unknown/version/ID/context/split/atomic/route cases | Commit only passing source classes | No commit or inverse/reselect manifest; raw retained |
| G3 | Road-to-Frame | T8 package/capability/context/ID/diff/conflict/partial/stale/rollback | Preview first; apply per passing source class | Apply off; inverse frame revision and record |
| G4 | Static frame/model/load | F8 model/mechanics/load/combination, equilibrium/residual/energy | Release per case/feature | Case/feature off; solver adapter fallback; invalidate result |
| G5 | Influence/live/modal/spectrum | F8 influence/INFLOAD/eigen/MAC/subspace/spectrum/reference | Release per analysis type | Analysis type off; invalidate/recompute result |
| G6 | Drawing/report/output | O8 semantic equality, units/sign/provenance, DXF/PDF/CSV, controlled visual | Release per output/platform | Previous output path; no domain rollback |
| G7 | Persistence/NFR/release | N8 save/migrate/apply fault, recovery, concurrency, scale, routes, backward compatibility | Production writer/performance; Autosave last | Writer/Autosave off; manual save/prior verified manifest |

## Test Matrix Families

| Family | Covers | Current vs planned rule |
|---|---|---|
| R8 | line/circle/clothoid/compound, station/equation, profile/crossfall/section, multi/branch/merge/widen, bridge, LDIST/HAUNCH/HOSO/GDRAW/TOOL/import | Existing tests are current regression; missing feature cases are planned acceptance |
| F8 | nodes/members/material/section/support, spring/release/offset, fixed loads, influence/INFLOAD, eigen/spectrum, combinations/envelopes, PRINT/DRAFT | Existing solver coverage is not evidence for absent contracts/features |
| T8 | asymmetric coordinates/units, stable IDs, capabilities/prohibited fields, first/re-import, diff/conflict/partial/protection/rollback/stale | Entire target transaction suite is planned until implemented |
| M8 | raw/unknown, versions, pure/idempotent steps, coordinate/ID/ownership, atomicity, results, routes | Current format readers supply fixtures; target migration is planned |
| O8 | Drawing/DXF/Viewer/PDF/CSV semantic and controlled visual/interoperability | Current smoke/regression distinguished from planned formal acceptance |
| N8 | save/reload, stale result, road/frame scale, crash/partial write, routes, performance, audit/recovery | Budgets/environments remain open where declared |

## Gate Failure and Scope

- Checksum, schema, unknown-critical, coordinate, unit, ID, revision, ownership, dependency, atomicity,
  residual/equilibrium, result-binding, or recovery failure blocks the affected mutation/release.
- A missing performance or controlled visual budget blocks only its performance/visual claim unless it
  exposes corruption or semantic error.
- An open decision blocks only the scopes listed in
  [open_decisions.md](./open_decisions.md); it cannot be silently waived.
- A current regression test passing does not promote a planned feature to implemented.
- No failing required check is accepted for merge or release.

## Rollback Principles

1. Additive contract PR: disable/revert consumer exposure; no data was written.
2. Migration/save: preserve old source and raw; select old or new complete manifest, never partial.
3. Transfer apply: append an inverse/reversal revision and record with exact preconditions.
4. Solver/analysis: disable the feature/type or use prior adapter; invalidate incompatible results.
5. Output: route to the prior supported output path; domain data is unchanged.
6. Autosave: turn it off, return to manual save, restore last verified target revision.
7. Legacy contraction: re-enable the single legacy-only entry/writer; readers/raw were retained.

Rollback never deletes revisions, packages, records, raw sources, fixtures, or audit history.

## Readiness Gate

The overall verdict is `CONDITIONAL_GO`: Phase 0 and non-destructive P1 preparation may start.
Production writer, affected migration/apply, feature release, outputs, Autosave, and contraction each
remain `NO_GO` until their explicit open decisions, interface freezes, and G0-G7 evidence pass.
