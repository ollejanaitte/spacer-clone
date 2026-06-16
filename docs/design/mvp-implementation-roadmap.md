# mvp-implementation-roadmap.md

# MVP Integrated Implementation Roadmap

## 1. Purpose

This document is the integrated roadmap that defines the implementation order of the 3D frame analysis software MVP.

Each design document has already been written, so this document clarifies *what* is implemented, *in which order*, and *by which owner*.

## 2. Reference Documents

* `docs/design/result-schema.md`
* `docs/design/result-visualization.md`
* `docs/design/report-drawing-output.md`
* `docs/investigation/visualization-study.md`
* `docs/design/eigen-analysis.md`
* `docs/design/response-spectrum-analysis.md`
* Influence line / moving load design documents
* Save / project management design documents

## 3. Basic Policy

In the MVP the following priority applies.

1. Stable save / load
2. Stable display of static analysis results
3. Unified result schema
4. Eigenvalue analysis
5. Response spectrum analysis
6. Influence line analysis
7. PDF / CSV report
8. DXF is out of scope for the MVP

## 4. Implementation Order

## Phase 0: Lock the Current State

### Owner

MVP stability / save owner.

### Purpose

Do not regress the currently working static analysis, save, and startup behavior.

### Tasks

* Verify the current behavior.
* Confirm `npm run build`.
* Confirm backend tests.
* Confirm the existing save / load specification.
* Confirm any uncommitted local changes.

### Definition of Done

* The existing cantilever analysis still works.
* Save / load still works.
* Electron startup still works.
* No regression in existing features.

## Phase 1: Apply the Result Schema

### Owner

MVP stability / save owner.

### Purpose

Fix the common data structure for analysis results.

### Reference

* `docs/design/result-schema.md`

### Tasks

* Check the analysis result responses in the backend.
* Cross-check with the frontend type definitions.
* Organize the equivalent of `AnalysisResult`.
* Preserve the existing API compatibility.

### Prohibited

* Large-scale API changes.
* Changes to the analysis logic.
* Wholesale UI changes.

### Definition of Done

* The static analysis result is handled in a form close to the result schema.
* The frontend and the backend agree on the meaning of the types.

## Phase 2: Static Analysis Result Display MVP

### Owner

Results / drawing / report architect.

### Purpose

Allow the existing static analysis results to be reviewed in the UI.

### Reference

* `docs/design/result-visualization.md`
* `docs/design/result-schema.md`

### Targets

* Displacement table.
* Reaction table.
* Member force table.
* Deformed shape.
* Reaction diagram.
* Axial force diagram.
* Bending moment diagram.

### Section Forces in Scope for the MVP

* `N`
* `My`
* `Mz`

### Definition of Done

* The user can select a load case.
* The result tables and the diagrams reference the same case.
* The deformation scale is changeable.
* The main results can be visually confirmed.

## Phase 3: Eigenvalue Analysis MVP

### Owner

Dynamic analysis architect.

### Purpose

Compute eigenvalues and mode shapes and display them.

### Reference

* `docs/design/eigen-analysis.md`
* `docs/design/result-schema.md`

### Targets

* Mass input.
* Eigenvalue analysis.
* Natural period.
* Natural frequency.
* Mode vectors.
* Effective mass ratio.
* Mode shape display.

### Definition of Done

* The list of eigen modes can be displayed.
* Mode shapes can be displayed as a still image.
* Mass-zero DOFs are handled appropriately.

## Phase 4: Response Spectrum Analysis MVP

### Owner

Dynamic analysis architect.

### Purpose

Use the eigenvalue analysis results to perform a response spectrum analysis.

### Reference

* `docs/design/response-spectrum-analysis.md`
* `docs/design/result-schema.md`

### Targets

* Spectrum input.
* Period interpolation.
* Per-mode response.
* SRSS combination.
* Maximum response.
* Displacement, reaction, and section force output.

### Out of Scope for the MVP

* CQC
* Damping matrix
* Time history analysis

### Definition of Done

* SRSS results can be displayed.
* The results can be handled in the same Result Schema lineage as the static results.

## Phase 5: Influence Line Analysis MVP

### Owner

Load / influence line architect.

### Purpose

Build the influence lines that form the basis of bridge live load studies.

### Targets

* Loading point definition.
* Unit load movement.
* Nodal displacement influence line.
* Reaction influence line.
* Member force influence line.
* 2D graph display.

### Out of Scope for the MVP

* Complex road-bridge live load automation.
* Envelope diagrams.
* Concurrent section forces.

### Definition of Done

* Influence lines for any member and any component can be displayed.

## Phase 6: Report / CSV Output MVP

### Owner

Results / drawing / report architect.

### Purpose

Output analysis results in a form that can be reviewed externally.

### Reference

* `docs/design/report-drawing-output.md`
* `docs/design/result-schema.md`

### Targets

* Displacement CSV.
* Reaction CSV.
* Member force CSV.
* Simple PDF report.

### Out of Scope for the MVP

* DXF
* Word
* Excel
* Design calculation sheets

### Definition of Done

* Static analysis results can be exported to CSV.
* A simple PDF can be generated.

## Phase 7: UI Cleanup

### Owner

UI / UX and overall structure architect.

### Purpose

Organize the implemented features to make the product easier to operate.

### Tasks

* Clean up the result tree.
* Clean up the right property panel.
* Clean up the display settings.
* Clean up the menu.

### Note

UI cleanup is the last step. Do not make large UI changes before the analysis, save, and result schema are stable.

## 5. Agent Start Order

The recommended order is:

```text
1. MVP stability / save owner
2. Results / drawing / report architect
3. Dynamic analysis architect
4. Load / influence line architect
5. UI / UX and overall structure architect
```

## 6. Rationale

### Why the MVP stability / save owner goes first

* If the save format is unstable, every other feature has to be redone.
* It becomes the foundation for the Result Schema adoption.
* Not regressing the existing static analysis is the top priority.

### Why results / drawing / report go next

* Without a visible static analysis result, subsequent features are hard to verify.
* Eigenvalue, response spectrum, and influence line analyses all connect to the result display in the end.
* The Result Schema can be validated early.

### Why dynamic analysis goes after that

* Eigenvalue analysis is the prerequisite of response spectrum analysis.
* It is easier to verify once the result display infrastructure is in place.

### Why influence lines come later

* The input, the display, and the graph are all complex.
* It is safer to stabilize the static analysis result display first.

### Why UI / UX is the last step

* If the UI is polished before the features stabilize, rework is large.
* In the MVP, calculation, save, and result inspection take priority over appearance.

## 7. MVP Definition of Done

The MVP is complete when the following are satisfied:

* A 3D frame model can be created.
* It can be saved and loaded.
* Static analysis can be run.
* Displacements, reactions, and section forces can be reviewed.
* The deformed shape, reaction diagram, and section force diagram can be displayed.
* Eigenvalue analysis can be run.
* The eigen mode shapes can be displayed.
* The SRSS result of the response spectrum analysis can be reviewed.
* The main results can be exported to CSV.
* A simple PDF report can be generated.

## 8. Out of Scope for the MVP

The following are out of scope for the MVP:

* DXF output
* Automatic design calculation sheet generation
* Word output
* Excel output
* CQC
* Time history response analysis
* Advanced bridge live load automation
* Envelope diagrams
* Mode animation
* Advanced UI theme switching

## 9. Common Prohibitions During Implementation

* Do not make custom implementations that contradict the design documents.
* Do not change the Result Schema without authorization.
* Do not tightly couple the analysis engine to the display layer.
* Do not change the analysis result format for UI reasons.
* Do not perform a large refactor at the same time.
* Do not add a package without prior confirmation.

## 10. Conclusion

The MVP is implemented in the following order.

```text
Save stability
↓
Result Schema adoption
↓
Static analysis result display
↓
Eigenvalue analysis
↓
Response spectrum analysis
↓
Influence line analysis
↓
CSV / PDF output
↓
UI cleanup
```

This document is handed to each Codex agent to keep each owner within scope.
