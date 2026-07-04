# Changelog

このファイルは [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) の形式を参考にしています。

## [Unreleased]

### Added

- LINER Phase 3.6 importer / launcher.
- LINER project storage, save/load, recovery flow.
- LINER Line Master UI.
- LINER schema adapter skeleton.
- LINER renderability gate and diagnostics design.
- Documentation reorganization for OSS readiness.

### Changed

- README / docs entry points are being reorganized around project purpose, architecture, status, and roadmap.
- LINER documentation now distinguishes implemented features, design source of truth, and future export work.

### Fixed

- LINER default draft creation.
- Axis-aware support and result rendering stabilization.

## [0.3.0-preview] - 2026-06

### Added

- FastAPI backend with project validation, analysis execution, save/load, autosave, examples, and health endpoints.
- Python 3D frame analysis engine for linear static analysis.
- Result export pipeline for displacement, reaction, member force, eigen, influence, and moving-load CSV output.
- React / TypeScript frontend with project tree, property panel, toolbar, result panels, and viewer integration.
- Electron desktop shell with Windows/macOS/Ubuntu startup scripts.
- GPU compatibility modes for Electron: `normal`, `compat-gpu-blocklist`, `compat-angle-gl`, `legacy-desktop-gl`.
- Three.js / react-three-fiber viewer for model display, deformed shape, labels, and response animation.
- Viewer display-size controls for nodes, supports, loads, labels, and member line width.
- A/B model comparison workspace with editable B model and independent analysis results.
- Static analysis verification cases for cantilever, simple beam, uniform load, torsion, truss, portal frame, and 3D frame examples.
- Eigenvalue analysis with natural period/frequency, mode vectors, participation factors, and effective mass ratios.
- Response spectrum analysis with SRSS, CQC, linear interpolation, and log-log interpolation examples.
- Time history analysis using Newmark-beta integration.
- Time history dashboard UI with model/support/mass checks, settings panels, result filters, charting, and animation controls.
- X / Y / Z independent ground-motion assignment and Resultant display for time history analysis.
- H24 ground motion import and sample data under `examples/ground-motions/`.
- Bridge domain model, bridge project API, bridge template API, and FEM generation endpoints.
- Bridge Wizard UI with road condition, span, impact factor, line, load, and model generation steps.
- Influence line analysis API and engine.
- Moving load analysis API and engine with moving history, envelope, and worst-case positions.
- PDF report path via printable HTML.
- JSON Schemas for project, result, bridge, and generated FEM payloads.
- Vitest, Playwright, and pytest test suites.
- Source hygiene checks for frontend code and Japanese string handling.
- LINER design document set under `docs/liner/`.
- LINER core geometry helpers for horizontal, vertical, cross-section, station, sampling, continuity, and Z merge logic.
- LINER UI pages for list, edit, setup tabs, station/profile input, grid preview, mapping review, and preview.
- LINER frame-model mapping and headless project generation.
- LINER project schema extension and migration helpers.
- LINER plan/profile DXF export experiments and tests.
- JSCAD/STL-related LINER frame export utilities.

### Changed

- Time history settings migrated to schemaVersion 2 `groundMotions.x/y/z` shape.
- Legacy time history `direction` / `groundMotionId` settings are migrated on load.
- Time history result selection moved from an output-target step to dynamic result filters.
- Time history charts use physical-quantity-aware Y axes and scientific notation for small values.
- Time history input checks for model/support/mass are read-only dashboard cards.
- Viewer label rendering isolates label-generation errors and falls back to line rendering.
- Large model labels are throttled to keep viewer interaction usable.
- Dynamic analysis report content now includes eigen and response-spectrum sections when available.
- Frontend localization has expanded across time-history and LINER UI.
- Bridge and LINER workflows are progressively integrated with the existing frame model rather than replacing `project.json`.

### Fixed

- Time history result values that appeared visually flat because of scaling.
- Time history 3D animation not appearing after result retrieval.
- Ground-motion direction handling for time history and H24 imports.
- Viewer displacement validation and member force visualization issues documented in handover reports.
- Eigen mode visualization path so actual mode shapes can be used instead of demo fallback data.
- Model reset tests for LINER vNext draft integration.
- LINER sampling and cross-slope tests.
- Horizontal and vertical continuity tolerances for LINER geometry.
- Project save/load path validation and non-finite JSON value handling.

### Removed

- No user-facing feature removals are documented for this preview line.

## [Initial Baseline]

### Added

- Initial repository baseline for pull requests.
- MVP design documents for architecture, input schema, analysis engine, result schema, API, UI, 3D view, reports, tests, and quality gates.
