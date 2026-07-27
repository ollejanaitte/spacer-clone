# Numeric Parity Specification — DS-08

## Preconditions

Record fixed SPACER, Analyzer/module, and Apollo versions; native and Apollo input checksums; run
settings; load context; units; coordinate/sign/I-J mappings; output checksums; and internal-value
source. Rounded report values alone are not numeric evidence.

## Algorithm

For each predeclared quantity:

1. validate finite numeric representation and exact identity-set equality;
2. apply only approved unit, coordinate, DOF, I/J, and sign transformations;
3. retain original and transformed values plus transformation evidence;
4. if `|expected| <= zero_threshold`, require absolute-error acceptance;
5. otherwise calculate absolute and relative error and apply the predeclared rule;
6. record pass/fail per component and aggregate only after full coverage succeeds.

Default aggregation is fail-closed: one mismatch, missing row, duplicate row, wrong case, wrong unit,
or unapproved transformation makes the case non-PASS.

## Precision and tolerance

Absolute tolerance, relative tolerance, zero threshold, internal precision, display precision,
rounding mode, and unit conversion are separate fields. The tolerance is frozen before viewing
Apollo mismatch. Relative denominators and Boolean combination rules must be symmetric or explicitly
justified. Absolute difference is never compared with a dimensionless relative threshold.

## Mismatch classification

Use one primary class: `IDENTITY`, `TOPOLOGY`, `MATERIAL`, `SUPPORT`, `STIFFNESS`, `LOAD`,
`COMBINATION`, `UNIT`, `COORDINATE`, `MEMBER_END`, `SIGN`, `PRECISION`, `NUMERIC`,
`MISSING_DATA`, `DUPLICATE_DATA`, `VERSION`, `STALE`, or `UNSUPPORTED`. Exclusion after mismatch is
prohibited; correction creates a new checksummed run.

## Actual state

No fixed-version native SPACER output set is present. The current
`frontend/src/verification/spacerReference.ts` parser/comparator is not an acceptance implementation:
it can coerce malformed numbers to zero, skip missing node matches, omit case identity in matching,
and lacks member-force comparison. Actual numeric parity remains blocked.

The repository static, eigen, and response-spectrum result comparators also require a completeness
gate before reuse: several paths traverse only left-side rows/modes, skip a missing match, or do not
reject right-only values. A reported internal `equivalent` state is not a DS-08 `PASS` without
version, checksum, semantic, coverage, unit, convention, and approval gates.
