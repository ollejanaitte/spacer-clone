# Step 1-A — Scope and Authority

**Authority:** APOLLO_STEP_1A_EVIDENCE_GOLDEN_AUTHORIZATION  
**Date:** 2026-08-02  
**Parent authorities:** Phase A `08_numeric_authorization_gate.md`, Phase B `06_first_numeric_release_candidate.md`, DS-07 golden governance

## 1. First numeric cell

```
TARGET_CELL: geometric_section_properties
MEMBER: main_girder
CHECK_FAMILY: pure_geometry_section_properties
FIRST_RELEASE_CANDIDATE: A
CURRENT_AUTHORIZATION: NOT_AUTHORIZED
```

## 2. IN_SCOPE (Step 1-A package)

- Straight bridge, simple single span archetype documentation for later Steps
- Equal-depth non-composite RC deck steel plate girder (geometry context only)
- Skew 90°, constant I-section, SI units
- Symmetric and asymmetric I-section pure-geometry fixtures
- Formula templates, unit/datum definitions, tolerance *proposal*, checksum of **inputs**
- Human derivation / review / approval *fields*
- Future analytical Golden stubs (GOLD-AN-001/002) as placeholders only

## 3. OUT_OF_SCOPE (this package and Step 1-A)

- Granting `NUMERIC_DESIGN_AUTHORIZATION`
- Elevating authorization gate cells to `GRANTED`
- Application-code changes for formal UI presentation of authorized values
- Material strength, yield, allowable/resistance, buckling, fatigue
- Live loads, combinations, continuous-girder numeric design
- Composite section, effective width, corrosion, bolt holes, stiffener contribution
- Cursor Auto self-approval of Golden expected values

## 4. Existing code audit note (not authorization)

Repository already contains pure-geometry implementation:

- `frontend/src/apollo/bridgeStructure/sectionProperties.ts`
- `frontend/src/apollo/__tests__/sectionProperties.test.ts`

That code is **RESOLVED_EVIDENCE of an implementation candidate** (Phase B E/R register), always carrying NOT_AUTHORIZED semantics. It is **not** an approved Golden and must not seed expected values.

### Geometry contract observed in code (for human worksheet alignment)

| Topic | Contract |
|-------|----------|
| Datum | Bottom fiber = 0; centroid measured upward |
| Depth | `girderDepth` = overall height including flanges |
| Web height | `girderDepth - topFlangeThickness - bottomFlangeThickness` (no flange/web double-count) |
| Strong axis | Ix about NA (bending about transverse horizontal) |
| Volume | `steelVolumePerGirder = totalArea * bridgeLength` (full girder volume); unit-length volume ≡ `totalArea` (m³/m) |
| Fail-closed | Non-finite / non-positive dimensions or non-positive webHeight → `null` |

## 5. Fail-closed rules

1. Missing human expected values → case remains `NOT_APPROVED`.
2. Missing independent reviewer / approver / DEC-ID → no cell GRANTED.
3. Same production function used to mint expected values → invalid as independent Golden.
4. Primary standard page values not visually confirmed → do not mark ADOPTED for design checks (section geometry cell still may proceed on pure geometry *after* independent hand calc approval).

## 6. Path selection

| Path | Condition | Outcome |
|------|-----------|---------|
| A | GOLD-SP-001/002 approved with checksum, tolerance freeze, independent reviewer, DEC-ID, cell GRANTED | Proceed to Step 1-B |
| B (current) | Human evidence missing | Package complete as candidate; stop before Step 1-B code authorization |
