# Liner Scope

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define the functional scope, MVP boundary, and success criteria for the Linear Coordinate Calculation System (Liner) as an extension to the existing 3D frame analysis application.

## Scope

- Plan and profile geometry input for bridge and general alignment workflows.
- Station (chainage) computation along horizontal and vertical alignments.
- Transverse grid generation from alignment geometry and cross-section parameters.
- Intermediate result computation as the single source of truth for all derived outputs.
- Conversion of computed geometry into the existing frame analysis input model (`project.json`).
- Original UI for data entry, 2D plan/profile visualization, and export triggers.
- CAD-style drawing output and structured report output generated from intermediate results.
- Save/load of liner project data in an original file format.

## Out of Scope

- Pixel-perfect or structural replication of JIP-LINER UI, reports, file extensions, or branding.
- Import of JIP-LINER or other proprietary project files in the MVP.
- Full road-design standards compliance (e.g., detailed superelevation transition tables) unless explicitly added later.
- Real-time collaborative editing.
- Analysis execution inside the liner module (analysis remains in the existing backend engine).
- DXF as the primary native format (may be considered as export-only in a later phase).
- License management or external software integration beyond the existing frame analysis pipeline.

## Assumptions

- Liner is a **new feature module** within the existing Electron + React + FastAPI stack.
- The frame analysis input schema (`project.json`) remains the downstream target; liner does not redefine FEM schema keys.
- Users are civil/structural engineers familiar with alignment and station concepts; UI labels are Japanese via i18n.
- SI units (m, kN) align with the existing project unit policy unless extended in [unit_and_precision_policy.md](unit_and_precision_policy.md).
- Calculation logic is implemented in a UI-agnostic layer (TypeScript and/or Python — to be decided during architecture).

## Design Topics

- MVP user stories: create alignment → define stations → generate grid → export frame model.
- Feature phasing: MVP vs. post-MVP (complex curve types, batch export, template libraries).
- Integration entry point: new menu/window vs. bridge wizard extension.
- Relationship to [bridge-domain-model.md](../../frame/modeler/bridge-domain-model.md): shared concepts, separate or merged domain.
- Success metrics: valid `project.json` generation, geometry regression within tolerance, usable 2D editing workflow.

## Open Questions

- Should liner share the bridge wizard domain model or maintain an independent `LinerProject` schema?
- Minimum curve types for MVP: straight + circular arc + clothoid, or straight + arc only?
- Is superelevation required in MVP or deferred to profile phase 2?
- Where does liner-core live: `frontend/src/liner/core`, `backend/engine/liner`, or shared package?
- Single-window vs. multi-document liner sessions?

## Related Documents

- [design_workflow.md](design_workflow.md)
- [domain_model.md](domain_model.md)
- [integration_with_frame_model.md](../legacy-integration/integration_with_frame_model.md)
- [Legacy MVP scope](../../architecture/legacy-mvp-scope.md)
- [Legacy MVP architecture](../../architecture/legacy-mvp-architecture.md)

## Pre-Implementation Checklist

- [ ] MVP feature list agreed and ranked.
- [ ] Non-goals explicitly communicated to stakeholders.
- [ ] Integration entry point chosen.
- [ ] Overlap with bridge wizard documented (merge, extend, or parallel).
- [ ] Success criteria measurable (test cases linked).
