# Unresolved Geometry Contract

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen** by this PR.

## 1. Resolution states

Geometry values may carry:
- `CONFIRMED` — usable.
- `HUMAN_CONFIRMATION_REQUIRED` — value present, human confirmation pending (HCR).
- `CONFLICT` — candidates with sources; unresolved (no silent selection).
- `HOLD_INSUFFICIENT_SOURCE` — unknown because source insufficient; explicit reason.
- `NOT_AVAILABLE` — concept valid but no value in current contract.

## 2. Generation policy

When an unresolved value is encountered during geometry generation, the engine
applies one of:

| Policy | Meaning |
|--------|---------|
| `ERROR` | Abort generation for the affected entity; record GeometryIssue. |
| `SKIP_ENTITY` | Skip the entity entirely (e.g. a bracing reference with HOLD coordinates). |
| `GENERATE_PARTIAL` | Generate the confirmable portion; mark the rest unresolved. |
| `USE_CONFIRMED_PORTION_ONLY` | Use only CONFIRMED values; drop HCR/conflict/hold-dependent geometry. |
| `HUMAN_CONFIRMATION_REQUIRED` | Generate the entity but flag it for human confirmation (HCR). |

**Dummy coordinates are prohibited.** No 0.0 placeholders for unknown values; the
state and reason are always carried.

## 3. Carry-forward (Phase 5, preserved — NOT resolved in Phase 6-0)

| Item | State in geometry contract |
|------|----------------------------|
| HCR-001 (drawing sheet 141 OCR) | `HUMAN_CONFIRMATION_REQUIRED`, humanConfirmationId `HCR-001` |
| CONF-P2II-001 (bottom flange 680 vs 700 mm) | `CONFLICT`, candidates [680, 700] mm, selected null |
| Intermediate panel-point coordinates (nodes 1002–1026, 2002–2026) | `HOLD_INSUFFICIENT_SOURCE`, stateReason |
| Analysis Golden = 0 | `NOT_AVAILABLE` |

## 4. Entity-level handling

- An entity with any unresolved field is flagged in `unresolvedGeometry` /
  `geometryIssues`.
- Downstream connectors receive the entity with its resolution state; they must not
  silently substitute values.

## 5. Phase 6-1 acceptance

- Geometry Core must propagate these states; generating dummy coordinates is a
  Phase 6-1 defect (fails Golden parity gates).
