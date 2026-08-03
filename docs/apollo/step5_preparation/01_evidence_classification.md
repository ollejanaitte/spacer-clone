# 01 — Evidence Classification

| Tag | Meaning |
|-----|---------|
| CODE_CONFIRMED | Confirmed from types, generators, tests, or persisted schema |
| GUI_OBSERVED | Confirmed by running latest main UI / screenshots |
| USER_REPORTED | User statement/image; not yet code-verified as defect |
| INFERRED | Reasonable inference from multiple sources; marked as such |
| NOT_VERIFIED | Cannot decide with current materials |
| REQUIRES_ENGINEERING_REVIEW | Formal structural judgment / design basis required |

Rules: do not treat GUI screenshots as structural correctness; do not invent standard member sizes; do not mark unverified items PASS.
