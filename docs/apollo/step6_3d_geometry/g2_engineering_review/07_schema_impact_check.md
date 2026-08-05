# Schema Impact Check

## Question: Does adding a bottom chord BraceMember require a schema change?

**Answer: NONE**

### Evidence

1. **BraceMember entity** (`generateBsdd.ts:252-258`): Each BraceMember is generated with a deterministic ID. The existing loop generates 2 per pair. Adding a third member inside the same loop changes the count but not the entity type.

2. **SwayBracing type** (`contracts/`): The `BraceMember` array per `SwayBracing` is unbounded. No schema change needed.

3. **Visualization mapping** (`bridgeStructureSolids.ts:485-536`): `buildBracingMember` accepts any `start`/`end` point and creates a solid. No schema change needed.

4. **STL export** (`apolloStlExport.ts`): Already handles `kind === "bracing"` with `sectionType === 1` (L-angle) and `sectionType === 0` (cylinder). No schema change needed.

5. **Quantity model** (`quantityModel.ts`): Already counts BraceMembers. May need a line item addition but no schema change.

6. **Input draft** (`bridgeStructure/types.ts`): No new fields required. The bottom chord reuses the same cross-frame attachment input.

### Conditional

If the reviewer decides on **Option S-B** (independent L-angle section), a new field in `ApolloCrossFrameAttachmentDraft` would be needed → **schema change**.

If the reviewer decides on **Option S-A** (same L-angle as diagonals) → **no schema change**.

## Verdict

**SCHEMA_CHANGE_REQUIRED: NO** (assuming S-A or S-C section)

G3 is implementable without schema modification.