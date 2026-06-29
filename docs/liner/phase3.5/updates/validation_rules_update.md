# validation_rules.md Update Proposal

## 対象

- 元ファイル: `docs/liner/validation_rules.md`
- 関連Phase: 3.5-1。
- 更新理由: Phase3.5-0調査で水平/縦断/横断のvalidation不足が確認されたため、N1〜N4のdomain別validationとdiagnostic code mappingを追記する。
## 更新箇所

| 現状章 | 現状記述 | 更新後記述 |
|---|---|---|
| 2. Rule table | MVP ruleが単表 | Horizontal / Vertical / Cross Section / Schema Migrationに分離 |
| 2. Rule table | C0/C1は1行�Eみ | C0, C1, G2を個別rule匁E|
| 2. Rule table | Cross-section ruleなぁE| offset重褁E��crossfall finite、template参�E、superelevation overlapを追加 |
| Open Questions | Auto-fixのみ | 新規diagnostic codeの正式採番を実装��確認事頁E��追加 |

## 差分
```diff
@@ 2. Rule table (MVP)
+ ### Horizontal rules
+ | Segment chain C0 | endpoint gap > 1e-6 m | error | `LINER_GEOM_POSITION_DISCONTINUITY` |
+ | Segment chain C1 | azimuth gap > 1e-9 rad | error | `LINER_GEOM_AZIMUTH_DISCONTINUITY` |
+ | Segment chain G2 | curvature gap > 1e-6 1/m | warning | `LINER_GEOM_CURVATURE_DISCONTINUITY` candidate |
+ | Sampling settings | spacing/sagitta <= 0 | error | `LINER_GRID_SPACING_INVALID` |
+
+ ### Vertical rules
+ | Vertical coverage | grid station has no vertical element | error | `LINER_PROFILE_COVERAGE_GAP` candidate |
+ | Elevation continuity | elevation gap > 1e-6 m | error | `LINER_PROFILE_ELEVATION_DISCONTINUITY` candidate |
+ | Parabolic length | length <= 0 | error | `LINER_GEOM_ZERO_LENGTH_SEGMENT` |
+
+ ### Cross-section rules
+ | Offset line | duplicate offset within 1e-9 m | error | `LINER_GRID_SPACING_INVALID` |
+ | Crossfall | non-finite slope | error | `LINER_SCHEMA_INVALID` |
+ | Superelevation rules | station ranges overlap | error | `LINER_PROFILE_OVERLAP` |
+ | Template reference | gridDefinition references missing template | error | `LINER_SCHEMA_INVALID` |
+
+ ### Draft schema rules
+ | Domain draft | missing `liner.domainDraft` | error | `LINER_SCHEMA_INVALID` |
+ | Domain version | unsupported `liner.draftSchemaVersion` | error | `LINER_SCHEMA_INVALID` |
+ | Legacy draft | arbitrary free-form draft | error | `LINER_SCHEMA_INVALID` |
```

## 参照

- `docs/liner/phase3.5/horizontal_curve_completion.md`
- `docs/liner/phase3.5/vertical_alignment_design.md`
- `docs/liner/phase3.5/cross_section_superelevation_design.md`
- `docs/liner/phase3.5/typed_liner_draft_schema_vnext.md`

## Phase3.5-0.6 Diagnostic Severity

| Code | Severity |
|---|---|
| `LINER_GEOM_CURVATURE_DISCONTINUITY` | Warning |
| `LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED` | Warning |
| `LINER_PROFILE_ELEVATION_DISCONTINUITY` | Error |
| `LINER_PROFILE_COVERAGE_GAP` | Error |
| `LINER_EXPORT_POINT_COUNT_HIGH` | Warning |
