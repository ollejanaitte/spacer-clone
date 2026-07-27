# EA-02 Analytical Golden Method

**Work item:** EA-02 (STAGE-00 analytical golden evidence tooling)
**Package version:** `2.1.0`
**Schema version:** `apollo.analytical_golden.v1`
**Canonical DS-07 reference:** `docs/apollo/design-standards/07_golden/analytical_golden_spec.md`

## Purpose

EA-02 delivers an independent analytical derivation package for seven immutable minimal theory fixtures. Expected values are produced from explicit `Fraction` arithmetic and classical closed-form theory cited through package-contained derivations (no proprietary textbook excerpts). The package does **not** invoke the Apollo solver, repository engineering functions, or adopted DS-02 through DS-05 design-standard numerics.

This deliverable may carry package approval `TOOLING_REVIEWED_NOT_GOLD_APPROVED` and completeness `COMPLETE`. It does **not** change canonical `GOLD-001` through `GOLD-016` approval status (`NOT_APPROVED`) and does **not** claim reference-software Golden closure.

## Fixture coefficient boundary

| Class | Meaning |
|---|---|
| `SYNTHETIC_FIXTURE_NOT_DESIGN_STANDARD` | Explicit rational coefficients chosen for deterministic verification only (E, L, P, w, T, A, I, J, asymmetric geometry, combination factors). |
| Adopted design-standard numerics | **Excluded** until DS-02..DS-05 blockers close; no R7/JIS factors or resistances appear in this package. |

Repository regression values in `backend/tests/test_engine_verification_cases.py` and `examples/verification/beam/*.meta.json` remain `REFERENCE_ONLY` per DS-07.

## Theory applicability and idealization

| Model class | Applicability / idealization |
|---|---|
| Beam cases (AG-CANT-P, AG-SS-CL, AG-SS-UDL) | Euler-Bernoulli prismatic linear elastic small-displacement; shear deformation excluded. Theory idealization is the defined model (not a separate physical-model error). |
| Axial (AG-AXIAL) | Uniform prismatic linear elastic axial bar. |
| Torsion (AG-TORSION) | Saint-Venant prismatic section with J explicitly the torsion constant; warping excluded. |
| Statics (AG-ASYM-RC) | Rigid-body static equilibrium. |
| Combination (AG-LC-LIN) | Synthetic EA-02 linear superposition fixture (not DS-04 adopted rule). |

Serialization comparison uses a per-quantity fixed-unit absolute error budget (`1E-15` in declared unit) for Decimal/IEEE double representation, separate from theory idealization.

## Case set

| case_id | Description | canonical_golden_ref |
|---|---|---|
| AG-CANT-P | Cantilever tip point load | GOLD-001 |
| AG-SS-CL | Simply supported center point load | GOLD-002 |
| AG-SS-UDL | Simply supported uniform distributed load | GOLD-003 |
| AG-AXIAL | Axial bar end force | GOLD-004 |
| AG-ASYM-RC | Asymmetric support reactions (off-center load) | EA-02_MINIMAL_ASYMMETRIC_REACTION |
| AG-LC-LIN | Synthetic linear load-combination scalar | EA-02_MINIMAL_LINEAR_COMBINATION |
| AG-TORSION | Saint-Venant cantilever torsion | GOLD-005 |

## Dual derivation paths

1. **Generator path** (`derivation_path=generator`): primary production dispatch in `analytical_golden_core.py` `GENERATOR_FORMULAS`.
2. **Independent review path** (`independent_analytical_review.py`): stdlib-only module with separate literal rational fixtures, alternate derivation arithmetic, and invariants. Emits `independent_review_expected.csv` with formula, inputs, fraction, value, unit, sign, model assumptions, and checksum.

Both paths must agree exactly on every quantity value, unit, and sign convention before artifacts are written. The validator regenerates both paths and rejects manual edits to governed CSV columns.

## Global equilibrium signs

Fixed-end reactions oppose applied end actions:

- AG-AXIAL `N1_FX` = `-F` (applied tension at N2 in +X).
- AG-TORSION `N1_MX` = `-T` (applied torque at N2 about +X).

## Section moment mapping (simply supported cases)

AG-SS-CL and AG-SS-UDL include signed `member_section_result` quantities at member I/J ends (`M1_MZ_I`, `M1_MZ_J`, `M2_MZ_I`, `M2_MZ_J`) using section-result convention (sagging positive), explicitly distinguished from FE nodal end-action vectors. Support ends are zero; midspan junction ends carry peak sagging moment.

## Tolerance freeze

Per-quantity absolute, relative, and zero-threshold facets are recorded in `tolerance_freeze_register.csv` before any comparison. Rows are sorted by `quantity_key` on disk. The register is canonicalized (fixed column order, LF line endings) and hashed:

- **Frozen SHA-256:** `4dd51a92df802a94fec4629858019afc451b90605e68ce56185aa083abbd910a`
- **On-disk raw SHA-256:** equals canonical freeze SHA above.
- **Comparison rule (DS-07 default):** `abs(a-e) <= max(A, R*|e|)` with near-zero branch `|e| <= Z` using absolute tolerance only.
- **Per-quantity justification:** states fixed-unit error budget and separates theory idealization from serialization comparison error.

`compare_apollo_to_analytical_golden.py` and `validate_analytical_golden.py` require `--tolerance-freeze-sha256` and reject mutation.

## Independent review artifact

- **Path:** `independent_review_expected.csv`
- **SHA-256:** `65cec6d7370ccdb35b13961632d9e0e20a5687a2e575af183679727d6a363cf4`
- Validator checksum-binds every column against live independent regeneration.

## Blocker snapshot binding

`analytical_golden_blockers.csv` contains verbatim EA-00 snapshot rows for the selected blocker ID set (SHA-256 `c92f7897632d4f0935dd32cfcf87c4263efe85160a9e9b3c3d3e097551613325`). Validator rejects any edit.

## Repository layout

```text
docs/apollo/evidence-collection/02_analytical_golden/
  analytical_golden_method.md          # this document
  analytical_case_catalog.csv
  derivation_register.csv
  expected_values.csv
  tolerance_freeze_register.csv
  independent_review_expected.csv
  analytical_golden_review.md
  analytical_golden_blockers.csv

scripts/apollo/evidence/
  analytical_golden_core.py
  independent_analytical_review.py
  generate_analytical_golden.py
  validate_analytical_golden.py
  compare_apollo_to_analytical_golden.py
  tests/test_analytical_golden.py
```

## Non-promotion statement

Successful EA-02 validation confirms independent analytical tooling, frozen tolerances, and tooling review only. Canonical `GOLD-001` through `GOLD-016` remain `NOT_APPROVED`. External Analyzer identity (AN-BLK), reference-software Golden bundles (GOLD-BLK-003/005), licensed source adoption (BLK-S1-*), and numeric release gates remain blocked per canonical registers.
