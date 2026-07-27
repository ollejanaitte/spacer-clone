# Semantic Parity Specification — DS-08

## Required identity sets

Before comparing values, establish exact identity maps for model, nodes, members, materials,
sections, supports, load cases, combinations, and analysis settings. Matching is symmetric: both
left-only and right-only identities fail. Identifier renaming requires a checksum-fixed mapping
artifact; proximity alone cannot resolve ambiguous nodes or members.

## Category rules

| Parity category | Required semantic evidence |
|---|---|
| `INPUT_SEMANTIC_PARITY` | Native and Apollo model checksums plus field-by-field transformation |
| `MODEL_TOPOLOGY_PARITY` | Node/member incidence, connectivity, releases, offsets, and orientation |
| `MATERIAL_PARITY` | Property identity, units, applicability, and source |
| `SUPPORT_PARITY` | Constrained DOFs, support basis, springs, and sign interpretation |
| `MEMBER_STIFFNESS_PARITY` | Area/inertias/torsion/shear/release/offset formulation |
| `LOAD_CASE_PARITY` | Case identity, type, direction, application, and ordering |
| `LOAD_COMBINATION_PARITY` | Component cases, coefficients, signs, envelope/exclusivity semantics |
| `SIGN_CONVENTION_PARITY` | Global/local/support bases, I/J, action/reaction meanings |

Numeric comparison is forbidden for a category whose semantic mapping is not PASS or
`PASS_WITH_EXPLAINED_TRANSFORMATION`.

## Explained transformations

An explained transformation requires:

- source and destination version/checksum identities;
- a prior mapping specification;
- unit scale/offset;
- orthonormal coordinate matrix and inverse check;
- DOF permutation;
- I/J permutation;
- force/moment/reaction sign vector with action semantics;
- round-trip and equilibrium verification.

The status `PASS_WITH_EXPLAINED_TRANSFORMATION` is permitted only after all artifacts are approved.
An observed mismatch cannot be used to invent the transformation.

## Existing comparator limitation

Current repository semantic/result comparators are candidates only. Paths that skip missing result
rows or modes, compare only one direction, or allow an empty equivalent report are prohibited for
DS-08 acceptance. A complete set-equality and coverage gate must precede numeric comparison.
Undefined material/stiffness fields cannot be counted as matched required properties, and an
informational `loadsMapped=false` warning cannot satisfy load parity. The current unordered endpoint
match can support topology identity only; it cannot support I/J, local-load, sign, or member-force
parity.
