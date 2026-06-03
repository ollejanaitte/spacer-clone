# Design Documents

## Purpose

This directory contains the implementation design documents for the independent MVP 3D frame analysis system. The system references JIP-SPACER concepts but does not aim for full compatibility.

## Reading Order

1. `requirements_extraction.md`
   - Source extraction from the JIP-SPACER operation manual.
   - Broad reference scope, including items beyond MVP.
2. `02_mvp_scope.md`
   - Authoritative MVP boundary.
   - Read this before any implementation task.
3. `03_architecture.md`
   - System layers, responsibilities, data flow, and boundaries.
4. `04_input_schema.md`
   - `project.json` input format.
5. `05_analysis_engine_spec.md`
   - Python analysis engine responsibilities and numerical method requirements.
6. `06_result_schema.md`
   - Analysis result JSON and CSV mapping.
7. `07_api_spec.md`
   - FastAPI endpoint contract.
8. `08_ui_spec.md`
   - React UI layout and screens.
9. `09_3d_view_spec.md`
   - Three.js model viewer requirements.
10. `10_report_spec.md`
    - JSON/CSV/minimal HTML report requirements.
11. `11_test_spec.md`
    - Required verification and regression tests.
12. `12_quality_gate.md`
    - Pull request acceptance criteria.
13. `20_agent_instructions.md`
    - Role-specific Codex implementation instructions.

## MVP Authority

If documents appear to conflict, use this priority order:

1. `02_mvp_scope.md`
2. `04_input_schema.md`
3. `05_analysis_engine_spec.md`
4. `06_result_schema.md`
5. `12_quality_gate.md`
6. Other design documents
7. `requirements_extraction.md`

`requirements_extraction.md` is a broad extraction document. It is not the MVP boundary.

## Implementation Rule

Implementation PRs must keep code, tests, API contracts, UI fields, and examples aligned with these documents. If implementation needs to deviate, update the relevant design document in the same PR.
