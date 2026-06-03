# Report Specification

## Purpose

MVP reporting exports analysis inputs and results in simple machine-readable and human-readable formats. Template editing and publication-grade reports are out of scope.

## Required Outputs

- Result JSON.
- Displacements CSV.
- Reactions CSV.
- Member end forces CSV.
- Minimal printable HTML report.

## JSON Report

The JSON report is the result schema defined in `docs/06_result_schema.md`.

Rules:

- Preserve numeric values as numbers.
- Include warnings and errors.
- Include analysis summary.
- Do not format numbers as strings.

## CSV Reports

### displacements.csv

Header:

```text
loadCaseId,nodeId,ux,uy,uz,rx,ry,rz
```

### reactions.csv

Header:

```text
loadCaseId,nodeId,fx,fy,fz,mx,my,mz,constrainedDofs
```

### member_end_forces.csv

Header:

```text
loadCaseId,memberId,end,fx,fy,fz,mx,my,mz
```

Rows:

- Each member produces one `I` row and one `J` row per load case.

## Minimal HTML Report

Sections:

- Project summary.
- Units.
- Analysis settings.
- Model counts.
- Load cases.
- Analysis summary.
- Warnings.
- Errors.
- Displacement table.
- Reaction table.
- Member end force table.

Formatting:

- Use clear units in headings.
- Use scientific notation for very small or very large values.
- Include generation timestamp.

## Number Formatting

UI and HTML may format numbers. JSON must not.

Recommended defaults:

- Displacements: 6 significant digits.
- Rotations: 6 significant digits.
- Forces: 6 significant digits.
- Moments: 6 significant digits.

## Export Controls

UI must provide:

- Export all JSON.
- Export displacement CSV.
- Export reaction CSV.
- Export member end force CSV.
- Export all CSV as separate files or zip in a later phase.

## Out of Scope

- Report template editing.
- Complex page layout.
- PDF generation as a hard MVP requirement.
- DXF output.
- JIP-SPACER report format compatibility.
