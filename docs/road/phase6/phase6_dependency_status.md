# Phase 6 Dependency Status

**Date:** 2026-07-23
**Status:** DRAFT_UPDATED_BY_MIMO_AUDIT

## Audit Baseline

```text
DOCS_ONLY_AUDIT_VERDICT: PASS_WITH_FINDINGS
BASELINE_HEAD: e1e4b64
BASELINE_ORIGIN_MAIN: e1e4b64
BASELINE_STATUS: only untracked docs/road/phase6/**
```

Findings:

- All required Phase6 docs exist, are regular files, and are non-empty.
- Candidate references are partly verified and must be rechecked before implementation.
- `P6_D02_GDRAW_Scope_Confirmation.md` remains as prior MiMo evidence and is a PARTIAL_SOURCE for `d02/p6_d02_gdraw_scope.md`; it contains a temporal snapshot stating Phase6 docs did not exist when that source was written.

## Dependency Matrix

| Dependency | Required by | Status | Phase6 rule |
| --- | --- | --- | --- |
| P4 Road feature base | PR-39 | ASSUMED_COMPLETE from prior phase docs | Verify on implementation branch before coding |
| P5 Road formal drawing base | PR-39 | COMPLETE per Phase5 record | Reuse as baseline |
| SP1 shared platform | PR-39, PR-41, PR-42 | SP1_PARTIAL_ACCEPTABLE_FOR_PR39 | Use existing liner drawing/DXF only with explicit adapter boundary; PR-41 blocked until neutral/shared or explicitly accepted |
| IF3 result/output contract | PR-40, PR-41, PR-42 | IF3_PARTIAL_BLOCKING_PR40_PR41_PR42 | Blocks authoritative Frame PRINT/DRAFT/Viewer output claims until verified |
| OD8-04 visual environment | PR-39..42 visual release | OPEN_NONBLOCKING_FOR_IMPLEMENTATION | Semantic implementation and controlled visual test prep may proceed; final visual release claim blocked |
| `.venv` runtime dependency | broader test gate | ENVIRONMENT_SETUP_MISSING | Unrelated to docs changes; blocks full-test gate until env setup |
| G6 output gate | PR-39..42 | NOT_STARTED | Needs semantic evidence and later visual evidence |

## SP1 Detail

Current repository evidence indicates drawing/DXF mechanisms exist under `frontend/src/liner/**`:

- drawing model and primitives
- paper/layout/transforms
- SVG renderers
- DXF model, mapper, serializer, validation
- print adapter

SP1 remains partial but acceptable for PR-39:

```text
SP1_STATUS: SP1_PARTIAL_ACCEPTABLE_FOR_PR39
```

Confirmed: `DrawingDocument`, shared primitives, DXF adapter, output routing, Road integration, source-of-truth separation.

Not confirmed or partial: Frame integration not confirmed, neutral shared boundary partial, tests sufficient partial.

PR impact: PR-39 is conditionally allowed; PR-41 is blocked until neutral/shared Frame drawing path is verified or explicitly accepted; PR-42 is impacted by the shared adapter contract.

## IF3 Detail

IF3 is the result/output interface freeze for Frame outputs.

```text
IF3_STATUS: IF3_PARTIAL_BLOCKING_PR40_PR41_PR42
```

Evidence found: `BridgeFrameAnalysisDocument` and schema exist; versioning is partial.

Evidence not found: result binding, staleness, provenance, and Frame PRINT/DRAFT/Viewer source contracts.

PR impact: PR-39 unaffected; PR-40 NOGO; PR-41 NOGO; PR-42 NOGO.

## OD8-04 Detail

OD8-04 remains OPEN for controlled visual baseline environments. Semantic implementation and controlled visual test prep can proceed, but final visual release claim remains blocked.

```text
OD8_04_STATUS: OPEN_NONBLOCKING_FOR_IMPLEMENTATION
```

## `.venv` Failure Classification

```text
VENV_FAILURE_CLASSIFICATION: ENVIRONMENT_SETUP_MISSING
ROOT_CAUSE: root .venv missing; frontend test imports bridgeDefinition regression helper that eagerly selects/asserts .venv Python at import time
DOCS_CHANGE_CAUSALITY: UNRELATED
IMPLEMENTATION_BLOCKING: NO for PR-39; PR_DEPENDENT for broader Phase6 full-test gate
```

No CI workflow, Makefile, `pyproject.toml`, or requirements file was found in the audit. `start-ubuntu.sh` documents the repo `.venv` preference.

Remediation is to run approved environment setup such as `./start-ubuntu.sh` or set `PYTHON` to a Python with required dependencies. Do not perform that in this docs-only audit.

## Dependency Verdict

```text
PHASE6_DEPENDENCY_VERDICT: CONDITIONAL_GO_FOR_PR39_ONLY_WITH_FINDINGS
```
