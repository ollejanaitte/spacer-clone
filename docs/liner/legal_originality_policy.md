# Legal and Originality Policy

## Purpose

Establish rules that ensure the Linear Coordinate Calculation System is an **original implementation** achieving functional equivalence with industry tools, without copying protectable expression from JIP-LINER or other products.

## Scope

- UI layout, terminology, icons, and window structure.
- Report and drawing layouts, titles, and boilerplate text.
- File extensions, magic bytes, and on-disk format mimicking.
- Marketing names, logos, and product branding.
- Code, documentation, and asset creation practices for the liner module.

## Out of Scope

- General civil engineering concepts (station, chainage, profile, cross-section) — these are public domain ideas.
- Standard mathematical formulas for circular curves, clothoids, and coordinate transformations.
- SI units and conventional axis naming in structural analysis.
- Functional requirements derived independently from engineering practice.

## Assumptions

- Functional equivalence is the product goal; interface and artifact design must be independently created.
- All design documents and code identifiers are in English per [language policy](../development/language-policy.md).
- User-visible Japanese strings are authored fresh and stored in i18n modules, not transcribed from third-party software manuals.

## Design Topics

- **Forbidden copies:** JIP-LINER screen captures as UI templates; identical menu hierarchies; identical report column order and headers; proprietary file extensions; product logos and splash imagery.
- **Allowed references:** Engineering textbooks; open standards; internal requirements for station/profile/grid behavior; existing in-house frame analysis conventions.
- **Naming:** Use neutral English internal names (`LinerProject`, `AlignmentSegment`, `StationEquation`). Choose an original user-facing product label via i18n (not "JIP-LINER" or confusingly similar marks).
- **File format:** Original extension and JSON schema (e.g., `liner-project.json` or nested section in project bundle — TBD in [project_file_format.md](project_file_format.md)).
- **Reports:** Original tabular layout; labels from i18n / backend label tables; geometry values from intermediate results only.
- **Review process:** UI mockups and report samples checked against this policy before implementation.

### Mandatory review gates (before UI / CAD / report coding)

Checklist — all must pass:

- [ ] No copied screen hierarchy or menu structure from third-party linear products
- [ ] No copied labels except generic engineering terms (station, offset, grade) via i18n
- [ ] No copied file extensions or proprietary binary/text formats ([import_export_policy.md](import_export_policy.md))
- [ ] Original report layout and table order ([report_output_spec.md](report_output_spec.md))
- [ ] Original drawing layers and title block ([cad_output_spec.md](cad_output_spec.md))
- [ ] Golden fixtures and tests do not embed third-party strings ([test_plan_cad_report.md](test_plan_cad_report.md))

Gate documented in [design_workflow.md](design_workflow.md) sign-off checklist.

## Open Questions

- Final user-facing feature name in Japanese (i18n key group name)?
- Whether any legacy user migration path from third-party tools is ever required (likely out of scope for MVP)?
- Legal review needed for report disclaimer text?

## Related Documents

- [liner_scope.md](liner_scope.md)
- [project_file_format.md](project_file_format.md)
- [ui_window_spec.md](ui_window_spec.md)
- [report_output_spec.md](report_output_spec.md)
- [cad_output_spec.md](cad_output_spec.md)

## Pre-Implementation Checklist

- [ ] Original file extension and schema name chosen.
- [ ] UI wireframes confirmed free of third-party layout copying.
- [ ] Report template draft uses original structure.
- [ ] i18n strings authored independently.
- [ ] No JIP-LINER assets referenced in repository.
