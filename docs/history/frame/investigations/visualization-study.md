# Result Display, Drawing, and Report Architecture Study

## 1. Purpose

This document organizes the responsibility split when expanding analysis results into screen display, drawing, reporting, and export, and records the rationale for the architecture adopted in this project.

This study is the reflection of the already-fixed design. It does not perform implementation, UI changes, API changes, or library additions.

## 2. Adopted Architecture

The result display follows this flow:

```text
Result
  |
  v
ViewModel
  |
  v
Viewer
```

The report and drawing output follows this flow:

```text
Result
  |
  v
Drawing Model
  |
  v
Report Model
  |
  v
Export
```

In the whole result schema, the relations are:

```text
Solver
  |
  v
Result Schema
  |
  v
ViewModel

Report Model

Drawing Model
```

## 3. Reasons for Adoption

### 3.1 Restrict the Result Schema to Pure Analysis Result

`Result Schema` is the persistent interchange format of the analysis result returned by the solver. Therefore it does not include display-, operation-, or appearance-dependent state, such as:

- Display scale
- Display color
- Line width
- Font size
- Camera state
- UI state

These are handled in `ViewModel`, `Drawing Model`, `Report Model`, or the state of each Viewer.

### 3.2 The Purpose of Display and Reporting Differ

Screen display is for interactive review and handles selection, filter, scale, and emphasis. Report and drawing output are for reproducible output and handle paper, tables, drawing elements, notes, and export formats.

For this reason, screen display goes through `ViewModel`, and reports and drawings go through `Drawing Model` and `Report Model`.

### 3.3 Maintain Extension Consistency with Dynamic and Influence Line Analyses

Eigenvalue analysis, response spectrum analysis, and influence line analysis produce more kinds of results than the ordinary static analysis. The `Result Schema` defines the following, and the derived models convert them for display and output purposes.

- Eigenvalue analysis: eigenvalue, natural period, frequency, modal participation factor, effective mass ratio.
- Response spectrum analysis: SRSS, CQC, per-mode result, combined result.
- Influence line analysis: nodal displacement, reaction, section force.

## 4. Role of Each Document

| Document | Role |
| --- | --- |
| [result-schema.md](../../../frame/contracts/result-schema.md) | Defines the analysis result schema as the solver output. |
| [result-visualization.md](../../../frame/viewer/result-visualization.md) | Defines the display design that turns Result into ViewModel and passes it to the Viewer. |
| [report-drawing-output.md](../../../frame/output/report-drawing-output.md) | Defines the report and drawing design that expands Result into Drawing Model, Report Model, and Export. |

## 5. Conclusion

In this project, the analysis result itself is confined to the `Result Schema`, and the display, drawing, and report concerns are separated into derived models. This guarantees the stability of the solver output, the freedom of the Viewer, and the reproducibility of the report output at the same time.
