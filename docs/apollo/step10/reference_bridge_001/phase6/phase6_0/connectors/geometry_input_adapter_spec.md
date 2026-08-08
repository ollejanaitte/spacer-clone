# Geometry Input Adapter Spec

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen boundary:** `Common Bridge Data Model → Geometry Input Adapter → Geometry Engine Input`

## 1. Purpose

Transform the frozen Common Bridge Data Model (Phase 5) into the Geometry Engine's
input contract. The adapter extracts entities, preserves IDs/source trace, normalizes
units, and classifies value resolution states. It performs NO geometry calculation.

## 2. Inputs

- Common Bridge Data Model document (schemaVersion 1.0.0)
  - `metadata`, `alignments`, `bridgeGeometry` (supports/girders/gridPoints/deck/crossMembers)
  - `structuralModel` (nodes/members), `materials`, `sections`, `loads`
  - `design`, `reportSpecification`, `drawingSpecification`
  - `traceability`, `resolutionRegistry`

## 3. Outputs

- `GeometryEngineInput`: bridge-agnostic geometry request
  - alignments (id, references)
  - supports (id, station, skew, elevation, transverse axis)
  - girders (id, offsets), grid points (id, station/offset)
  - deck reference (width, thickness, edges)
  - sections (id, dims)
  - unresolved registry (HCR/conflict/HOLD) propagated

## 4. Responsibilities

- Extract the entities needed by the Geometry Engine.
- Keep stable Common entity IDs (`ALN-ACL`, `SUP-PU15`, `GIRDER-AG1`, `GRID-*`, `DECK-01`).
- Keep source trace (Golden IDs, `sourceRefs`, `traceabilityId`).
- Normalize units to the canonical contract (m; rad; kN).
- Classify each value: CONFIRMED / HUMAN_CONFIRMATION_REQUIRED / CONFLICT / HOLD_INSUFFICIENT_SOURCE / NOT_AVAILABLE.

## 5. Prohibited

- Any geometry calculation (no station->XYZ, no offset math).
- Guessing unresolved values (no dummy 0.0).
- Modifying Golden values or the Common Model.

## 6. Resolution-state propagation

- CONFIRMED -> usable.
- HUMAN_CONFIRMATION_REQUIRED -> passed with `humanConfirmationId` (HCR-001).
- CONFLICT -> passed with candidates (CONF-P2II-001) unresolved.
- HOLD_INSUFFICIENT_SOURCE -> passed with `stateReason` (intermediate panel coords).
- NOT_AVAILABLE -> passed (analysisReference).

## 7. Owner

Geometry Input Adapter owner (bridge-side); Common Bridge Data Model remains the
data contract.
