# Handoff Acceptance Verdict

time: 2026-07-26T09:52:19

```text
APOLLO_STAGE5_HANDOFF_ACCEPTANCE_VERDICT: ACCEPTED
ZIP_INTEGRITY_VERDICT: PASSED
TRACEABILITY_PACKAGE_VERDICT: PASSED
SOURCE_INTEGRITY_VERDICT: PASSED
```

### Notes
- ZIP size/SHA/entry/safety: PASS
- Staging checks: REQUIRED/EVIDENCE/LEAKS PASS
- SHA256SUMS: 135/137 content OK; 2 meta self-hash entries stale (documented)
- EXCLUDED_NOT_REFERENCED=2 not treated as defects
- immutable at `package/immutable/apollo_stage5_handoff/` (files chmod -w; dirs exec kept)
- staging file count: 0
