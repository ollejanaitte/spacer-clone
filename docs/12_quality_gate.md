# Quality Gate

## Purpose

Every pull request must satisfy these acceptance criteria unless the PR explicitly updates this document and explains why.

## Required Checks

### Python Tests

- `pytest` passes.
- Verification cases in `docs/11_test_spec.md` pass.
- API tests pass when API code exists.

### Ruff

- Ruff lint passes for Python code.
- Ruff formatting passes if configured.

### Type Hints

- New Python public functions must include type hints.
- Engine data structures must use typed models or dataclasses.
- Avoid untyped dictionaries in core numerical code except at API boundaries.

### JSON Schema Validation

- `project.json` examples validate.
- Invalid examples fail with expected error codes.
- Result JSON follows `docs/06_result_schema.md`.

### Numerical Accuracy

- Required theory comparisons must pass tolerances.
- Default relative tolerance: `1e-5`.
- Near-zero absolute tolerance must be explicitly set in tests.
- Sign convention changes require updating specs and tests together.

### API Tests

- Endpoint success paths pass.
- Endpoint failure paths pass.
- Error response shape remains stable.

### UI Build

- Frontend build succeeds when frontend exists.
- TypeScript checks pass when TypeScript is configured.
- UI must not introduce analysis logic that duplicates engine behavior.

### Documentation Consistency

- Changes must align with these documents:
  - `docs/02_mvp_scope.md`
  - `docs/04_input_schema.md`
  - `docs/05_analysis_engine_spec.md`
  - `docs/06_result_schema.md`
  - `docs/07_api_spec.md`
- If implementation intentionally differs, update the relevant spec in the same PR.

## PR Acceptance Checklist

- Tests pass locally or CI explains environment limitation.
- No implementation expands MVP scope without spec update.
- No generated build artifacts are committed unless explicitly required.
- No unrelated user changes are reverted.
- New examples are documented.
- New errors use structured error format.
- New UI fields map to schema fields.

## Blockers

A PR must not be accepted if:

- It silently changes units.
- It changes sign convention without tests and docs.
- It returns `NaN` or `Infinity` in JSON.
- It catches solver errors and reports success.
- It implements out-of-scope advanced features in MVP paths.
- It modifies `docs/requirements_extraction.md` without a clear documentation reason.
