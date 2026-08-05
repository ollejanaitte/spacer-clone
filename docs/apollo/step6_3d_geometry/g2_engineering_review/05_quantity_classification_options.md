# Quantity Classification Options

## Option Q-A: Sway Bracing Steel Weight (Recommended)

| Property | Value |
|----------|-------|
| Category | Same as diagonal BraceMembers (sway bracing steel) |
| Count | 1 additional BraceMember per bay per station |
| Source | Existing `BraceMember` entity → steel weight computation |
| Schema | NONE |
| Double-count risk | NONE (new entity, not overlapping with existing cross beam) |
| Implementation | `quantityModel.ts` BraceMember loop already counts members; verify it includes the new 3rd member |

## Option Q-B: Secondary Member Steel Weight

| Property | Value |
|----------|-------|
| Category | Existing secondary steel weight category |
| Count | Separate from sway bracing diagonals |
| Risk | May break existing sway bracing weight totals |
| Not recommended | The bottom chord is structurally part of the sway bracing system |

## Option Q-C: Not Quantity-Exported

| Property | Value |
|----------|-------|
| Category | Visual-only (not counted in quantity) |
| Risk | Quantity under-reporting |
| Acceptable for | DEVELOPMENT_ONLY, but must be explicitly marked |