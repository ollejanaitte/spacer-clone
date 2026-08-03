# 09 — UI Screen Specification

**Policy:** Do not replace existing detail panels. Workflow is the **control plane**; existing panels remain **work surfaces**.

## 1. Design workflow control screen

- **Purpose:** Show WF-01..WF-15 with status, reasons, next CTA
- **Entry:** Apollo shell primary nav / basics header
- **Fields:** derived statuses; no duplicate numeric inputs
- **Disabled:** when BLOCKED/ERROR/OUT_OF_SCOPE; show reason
- **STALE:** badge + “再生成を推奨” CTA
- **A11y:** not color-only; icons + text; keyboard list navigation

## 2. Deck appurtenances input

- Segments for curb L/R, wall railing L/R, median, optional barrier
- Units m; EXPLICIT_NONE checkboxes; unit weight optional USER_PROVIDED_UNVERIFIED
- Validation: start&lt;end, non-negative sizes, overhang conflicts → diagnostics

## 3. Haunch input

- Per girder or “apply all”; RECT/TRAPEZOID; constant range 0..L default
- Fail-closed if girder ref missing

## 4. Splice / filler input

- Station list; plate sizes; filler t; bolt pattern counts
- Banner: NOT DESIGN-CHECKED / NOT_AUTHORIZED

## 5. Load confirmation

- Read-only derived line loads + distribution rule + exclusions (splice SW)

## 6. Road alignment binding

- Pick alignment/line IDs from LINER/project; stations; show checksum; diagnose missing source

## 7. 3D dimension controls

- Group toggles; unit; precision; measure mode; clear measurements

## 8. Deliverables status

- Extend OutputIntegrationPanel (already Step 3-E) with new artifact rows when models exist

Empty/error states required for each screen; desktop-first; mobile: workflow list collapses to accordion.
