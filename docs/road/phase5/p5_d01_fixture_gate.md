# P5-D01 Fixture Gate

**Date:** 2026-07-22
**Status:** AUTHORITATIVE STEP GATE
**Phase:** Road Formal Drawing Completion and JIP-LINER Parity
**D-step:** P5-D01 Formal Drawing Specification Reconciliation and Fixture Gate

## Fixture Authority

The P5-D01 executable fixture authority is:

- Manifest: `frontend/src/liner/drawing/phase5/formalDrawingFixtureManifest.ts`
- Source fixtures: `frontend/src/liner/drawing/phase5/__fixtures__/*.source.json`
- Golden fixtures: `frontend/src/liner/drawing/phase5/__golden__/*.golden.json`
- Focused tests: `frontend/src/liner/drawing/phase5/formalDrawingFixtureManifest.test.ts`

Existing Formal Drawing tests remain supporting evidence. They are not replaced by P5-D01.

## Manifest Rules

Each fixture entry must define:

- stable `fixtureId`
- `sourcePath` and `goldenPath`
- expected drawing type and plan type
- expected Road schema version `0.1.0`
- expected LINER geometry payload version `0.2.0`
- preview and DXF expectations
- numeric tolerance
- station and coordinate conventions
- source authority
- related JIP sections, open decisions, and P5 step

Fixture IDs must be sorted and unique. Paths must exist. Unknown status, authority, station convention, coordinate convention, drawing type, schema version, or payload version fails closed.

## Golden Rules

Golden files are authority markers for the manifest expectations. They may be updated only when a completion record explains:

- source fixture impact
- preview expectation impact
- DXF expectation impact
- numeric or text tolerance impact
- affected JIP / OD / AC-RD rows

Golden updates are prohibited for unrelated formatting, timestamp, locale, or path changes.

## Determinism Rules

- Fixture order is lexicographic by `fixtureId`.
- Serialization must be locale-independent.
- Timestamps must be fixed in tests.
- Random IDs are prohibited.
- Object identity must prove preview, print, and DXF share the same runtime `DrawingDocument`.
- `DrawingDocument` remains runtime-only and is not persisted.

## Fail-Closed Cases

The fixture gate rejects:

- duplicate fixture IDs
- nondeterministic fixture ordering
- missing source or golden paths
- unsupported schema or payload version
- invalid tolerance
- unknown source authority or status
- station or coordinate convention mismatch
- missing preview or DXF expectations
- preview/DXF/print route divergence
- invalid `DrawingDocument`
- DXF export errors
- stale preview or DXF golden expectations

## E2E Decision

P5-D01 does not alter UI reachability, preview rendering routes, or DXF export controls. Focused unit/integration tests are sufficient. Visual E2E remains assigned to P5-D05.
