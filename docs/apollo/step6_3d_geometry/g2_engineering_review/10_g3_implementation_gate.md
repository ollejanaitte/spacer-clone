# G3 Implementation Gate

## Readiness

G3 implementation (cross-frame bottom chord) can start only when the engineering review form is complete with:

- `ENGINEERING_REVIEW_STATUS` = `APPROVED` or `APPROVED_WITH_CONDITIONS`
- All conditions (if any) are fully specified and implementable

## Current Status

**G3_START_READINESS: NOGO_PENDING_HUMAN_REVIEW**

## Ready Checklist

- [ ] Engineering review form completed
- [ ] All DECISION fields filled
- [ ] Reviewer name, role, date documented
- [ ] Conditions (if any) are actionable
- [ ] Schema change not required (verified in 07_schema_impact_check.md)
- [ ] No canonical data change
- [ ] Formal authorization unchanged

## When Ready

G3 implementation branch should be created from the latest main that includes the signed review form.

## Denylist for G3

- `bridgeStructure/types.ts` — schema (no change needed)
- `bridgeStructure/crossFrameAttachmentTypes.ts` — cross-frame types (no change needed if section S-A)
- `schema/` — all schema files
- `package.json` / `lockfile`