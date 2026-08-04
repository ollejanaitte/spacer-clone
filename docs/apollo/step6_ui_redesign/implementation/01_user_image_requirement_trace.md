# User Image — Requirement Trace Matrix

## Method

User-provided UI images (screenshots/mockups) were compared against P0-D target designs.
Where the images show specific behavior not yet covered by P0-D, a UI-1D delta requirement
is recorded below. P0-D architectural decisions remain unchanged.

## Delta Requirements

| ID | User Image Signal | P0-D Coverage | UI-1D Delta | Addressed In |
|----|-------------------|---------------|-------------|--------------|
| DR-01 | Header shows mode switch + file ops + nav as separate groups | P0-D §1: header redesign noted | Must use visual grouping (divider / gap / bg tint) between mode, file, nav, help | UI-1 |
| DR-02 | Save status shown as inline badge next to file ops | P0-D §1: status indicator noted | Save status must be a distinct element (not a button), positioned adjacent to file operations | UI-1 |
| DR-03 | Authorization shown compactly with expand option | P0-D §2: compact auth | Compact auth = single-line token badge; detail = expandable disclosure | UI-1 |
| DR-04 | Guided progress shows 6 phases + G01–G15 in integrated bar | P0-D §3: guided progress redesign | 6-phase high-level bar; G01–G15 shown as condensed steps under current phase; not 15 equal buttons | UI-2 |
| DR-05 | Sticky footer with back / save-and-next shown at bottom | P0-D §3: footer noted | Footer must be position: sticky; show validation errors inline above footer | UI-2 |
| DR-06 | Desktop: 2-pane with input left, 3D Viewer right | P0-D §5: viewer layout | Input pane ~30-40% width; Viewer pane ~60-70%; Viewer height = viewport minus header/footer | UI-3 |
| DR-07 | Viewer shows node count as supplementary info only | P0-D §5: supplementary info | Move GPU/WebGL details to TechnicalDetails; show only count + status in viewer chrome | UI-3 |
| DR-08 | Workflow: navigation list + single detail card | P0-D §4: master-detail | Navigation list (compact, state badges) on left/top; one detail card for selected step | UI-4 |
| DR-09 | Tablet: single column, input above viewer | P0-D §7: responsive | tablet breakpoint: input pane on top, viewer below; both full width | UI-5 |
| DR-10 | Mobile: input / 3D view tab switch | P0-D §7: mobile tabs | Bottom or top tabs switch between input and 3D viewer; never both visible simultaneously | UI-5 |
| DR-11 | All states use text+icon+shape, not just color | P0-D §8: accessibility | Every status indicator includes text label + icon + shape variation; color is supplemental | UI-5 |
| DR-12 | Guided steps show completion checkmark + step number | P0-D §3: progress indicators | Each Gxx shows: number, short label, checkmark (if complete), hollow circle (if pending), highlight (if current) | UI-2 |