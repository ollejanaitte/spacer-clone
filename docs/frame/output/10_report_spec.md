# 10 Report Specification

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE OUTPUT REFERENCE
> This is subordinate current output design evidence. It does not establish complete target PRINT or formal DRAFT; current capability and target gaps are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md).
<!-- DOC-AUTHORITY:END -->

## 1. Purpose

This document defines the JSON / CSV output and the minimal HTML report specification of analysis results for the MVP. The JIP-SPACER report viewer concept is used as a reference, but template editing and proprietary extension compatibility are not handled in the MVP.

## 2. Scope

- Result JSON output.
- Displacement CSV.
- Reaction CSV.
- Member end force CSV.
- Minimal HTML report.
- Analysis summary, warning, and error output.

## 3. Out of Scope

- Report template editing.
- Required PDF output.
- DXF output.
- JIP-SPACER report extension compatibility.
- Reports dedicated to influence lines, moving loads, eigenvalue, and response spectrum.
- Reports dedicated to temperature loads and prestress.

## 4. Report Specification

### JSON Output

The result JSON from `docs/frame/contracts/06_result_schema.md` is emitted as is.

Rules:

- Numbers are JSON numbers.
- No display rounding.
- `warnings` and `errors` are included.

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

`end` is `I` or `J`.

### HTML Report

Minimum sections:

- Project information.
- Unit system.
- Analysis settings.
- Model size.
- Load case list.
- Analysis summary.
- Warning list.
- Error list.
- Displacement table.
- Reaction table.
- Member end force table.

Number display:

- Numbers may be rounded in the UI / HTML.
- Numbers are not rounded in the JSON.
- Units are shown in column headers or table titles.

## 5. Error Handling

- An error report can be generated even on analysis failure.
- CSV headers can be emitted even when the result arrays are empty.
- Non-finite values cause report generation to fail with a `REPORT_ERROR`.
- File write failures are shown in the UI / API.

## 6. Test Viewpoints

- The three CSVs can be generated from a successful result JSON.
- The CSV headers match the specification.
- Member end forces are expanded into two rows, one for I and one for J.
- Error results show the error list in the HTML report.
- JSON numbers are not serialized as strings.

## 7. Definition of Done

- JSON / CSV output is available from the UI or the API.
- The specification does not contradict `docs/frame/contracts/06_result_schema.md`.
- Reports are limited to the MVP result scope.
- The JSON Schema and API test standards in `docs/development/quality-gates.md` are satisfied.

## 8. Dynamic Analysis Report Sections

The HTML report adds the following sections when the analysis type is `eigen` or `response_spectrum`. Sections with no data are omitted.

### 8.1 Eigenvalue Table

Lists `eigenResult.modes[]`.

| Column | Meaning |
| --- | --- |
| Mode number | `modeNo` |
| Eigenvalue | `eigenvalue` |
| Circular frequency | `circularFrequency` |
| Frequency | `frequency` |
| Period | `period` |
| Participation factor | X / Y / Z of `participationFactors` |
| Effective mass ratio | X / Y / Z of `effectiveMassRatios` |
| Cumulative effective mass ratio | X / Y / Z of `cumulativeEffectiveMassRatios` |

### 8.2 Effective Mass Ratio Summary

For each direction in `eigenResult.totalMassByDirection`, lists the final cumulative effective mass ratio and the number of used modes.

| Column | Meaning |
| --- | --- |
| Direction | `X` / `Y` / `Z` |
| Total mass | `totalMassByDirection[].value` |
| Final cumulative effective mass ratio | `cumulativeEffectiveMassRatios` of the last mode |
| Number of used modes | `eigenResult.modes.length` |

### 8.3 Response Spectrum Conditions

Reads the analysis conditions from `responseSpectrumResult`.

| Column | Meaning |
| --- | --- |
| Spectrum case ID | `spectrumCaseId` |
| Excitation direction | `direction` |
| Damping ratio | `dampingRatio` |
| Modal combination method | `combinationMethod` (`SRSS` / `CQC`) |
| Interpolation method | `interpolationMethod` (`linear` / `logLog`) |
| Target cumulative mass ratio | `targetCumulativeMassRatio` |
| Used modes | `usedModes` |
| Number of spectrum points | `project.analysisSettings.responseSpectrum.spectrumPoints.length` |
| Number of direction results | `responseSpectrumResult.directionResults.length` |

### 8.4 Displacement Table

Lists `responseSpectrumResult.combinedResult.displacements`.
The section name reflects the selected modal combination, e.g. `SRSS Displacements` or `CQC Displacements`.

| Column | Meaning |
| --- | --- |
| Node ID | `nodeId` |
| DX / DY / DZ | `ux` / `uy` / `uz` (m) |
| RX / RY / RZ | `rx` / `ry` / `rz` (rad) |

### 8.5 Dynamic Reaction Table

Lists `responseSpectrumResult.combinedResult.reactions`. When the data is not present, this section is omitted from the report.

| Column | Meaning |
| --- | --- |
| Node ID | `nodeId` |
| Fx / Fy / Fz | `fx` / `fy` / `fz` (kN) |
| Mx / My / Mz | `mx` / `my` / `mz` (kN m) |

### 8.6 Dynamic Member Force Table

Lists `responseSpectrumResult.combinedResult.memberSectionForces`. When the data is not present, this section is omitted from the report.

| Column | Meaning |
| --- | --- |
| Member ID | `memberId` |
| Station | `station` (0 to 1) |
| Component | `N` / `Qy` / `Qz` / `Mx` / `My` / `Mz` |
| Value | `value` (N, Q in kN / M in kN m) |

### 8.7 Direction Result Summary

Lists `responseSpectrumResult.directionResults[]`. When `directionResults` is empty, the section is omitted from the report.

| Column | Meaning |
| --- | --- |
| Direction | `direction` (`X` / `Y` / `Z`) |
| Combination method | `combinationMethod` |
| Interpolation method | `interpolationMethod` |
| Number of modal responses | `modalResults.length` |
| Number of combined displacements | `combinedResult.displacements.length` |
| Used modes | `usedModes` |

### 8.8 CQC Note

When `combinationMethod` is `CQC`, a `CQC Note` section is appended to the end of the dynamic analysis sections. This section states that the analysis uses the damping ratio of the run conditions and the standard CQC rho_ij interpolation formula.

### 8.9 Notes

- Both `SRSS` and `CQC` are supported. The MVP default is `SRSS`.
- Both `linear` and `logLog` interpolation are supported. When `logLog` is selected and the input data contains values less than or equal to 0, the analysis safely falls back to linear.
- Dynamic reactions and dynamic member forces are formally supported only on the `combinedResult` side at this time.
- Sections with no data are omitted from the report (they do not break the layout).
- Simultaneous combination of multiple directions in CQC (combining `directionResults` with SRSS) is not supported.
