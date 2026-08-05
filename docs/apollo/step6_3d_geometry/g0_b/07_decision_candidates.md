# G0-B Decision Candidates

## Haunch Options

| Option | Description | Difficulty | Schema Impact | Quantity Impact |
|--------|-------------|-----------|---------------|-----------------|
| **H-A (RECOMMENDED)** | Deck center Z shifted by haunchHeight. Visual-only. | Low | None | None |
| H-B | Boolean union deck+haunch in Viewer. | High (visualization engine) | None | None |
| H-C | Generate deck with integral haunch geometry. | Very high (new kernel) | None | None |

## Cross-Frame Options

| Option | Description | Difficulty | Schema Impact | Quantity Impact | Load Impact |
|--------|-------------|-----------|---------------|-----------------|-------------|
| **C-A** | Add 3rd BraceMember (horizontal) to sway bracing generation. | Low (add 1 line in generateBsdd.ts + 1 line in bridgeStructureSolids.ts) | None | Steel weight increases | Minimal (dead load only) |
| C-B | Use existing CrossBeam as bottom chord. | Medium (logic to match stations) | None | Possible double-count | Confusing role |
| C-C | New pattern (X-frame). | High (new implementation) | None | Changes | Changes |
| C-D | Keep as-is (known limitation). | None | None | None | None |

## Recommendation

**H-A + C-A** — minimum viable fix with no schema change, no quantity double-count, no structural ambiguity.