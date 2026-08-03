# Migration Report

1.0.0 → 1.1.0-development:
- Existing numeric/layout fields unchanged
- appurtenance slots = NOT_PROVIDED, item=null
- haunch girders = []
- No auto entity creation
- No null→0, no []→EXPLICIT_NONE
- generatedAt cleared on legacy read (STALE until regenerate)
- Idempotent re-parse of 1.1.0 preserves values/IDs
