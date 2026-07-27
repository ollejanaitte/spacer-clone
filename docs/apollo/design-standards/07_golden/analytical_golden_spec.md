# Analytical Golden Specification — DS-07

## Accepted derivation package

An analytical expected value requires:

- a checksum-fixed model with declared idealizations and applicability;
- a symbolic derivation or independent calculation workbook/script;
- dimensional analysis and explicit unit substitution;
- coordinate, sign, load direction, and I/J interpretation;
- equilibrium and limiting-case checks where applicable;
- a reviewer who did not derive the expected artifact;
- an error-bound analysis separating theory/model idealization from numeric comparison tolerance.

The initial beam and torsion formulas in `backend/tests/test_engine_verification_cases.py` and
`examples/verification/beam/*.meta.json` are candidates, not DS-07-approved Goldens. Their values
must be recomputed from the fixed input by an independent derivation artifact, checked for shear
deformation/release/orientation assumptions, checksummed, and approved under `GOLD-BLK-001`.

## Phase 1 analytical set

The minimum set covers a cantilever tip load, simply supported center load, simply supported uniform
load, axial member, and simple torsion. Each case compares the smallest sufficient quantities:
displacements/rotations, reactions, and end actions required to detect sign or formulation error.
Max-absolute-only comparisons cannot replace signed component checks.

No design-verification resistance or limit-state expected value may be derived until the DS-02 to
DS-05 source blockers for that value are cleared.
