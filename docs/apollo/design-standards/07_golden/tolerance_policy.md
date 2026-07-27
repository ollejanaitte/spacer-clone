# Golden Tolerance Policy — DS-07

## Comparison rule

For expected value `e`, actual value `a`, absolute tolerance `A`, relative tolerance `R`, and zero
threshold `Z`:

- if `|e| <= Z`, compare `|a - e| <= A`;
- otherwise require both a declared absolute bound and relative bound, and apply the case-approved
  Boolean rule recorded in the catalog; the default approval rule is
  `|a-e| <= max(A, R*|e|)`;
- NaN, infinity, missing quantity, duplicate identity, unmatched entity, wrong case, wrong unit, or
  wrong convention is failure before numeric tolerance.

Absolute difference must never be compared with the dimensionless relative tolerance. Comparison
must be invariant under exchanging the two operands except where the expected-value denominator is
explicitly part of the approved rule. Coverage count and identity-set equality are checked before
numeric comparison.

## Required separation

| Field | Meaning |
|---|---|
| Absolute tolerance | Dimensioned bound in the compared unit |
| Relative tolerance | Dimensionless bound away from zero |
| Zero threshold | Boundary selecting near-zero treatment; not a tolerance substitute |
| Internal precision | Producer value retained before display formatting |
| Display precision | Presentation digits only |
| Rounding rule | Named mode and digit/decimal-place rule |
| Unit conversion | Exact declared scale/offset applied before comparison |

Tolerance values must be derived from analytical truncation/error bounds, reference-software
documented precision plus repeatability, or approved serialization semantics. Existing repository
values such as `1e-4`, `1e-10`, or `5e-2` are `REFERENCE_ONLY` until justified per quantity; they
are not adopted globally by DS-07.

Tolerance is frozen before the first Apollo/reference comparison. Increasing tolerance to make a
failure pass is prohibited. Tightening it also requires review because it can create false
instability around zero.
