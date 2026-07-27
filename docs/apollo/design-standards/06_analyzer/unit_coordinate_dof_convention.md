# Unit, Coordinate, DOF, Member-End, and Sign Convention — DS-06

## Scope separation

This document freezes only conventions explicitly visible in current repository code. It does not
transfer them to the historical external Analyzer or SPACER. Any external comparison must use the
evidence and transformation gates defined here and in DS-08.

## Repository contract

| Facet | Repository observation | Status |
|---|---|---|
| Node coordinate fields | `x`, `y`, `z` | `PROJECT_SPECIFIC` |
| Node DOF order | `ux, uy, uz, rx, ry, rz` | `PROJECT_SPECIFIC` |
| Member end order | `nodeI` followed by `nodeJ`; member DOF vector is I six components then J six components | `PROJECT_SPECIFIC` |
| Nodal load order | `fx, fy, fz, mx, my, mz` | `PROJECT_SPECIFIC` |
| Member distributed load | `wx, wy, wz` with an explicit `coordinateSystem` field | `PROJECT_SPECIFIC` |
| Local x direction | Derived from node I toward node J in the element rotation construction | `PROJECT_SPECIFIC` |
| Local y/z construction | Orientation is projected perpendicular to local x; local z is `x × y`, then y is re-orthogonalized as `z × x` | `PROJECT_SPECIFIC` |
| Reaction implementation | Global reaction vector is computed as `K u - f` at constrained DOFs | `PROJECT_SPECIFIC` |
| Raw member-end force | Local vector is `k_local u_local - f_equivalent`; first six entries are I and last six are J | `PROJECT_SPECIFIC` |
| Result resource unit fields | IF3 currently labels displacement `m/rad` and forces `kN/kN_m`; this row records labels only and does not adopt their numeric binding | `PROJECT_SPECIFIC` |
| Support coordinates | Repository support flags constrain named node DOFs; no separate rotated support-coordinate contract is evidenced | `REFERENCE_ONLY` |

Evidence: `backend/engine/model.py:28-115`, `backend/engine/dof.py:7-47`,
`backend/engine/element.py`, `backend/engine/results.py:44-87`,
`backend/engine/if3_normalizer.py:359-429`, and
`frontend/src/contracts/frameAnalysisResultResource.ts:118-162`.

## Sign and result interpretation

Repository equation assembly and element local-force calculations are implementation evidence, not
a product-neutral semantic sign specification. Before results may bind design verification:

1. create positive unit-load probes for every translational force, moment, displacement, rotation,
   member-end force, and reaction component;
2. record the global/local/support basis and right-hand convention;
3. verify equilibrium in the stated basis;
4. state whether reported member-end actions are element-on-node or node-on-element;
5. state whether I/J values are ordered, swapped, or sign-transformed at export;
6. bind each transformation to versioned source and output checksums.

Until those probes pass, external unit, support-coordinate, I/J, member-force, moment, and reaction
sign conventions remain `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` under `AN-BLK-004`.

The frontend result view may transform raw I-end nodal action into an internal-section-force display
convention. Viewer display axis swaps and result-diagram sign changes are presentation logic, not
evidence of an external product convention. Raw result, IF3, CSV, PDF, and viewer values must
therefore name their convention separately.

The repository unit binding itself is blocked under `AN-BLK-003`: a hard-coded result label does not
show that the incoming numbers were interpreted in those units. Closure requires an input-unit
contract, dimensioned probes, conversion behavior, and agreement between raw result, IF3 label, and
independent dimensional checks.

## Transformation acceptance

A transformation is acceptable only when it is defined before comparison as:

- a unit scale with named source and destination units;
- a 3-by-3 orthonormal coordinate matrix with determinant `+1` and inverse check;
- a 6-DOF block transformation consistent for translations and rotations;
- an explicit I/J permutation;
- an explicit component sign vector justified by force-action semantics.

The original values, transformed values, matrix/permutation/sign vector, and equilibrium residual
must be retained. Display rounding cannot be used to infer a sign or coordinate mapping.
