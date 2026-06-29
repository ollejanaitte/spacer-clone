# calculation_pipeline.md Update Proposal

## 対象

- 元ファイル: `docs/liner/calculation_pipeline.md`
- 関連Phase: 3.5-4
- 更新理由: Phase3.5-0調査で現pipelineが固定Z、offset配列、空 `spans/piers/sections` であることが判明したため、N5のvNext stage orderを反映する。

## 更新箇所

| 現状章 | 現状記述 | 更新後記述 |
|---|---|---|
| 1. Stage order | validate→horizontal→station→vertical→grid | Horizontal→Station→Vertical→CrossSection→3D combine→spans/piers/sectionsに再編 |
| 3. Public API | `runPipeline(domain)` | domain draft vNext、sampling profile指定、mapper分離を明記 |
| 4. Re-sampling policy | sample spacing変更で再run | display/dxf/frame sampling key別cache/invalidationを追記 |

## 差分

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

## 参照

- `docs/liner/phase3.5/coordinate_integration_3d_design.md`
- `docs/liner/phase3.5/typed_liner_draft_schema_vnext.md`
