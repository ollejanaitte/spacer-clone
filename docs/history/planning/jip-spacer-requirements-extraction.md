# Requirements Extracted from the JIP-SPACER Operation Manual

## Purpose

To develop an in-house arbitrary-shape 3D frame analysis system with reference to JIP-SPACER, the implementation-target features are extracted from the operation manual and classified into the priorities `Must` / `Should` / `Could`.

This document is a pre-implementation design and a future instruction. Implementation is not done at this point.

## Reference Scope

Reference material: `SPACER Operation Manual.pdf`

Main chapter structure:

- Screen composition: input screen, drawing screen, execution screen, TV, PV
- Menu / toolbar: file, edit, view, calculation, drawing, window, help
- Data creation: CONTROL, STATICS, INFLOAD, R-SPECTRUM, PRINT, DRAFT
- Drawing: structural drawing, load drawing, search, line-of-sight change, copy, print
- Execution: handling of execution-time errors

## Basic Policy

The in-house system uses the JIP-SPACER screen composition and data classification as a reference, but the internal design is its own. Rather than copying the file format, report format, screen text, and UI layout of the existing product as is, the system designs structured data, analysis workflow, result review, and report output that satisfy the same engineering purpose.

The initial implementation is the MVP: "Enter a static 3D frame model, analyze fixed loads, and review displacements, member forces, and reactions with report output." Influence line analysis, response spectrum analysis, drawing creation, integration files, and detailed bridge load specifications are extended in stages.

## Assumed Architecture

- `Model` holds nodes, members, materials, sections, supports, springs, coordinate systems, and load cases.
- `AnalysisJob` holds the execution target, the execution order, the referenced analysis result, and the save policy.
- `AnalysisResult` holds the displacement, member force, reaction, eigenvalue, mode, and combination result per load case.
- `ReportDefinition` holds the case, node, member, support, group, and output format to be written into the report.
- `DrawingDefinition` holds the display conditions for structural drawings, load drawings, deformed shape, member force diagrams, and so on.
- The UI clearly separates input, analysis execution, result display, report, and drawing.

## 1. Model Creation Features

### Must

- Allow the analysis model type to be selected.
  - The 3D model is mandatory at the beginning.
  - Plane grid, in-plane frame, and out-of-plane frame may be supported later, but the data model must be able to express the DOF restriction.
- Allow the node coordinates to be entered and edited.
  - Node number, X/Y/Z coordinates, and invalid flag are handled.
  - Consistency check on the node count.
- Allow the material to be entered and edited.
  - Young''s modulus, shear modulus, Poisson''s ratio, coefficient of thermal expansion, and unit weight are handled.
  - Mutual complement rule between `G` and `nu` is designed.
- Allow the general member to be entered and edited.
  - Member number, I-end node, J-end node, material number, and section quantities `AX/IX/IY/IZ` are handled.
  - Consistency check on the member count.
- Allow the support conditions to be entered and edited.
  - The 6-DOF restraints are handled.
  - Validate that at least one of support, node spring, and coupling spring is present.
- Allow the node spring to be entered and edited.
  - A diagonal spring is mandatory at the beginning.
  - A coupling spring data structure is prepared, but the input may be restricted or unsupported at the start.
- Provide the basic decision logic of the member coordinate system.
  - The handling of the I/J end, member axis, vertical member, and double-node member is made explicit.
  - The sign convention of the section force is specified.
- Allow the fixed load case to be entered and edited.
  - Load case number, case name, load type, and load value are held.
  - The initial mandatory load types are `FORCE`, `MOMENT`, `LBAR`, `CBAR`, and `DISP`.
- Save and load the input data.
  - Use a structured format such as an in-house JSON or SQLite.
  - Have a schema version to support future version differences.
- Perform input checks and guide to the error position.
  - Detect non-existent node or member reference, duplicate number, undefined material, zero stiffness, insufficient restraint, and load case inconsistency.

### Should

- Allow the local coordinate system to be entered.
  - Specify `theta1/theta2/theta3` per node and reflect them in the support, node spring, reaction, and displacement output.
- Allow the member table to be defined.
  - Reuse the section quantities of the general member.
  - Handle the effective shear area `AY/AZ`.
- Handle a node-to-node spring member.
  - Supports bearing and double-node models.
- Allow the member joint condition to be entered.
  - Handle the 6-DOF release per I end and J end.
- Allow the member stiffness to be entered by section length.
  - Handle section length, section quantities, group, node list, and member list.
- Allow the initial tension to be entered.
  - Specify the policy for reflection in the geometric stiffness and the option to set the shear force to 0.
- Allow the member distributed spring to be entered.
- Allow a large member to be defined.
  - Multiple members can be grouped together for load input and drawing.
- Handle the live load treatment, initial tension addition, and the structural system change per load case.
- Provide input assistance.
  - Provide serial number creation, increment expansion, batch input of selection, continuous value input, and free-format input.

### Could

- Provide external file input equivalent to a linked file such as JIP-LINER.
- Provide standard material and standard load presets such as the Road Bridge Specification.
- Provide export equivalent to a TDAP linked file.
- Automatically apply the input restriction of plane grid, in-plane frame, and out-of-plane frame in the UI.
- Provide a free input mode.
  - An advanced function for editing data blocks in text form without going through the GUI.

## 2. Analysis Features

### Must

- Have execution control.
  - Specify the execution target, execution order, and re-execution range of the analysis job.
  - The initial implementation targets the fixed-load analysis equivalent to `STATICS`.
- Run the 3D frame linear static analysis.
  - Assemble the global stiffness matrix, and compute the nodal displacement, member section force, and support reaction.
  - Hold the result per load case.
- Have a save area for analysis results.
  - Prepare an internal data store equivalent to the JIP-SPACER master file.
  - Save the structure, load name, displacement, member force, and reaction per case.
- Design a re-execution policy equivalent to `NEW` / `OLD`.
  - Invalidate all results when the structural condition changes.
  - Re-analyze only the affected load case when only the load changes.
- Distinguish pre-analysis errors from in-analysis errors.
  - Pre-analysis errors guide the user to the error location in the UI.
  - In-analysis errors are recorded in the log and the report-equivalent output.
- Detect an unstable structure.
  - Detect insufficient restraints, singular stiffness, zero-stiffness members, and isolated nodes.

### Should

- Implement influence line generation.
  - Handle vertical and arbitrary-direction influence lines.
  - Allow specifying the influence line loading point and the node, member, and support as the influence value output target.
- Implement influence line analysis.
  - Handle grid shape, span length, line, carriageway, sidewalk, dead load, and live load.
  - Support dead load, L load, T load, lane load, and concentrated live load in stages.
- Implement load case combination and extraction.
  - Handle addition, subtraction, coefficient, division, case name, and extracted case.
  - Design `PICK1`, `PICK2`, and `PICK3` equivalent max / min extraction.
- Save the combination result in the analysis result store.
  - Select the cases to save.
  - Reuse it in drawing creation and result display.
- Handle per-node and per-member coefficients.
  - Apply individual coefficients to displacement, member force, and reaction.
- Convert the local coordinate system and the member coordinate system at output time.
- Study the calculation of concurrent section forces and concurrent reactions.
  - Save and output the section forces and reactions of other members and other supports at the max and min positions.

### Could

- Implement eigenvalue analysis.
  - Compute the eigenvalue, natural period, eigen mode, modal participation factor, and effective mass.
- Implement response spectrum analysis.
  - Handle excitation direction, used spectrum, damping ratio, SRSS / CQC, and regional correction factor.
- Provide arbitrary spectrum creation and external spectrum file input.
- Extend the detailed live load specification.
  - Handle L-25, T-25, LANE, railway train live load, crowd load, and automatic impact factor calculation.
- Handle the structural system change per load case.
  - Change the support, spring, stiffness, joint condition, and member spring per case.

## 3. Result Display Features

### Must

- Display the analysis result in table form.
  - Confirm the displacement, member force, and reaction per load case.
  - Filter by node number, member number, and support number.
- Display the structural drawing.
  - Display the node, member, node number, and member number.
  - Confirm the basic structural system.
- Display the load drawing.
  - Confirm the load type and loading position per load case.
  - The initial targets are the display of `FORCE`, `MOMENT`, `LBAR`, `CBAR`, and `DISP`.
- Link the result display and the input data reference.
  - Confirm the node and member numbers selected on the drawing and filter the result table.
- Provide zoom, original view restoration, and view range move.

### Should

- Display the confirmation drawing.
  - Visualize the support condition, node spring, member joint condition, member spring, virtual member, influence line loading point, large member, and member coordinate system.
- Provide confirmation drawing search.
  - Select a node or member on the drawing and display the condition and value in a dialog or side panel.
- Provide load drawing search.
  - Select a node or member on the drawing and display the load type and value applied.
- Display the deformed shape.
  - Handle the pre- and post-deformation shape, the deformation scale, and the auto scale per load case.
- Display the member force diagram.
  - Handle `FX/FY/FZ/MX/MY/MZ`, in-plane and out-of-plane, all components, and scale specification.
- Provide case switching.
  - Switch load cases and structural systems by first, previous, next, last, and arbitrary jump.
- Provide line-of-sight change.
  - Handle the standard views equivalent to XY, XZ, YZ, and arbitrary viewpoints.

### Could

- Display shrinkage diagram, mode diagram, influence line diagram, and line diagram.
- Overlay member force diagrams of multiple cases.
- Copy the selected node number and member number on the drawing to the clipboard.
  - Choose between free format and table format.
- Provide a white-background monochrome display mode.
- Provide a PV-equivalent plot file viewer and DXF display / conversion.

## 4. Report Features

### Must

- Output the analysis result report.
  - Output the displacement, member force, and reaction per case, node, member, and support.
  - The initial format is one of Markdown, CSV, HTML, and PDF.
- Specify the output target.
  - Handle all nodes, arbitrary nodes, all members, arbitrary members, all supports, arbitrary supports, all cases, and arbitrary cases.
- Confirm the analysis log and errors in the report or the log view.
  - Distinguish pre-analysis errors and in-analysis errors.
- Output the load combination table.
  - Display the combination case number, case name, coefficient, operation type, and note.
  - Support CSV save.
- Display and output the size data list.
  - Confirm the node count, member count, material count, support count, load case count, and so on.

### Should

- Output per-module reports.
  - Separate the output range by `STATICS`, `INFLOAD`, `PRINT`, and `DRAFT` equivalents.
- Provide a report viewer.
  - Move to the chapter, case, and result type with an index.
  - Provide search, page move, print, and export.
- Provide digit-formatted output.
  - Output displacement, member force, and reaction per group such as main girder, cross beam, and bearing line.
- Control the output format.
  - Handle max and min only, axial force focus, 3-DOF / 6-DOF, page break, and input order output.
- Design the output specification of mode, acceleration, and velocity.

### Could

- Output drawing reports.
  - Output the geometry drawing, deformed shape, member force diagram, mode diagram, influence line diagram, and line diagram as a report or drawing file.
- Configure paper size, orientation, character height, scale, and split count in detail.
- Provide drawing export such as DXF, SVG, PDF, and PNG.
- Provide an existing SPACER-style extension-based report view.
  - The internal format and screen expression remain in-house.

## 5. UI Features

### Must

- Separate the input screen, drawing screen, and execution screen.
  - The input screen edits the model and analysis conditions.
  - The drawing screen confirms the structural drawing, load drawing, and result diagram.
  - The execution screen displays the analysis progress, log, and errors.
- Provide module switching.
  - Have the concept of `CONTROL`, `STATICS`, `INFLOAD`, `R-SPECTRUM`, `PRINT`, and `DRAFT` in navigation.
  - Hide or disable unsupported modules in the initial implementation.
- Provide a tree menu or side navigation.
  - Jump directly to the input items.
  - Jump to the relevant screen when an error occurs.
- Provide table input.
  - Handle add row, delete row, move row, copy, paste, and range selection.
- Provide file operations.
  - Handle new, open, save, save as, and close.
- Provide a calculation execution button.
  - Confirm the save and validate the input before execution.
- Allow the input assistance and the validation result to be confirmed on the same screen.

### Should

- Provide useful table editing features.
  - Handle constant edit mode, batch input of the specified range, continuous value input of the specified range, and serial expansion.
- Provide free-format input.
  - Convert enumeration and range specifications such as `1,2,3;` and `101-110;` into an internal array.
  - Allow pasting into a table.
- Organize the menu and the toolbar.
  - Organize file, edit, view, calculation, drawing, window, and help.
- Provide the context menu of the drawing screen.
  - Call up the structural drawing, load drawing, settings, search, viewpoint change, zoom, restoration, and original view.
- Provide confirmation display.
  - Highlight the support, node spring, local coordinate, influence line loading point, and similar rows on the input table.
- Provide double-click jump to the execution-time error.
- Design a warning for unsaved changes and an automatic save.

### Could

- Provide multi-window display.
  - Stack, tile, and switch input, drawing, and execution.
- Provide help per screen.
  - Display the current screen description, the input items description, and examples.
- Provide a recent file history.
- Provide printer settings, print preview, and batch print.
- Provide external viewer equivalents TV / PV as independent screens.
- Organize keyboard shortcuts.

## Implementation Order Directive

### Phase 1: MVP

1. Define the data schema.
2. Build the minimum input UI.
3. Allow the node, material, member, support, and fixed load case to be entered.
4. Implement input validation.
5. Implement the 3D linear static analysis.
6. Display the displacement, member force, and reaction in a table.
7. Display the structural drawing and the load drawing.
8. Output the report in CSV or HTML.

### Phase 2: Business-use Extension

1. Extend the member table, local coordinate system, member coordinate system, node spring, and member joint condition.
2. Add more load types.
3. Implement combination / extraction and save of the result equivalent to the master file.
4. Implement the output specification, load combination table, and size list.
5. Implement the deformed shape, member force diagram, and confirmation drawing search.

### Phase 3: Advanced Analysis and Drawing

1. Implement influence line generation and influence line analysis.
2. Implement the live load specification, line, grid shape, span length, and impact factor.
3. Implement eigenvalue analysis and response spectrum analysis.
4. Implement the drawing definition equivalent to DRAFT, mode diagram, influence line diagram, and line diagram.
5. Extend the drawing and report output to PDF, DXF, SVG, and so on.

## Out of Scope or Cautions

- Protection keys, license disks, and Windows 2000 / XP / Vista specific requirements are not adopted in the in-house system.
- Whether the JIP-SPACER proprietary file extensions and report extensions are made compatible targets is decided separately.
- Specification values such as the Road Bridge Specification must be implemented with the version of the law or standard clearly stated.
- Because verification of the analysis engine is important, prepare unit tests, known solutions, and comparison models for each feature.
- Before the UI implementation, fix the data schema, the coordinate system convention, the sign convention, the unit system, and the load case convention.

## Design Documents to Create Next

- `docs/domain_model.md`: data model of nodes, members, materials, supports, loads, and results
- `docs/analysis_engine_design.md`: static analysis, boundary condition, equivalent nodal load of load, section force calculation
- `docs/ui_flow.md`: screen transitions of input, execution, result, report, and drawing
- `docs/report_design.md`: report template, output target, CSV / PDF / HTML policy
- `docs/validation_rules.md`: input validation, pre-analysis validation, error code system
