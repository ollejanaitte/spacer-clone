# Phase 4.5 Step 8.2 — Semantic Comparison Helper Implementation

> **Status:** Implemented
> **Date:** 2026-07-11

## Purpose

Step 8.2 adds a pure TypeScript comparison helper foundation for Semantic Parity. The helper compares generated frame models without depending on node IDs, member IDs, or input order.

The source of truth for this implementation is `docs/liner/phase4.5/step8_semantic_parity_spec.md`.

## Scope

- Normalized comparison model types.
- Tolerance configuration and numeric comparison helpers.
- ID-independent node matching.
- Endpoint-based member matching.
- Structured `ParityReport`.
- Pure entry points for normalized models and `ProjectModel`.
- Unit tests covering the foundation behavior.

## Non-Scope

- UI rendering or visualization.
- Generator, adapter, golden snapshot, backend API, schema, or persistence changes.
- Full property, support, load, mass, static response, or dynamic response parity.
- Automatic repair, ID renumbering, or schema migration.

## File Structure

- `frontend/src/bridgeDefinition/semanticParity/types.ts`
- `frontend/src/bridgeDefinition/semanticParity/tolerance.ts`
- `frontend/src/bridgeDefinition/semanticParity/normalize.ts`
- `frontend/src/bridgeDefinition/semanticParity/nodeMatching.ts`
- `frontend/src/bridgeDefinition/semanticParity/memberMatching.ts`
- `frontend/src/bridgeDefinition/semanticParity/compare.ts`
- `frontend/src/bridgeDefinition/semanticParity/index.ts`
- `frontend/src/bridgeDefinition/semanticParity/__tests__/tolerance.test.ts`
- `frontend/src/bridgeDefinition/semanticParity/__tests__/semanticParity.test.ts`

## NormalizedModel

`NormalizedModel` is independent of the application persistence schema. It contains normalized nodes, members, supports, sections, metadata, warnings, and errors.

Each normalized item keeps source trace information (`sourceId`, source index, source path) while comparison keys are based on geometry and normalized endpoint information rather than original IDs.

## Matching Policy

Node matching uses coordinate distance within the configured coordinate tolerance. Matches are one-to-one only. If multiple candidates exist on either side, the helper records ambiguity and leaves those items unmatched.

Member matching uses matched node pairs and canonical unordered endpoint pairs, so reversed I/J direction is treated as the same member. Duplicate members on the same matched endpoint pair are reported as ambiguity instead of being resolved greedily.

## Tolerance Policy

The default tolerance values are centralized in `DEFAULT_SEMANTIC_TOLERANCE`.

Numeric comparison supports absolute and relative tolerance with an optional floor. `NaN` and `Infinity` are never treated as equal. Coordinate, length, scalar, and angle tolerances are separate bands.

## ParityReport

`ParityReport` includes:

- overall status: `equivalent`, `different`, `indeterminate`, or `invalid`
- matched counts
- unmatched left and right items
- structured mismatches
- ambiguities
- warnings and errors
- tolerance used
- summary counts

The report is intended to be reusable by future UI, JSON output, and test assertions.

## Tests

Tests cover:

- exact, absolute, relative, boundary, near-zero, `NaN`, and `Infinity` tolerance cases
- node matching with different IDs, reordered inputs, tolerance pass/fail, missing nodes, ambiguity, and one-to-one behavior
- member matching with same endpoint pair, reversed I/J, missing endpoints, and duplicate candidate ambiguity
- report statuses and summary/mismatch details for equivalent, different, indeterminate, and invalid outcomes

## Step 8.3+ Follow-ups

- Add geometry and topology parity metrics M001-M009.
- Add support, property, and load semantic comparison layers.
- Add model validity diagnostics for connectedness, isolated nodes, and zero-length members.
- Add fixture-backed semantic reports alongside existing golden regression.
- Calibrate tolerances from fixture measurements and update the Step 8.1 spec if defaults change.
