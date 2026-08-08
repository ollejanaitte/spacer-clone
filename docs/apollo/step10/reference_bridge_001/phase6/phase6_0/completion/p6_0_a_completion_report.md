# P6-0-A Completion Report — Existing Architecture Audit

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR A
> **Baseline main SHA:** `42c2815fb74de873bea529c11a8e453fde432d86`

## Verdict

```
P6_0_A_OVERALL_VERDICT: COMPLETE
P6_0_A_VALIDATION: PASS
EXISTING_ARCHITECTURE_AUDIT: PASS
DUPLICATE_GEOMETRY_LOGIC_COUNT: 30
RESPONSIBILITY_CONFLICT_COUNT: 12
HIDDEN_COORDINATE_TRANSFORM_COUNT: 10
CONNECTOR_INVENTORY_COUNT: 17
PRODUCTION_CODE_CHANGED: NO
SOURCE_ORIGINALS_COMMITTED: NO
PHASE5_BASELINE: SEAL-RB-S10-001-P5 present on main
```

## Deliverables

- `phase6/README.md`
- `phase6_0/audit/duplicate_geometry_logic_register.csv` (30 rows)
- `phase6_0/audit/existing_connector_inventory.csv` (17 rows)
- `phase6_0/audit/responsibility_conflict_register.csv` (12 rows)
- `phase6_0/audit/01_existing_geometry_architecture_audit.md`
- `phase6_0/tools/validate_p6_0_a.py` (validator PASS)
- `phase6_0/completion/p6_0_a_completion_report.md`
- `final_report.txt` (Phase 6-0 section)

## Key findings

1. LINER is the authoritative road-alignment math source; no Apollo code reimplements
   alignment math today, but Apollo FEM generators build flat straight-only grids
   without consulting LINER.
2. Girder offsets are duplicated in 7 places; the report path is DIVERGENT
   (non-centered) — wrong report geometry for multi-girder bridges.
3. Substructure placement has 3 producers; the UI (realtime + viewport fallback)
   bypasses the canonical SupportPlacementEngine and produces axis-aligned,
   no-skew coordinates.
4. Three independent vertical datums (3D solids top-flange-upper-face, drawing
   bottom flange, FEM z=0) and two viewer axis policies (z-up verbatim vs y-up swap).
5. Drawing set re-derives the full layout from the raw draft (simple-span only)
   while BSDD/solids support continuous — silent drift risk.
6. m->mm conversion inconsistent (STL rounds, DXF raw); multiple hidden transforms
   (sign policy, frameFromStartEnd, quaternion-from-basis, STL origin shift).

## Conclusion

Findings justify the Phase 6-0-B/C design freeze:
Single Source of Alignment = LINER, Single Source of Bridge Geometry = Apollo
Geometry Engine with GeometrySnapshot consumed by all downstreams, Common Bridge
Data Model as input contract, explicit coordinate/connector/entity contracts,
and explicit unresolved-geometry handling.

## Next

P6-0-B (geometry architecture + responsibility freeze) after P6-0-A merges to main
and main is synced.
