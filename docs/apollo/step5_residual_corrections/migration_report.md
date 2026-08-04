# Migration report (Step 5-R)

| From | To | Behavior |
|------|-----|----------|
| ≤1.2 | 1.5.0-development | Force STALE (`generatedAt=null`); invent pavement/L-angle defaults as before |
| 1.3 | 1.5 | Preserve generatedAt when possible; add orientation default + crossFrameAttachment |
| 1.4 | 1.5 | Add `crossFrameAttachment` mid-flange-equivalent defaults (`UNVERIFIED_MIGRATED_DEVELOPMENT`); preserve generatedAt |

No formal catalog adoption. Sample values remain `UNVERIFIED_SAMPLE_PLACEHOLDER`.
