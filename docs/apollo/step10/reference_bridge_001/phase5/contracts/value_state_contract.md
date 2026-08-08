# Value State Contract — Common Bridge Data Model

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 P5-1

## 1. Value states

Every engineering value in the Common Bridge Data Model carries a state:

| State | Enum value | Meaning | Requirement |
|-------|-----------|---------|-------------|
| Confirmed | `CONFIRMED` | Value confirmed by sources | usable |
| Human confirmation | `HUMAN_CONFIRMATION_REQUIRED` | Value present, human visual/OCR confirmation pending | tracked with HCR id |
| Conflict | `CONFLICT` | Conflicting candidates, unresolved | candidate + sources + conflict id + selected(null) + resolution status |
| Hold | `HOLD_INSUFFICIENT_SOURCE` | Unknown because source insufficient | explicit reason required |
| Not applicable | `NOT_APPLICABLE` | Concept does not apply | explicit |
| Not available | `NOT_AVAILABLE` | Concept valid, no value in current contract | explicit |

`null` alone is insufficient. The model MUST carry WHY a value is unknown
(state + reason/source), not merely an empty value.

## 2. Value record structure

A `ResolvedValue<T>` record:

- `value`: engineering value (numeric or text), present for CONFIRMED / HUMAN_CONFIRMATION_REQUIRED / CONFLICT(candidate) / NOT_APPLICABLE
- `state`: value state enum
- `unit`: canonical unit (when numeric)
- `sourceUnit`: source/display unit (when numeric)
- `sourceRefs`: source record / Golden IDs
- `precision`: canonical display precision
- `authority`: numeric authority (e.g. SOURCE_TRACED / ADOPTED / USER_PROVIDED_UNVERIFIED) when applicable
- `stateReason`: reason string for HOLD / NOT_AVAILABLE
- `humanConfirmationId`: HCR id when state is HUMAN_CONFIRMATION_REQUIRED
- `conflictId`: conflict id when state is CONFLICT

## 3. Conflict structure

A `ConflictValue<T>`:

- `candidates`: list of `{ value, unit, sourceRefs }`
- `conflictId`: stable conflict id (e.g. CONF-P2II-001 at fixture level)
- `selected`: value or null (null when unresolved)
- `resolutionStatus`: `UNRESOLVED` | `RESOLVED` | `RESOLVED_WITH_DEVIATION`
- `description`: human-readable conflict description

## 4. Human confirmation structure

- `humanConfirmationId`: stable HCR id (e.g. HCR-001 at fixture level)
- `value`, `unit`, `sourceRefs`
- `confirmationState`: `PENDING` | `CONFIRMED` | `REJECTED`

## 5. Hold structure

- `state = HOLD_INSUFFICIENT_SOURCE`
- `stateReason`: exact reason why source is insufficient (no interpolation/back-calc)

## 6. Carry-forward requirements

| Item | Representation |
|------|----------------|
| HCR-001 | state `HUMAN_CONFIRMATION_REQUIRED`, humanConfirmationId `HCR-001`, 91 records |
| CONF-P2II-001 | state `CONFLICT`, candidates [680 mm, 700 mm] + sources, selected null, resolutionStatus `UNRESOLVED` |
| Intermediate panel-point coords (nodes 1002–1026, 2002–2026) | state `HOLD_INSUFFICIENT_SOURCE`, stateReason notes not extracted in Phase 2; no invented coordinates |
| Analysis Golden = 0 | analysisReference.status `NOT_AVAILABLE` |

These MUST survive fixture build → serialize → deserialize unchanged.

## 7. Integration extension (Phase 1-2, additive)

For the cross-tool BridgeProject integration (①road alignment / ②superstructure /
③substructure), the value-state set is extended **additively** with three states
that preserve provenance of reverse reconstruction (superstructure sample →
alignment) and derivation. The six original states above are unchanged.

| State | Enum value | Meaning | Requirement |
|-------|-----------|---------|-------------|
| Derived | `DERIVED` | Deterministically derived from the current model (e.g. station→XYZ, support placement) | `derivedFrom` (derivation source) required |
| Inferred | `INFERRED` | Estimated / reconstructed from insufficient or indirect source | `inferenceBasis` required; confidence high/medium/low optional |
| Deferred | `DEFERRED` | Intentionally deferred to a later step; not invented, not silently available | `stateReason` required; `deferredTo` optional |

Mapping of the BridgeProject vocabulary onto the model:

- `CONFIRMED` ↔ original/input confirmed value (`CONFIRMED`)
- `DERIVED` ↔ `DERIVED`
- `INFERRED` ↔ `INFERRED`
- `MISSING` ↔ `HOLD_INSUFFICIENT_SOURCE` (missing-with-reason) or `NOT_AVAILABLE`
- `DEFERRED` ↔ `DEFERRED`
- `NOT_AUTHORIZED` ↔ **document level** `numericDesignAuthorization` /
  `designStatus` (not a value state; authorization gates live on the document).

A reconstructed alignment MUST use `DERIVED` / `INFERRED` (never `CONFIRMED`) for
any value not present as an original input, so a restored alignment is never
mistaken for the original confirmed input. See
`docs/integration/value-status-unit-policy.md`.
