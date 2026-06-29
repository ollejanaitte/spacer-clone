# calculation_pipeline.md Update Proposal

## 蟇ｾ雎｡

- 蜈・ヵ繧｡繧､繝ｫ: `docs/liner/calculation_pipeline.md`
- 髢｢騾｣Phase: 3.5-4
- 譖ｴ譁ｰ逅・罰: Phase3.5-0隱ｿ譟ｻ縺ｧ迴ｾpipeline縺悟崋螳啝縲｛ffset驟榊・縲∫ｩｺ `spans/piers/sections` 縺ｧ縺ゅｋ縺薙→縺悟愛譏弱＠縺溘◆繧√・5縺ｮvNext stage order繧貞渚譏縺吶ｋ縲・
## 譖ｴ譁ｰ邂・園

| 迴ｾ迥ｶ遶 | 迴ｾ迥ｶ險倩ｿｰ | 譖ｴ譁ｰ蠕瑚ｨ倩ｿｰ |
|---|---|---|
| 1. Stage order | validate竊檀orizontal竊痴tation竊致ertical竊暖rid | Horizontal竊担tation竊歎ertical竊辰rossSection竊・D combine竊痴pans/piers/sections縺ｫ蜀咲ｷｨ |
| 3. Public API | `runPipeline(domain)` | domain draft vNext縲《ampling profile謖・ｮ壹［apper蛻・屬繧呈・險・|
| 4. Re-sampling policy | sample spacing螟画峩縺ｧ蜀荒un | display/dxf/frame sampling key蛻･cache/invalidation繧定ｿｽ險・|

## 蟾ｮ蛻・｡・
```diff
@@ 1. Stage order
- 5. generateGrid(horizontal, vertical, gridDefs, sections, spans, piers)
+ 5. resolveCrossSection(crossSections, gridDefs)
+ 6. combine3DCoordinates(horizontal, stations, vertical, crossSection)
+ 7. generateSpansAndPiers(domain, grid)
+ 8. buildSections(vertical, crossSection, stations)
+ 9. buildFrameHints(generationSettings, grid)
+ 10. buildDependencySnapshot(...)
+ 11. assembleIntermediateResult(...)
+ 12. mapToFrameModel(...) [on user action only]

@@ 3. Public API
+ `runPipeline(domainDraft, options)` accepts a sampling profile: `display`, `dxf`, or `frame`.
+ Consumers do not call geometry routines directly.

@@ 4. Re-sampling policy
+ Sampling cache keys include `sourceRevision`, `draftSchemaVersion`, and sampling profile settings.
+ Display, DXF, and Frame sampling are invalidated independently, but any domain change invalidates all.
```

## 蜿ら・

- `docs/liner/phase3.5/coordinate_integration_3d_design.md`
- `docs/liner/phase3.5/typed_liner_draft_schema_vnext.md`
