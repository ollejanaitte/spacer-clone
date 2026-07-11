# Phase 4.5 Step 8.6

## Status

Implemented locally in frontend semantic parity core and validated with unit, regression, typecheck, build, and hygiene checks.

## Objective

Add semantic parity comparison for static and eigen analysis results without changing backend result generation, UI behavior, or existing model-only parity APIs.

## Implemented Scope

### Static

- displacement parity
- reaction parity
- member end force parity
- semantic load case matching reuse
- missing / zero / failed / invalid distinction

### Eigen

- eigenvalue parity
- circular frequency parity
- frequency parity
- period parity
- mode shape parity
- participation factor parity
- effective mass ratio parity
- MAC-based matching

## Result Availability Semantics

- `result` object missing
- `result` is `null`
- solver not executed
- solver failed
- `errors` present
- target array missing
- target array empty
- target value is `0`
- target value is `NaN` / `Infinity`
- normal numeric result

Zero and missing are not treated as equivalent.

## Static Result Identity

- Match by semantic node/member/load-case keys, not by raw IDs alone.
- Keep source IDs as trace metadata.
- Preserve order independence.

## Member End Force Canonical Convention

- Canonical basis is backend local member end force output.
- Viewer/display-only I-end sign flips are not part of the core parity contract.
- Reversed member orientation is reported as indeterminate when the checked-in fixture does not prove a deterministic transform.

## Eigen Mode Matching

- Do not match by `modeNo` alone.
- Prefer scalar proximity first, then MAC.
- Preserve ambiguity for near-repeated modes.

## MAC

`MAC(φ, ψ) = |φᵀψ|² / ((φᵀφ)(ψᵀψ))`

- Global sign inversion is equivalent.
- Zero vectors are invalid or indeterminate.
- Missing components are reported explicitly.

## Tolerances

- displacement absolute tolerance
- rotation absolute tolerance
- force absolute tolerance
- moment absolute tolerance
- eigenvalue relative tolerance
- frequency relative tolerance
- period relative tolerance
- participation / effective mass relative tolerance
- MAC threshold
- near-zero floor

## Report Integration

- Added result parity report envelope support on top of existing semantic parity serialization.
- Existing model-only `compareSemanticParity(left, right)` behavior is preserved.

## Fixtures

- static parity fixture
- member I/J reversal fixture
- eigen mode permutation fixture
- eigen sign inversion fixture
- missing / failed / invalid fixture

## Tests

- `semanticParity`
- full frontend test suite
- regression suite
- typecheck
- build
- source hygiene
- Japanese string scan

## Backward Compatibility

- No backend schema changes.
- No UI changes.
- No CLI changes.
- No package manifest changes.

## Explicit Non-Scope

- response spectrum parity
- influence line parity
- moving load parity
- time history parity
- stress parity
- backend solver algorithm changes
- backend result format changes
- API route additions
- UI/viewer behavior changes

## Known Limitations

- Deterministic I/J reversal mapping is still fixture-bound.
- Near-repeated eigenvalues may remain indeterminate when MAC scores are not unique.

## Next Step

Phase 4.5 Step 8.6 / PR4: Response Spectrum Partial Parity
