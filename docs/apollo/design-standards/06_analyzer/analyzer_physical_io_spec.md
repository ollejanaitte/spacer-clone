# Analyzer Physical I/O Specification — DS-06

**Authority:** DS-06 / CURRENT INTEGRATION
**Date:** 2026-07-27
**Baseline:** `c3d1f2de86ab3567d51b5f6cd1aa946323fd9b10`

## Freeze boundary

`Analyzer` is not frozen as one inferred product. DS-06 separates the identities in
[analyzer_identity_register.csv](analyzer_identity_register.csv):

1. the repository Python linear-static solver;
2. its FastAPI JSON adapter at `POST /api/analysis/run`;
3. the IF3 result normalizer and optional result-resource persistence boundary;
4. the historical external APOLLO Analyzer described only as an analysis subsystem;
5. test or preview runners that are not authoritative analysis engines.

The repository solver and adapter are `PROJECT_SPECIFIC` code contracts. They do not prove the
identity, invocation, file formats, version, license behavior, or numeric equivalence of the
historical external Analyzer or SPACER. Historical handoff statements are `REFERENCE_ONLY`.

## Repository-observable contract

| Topic | Frozen observation | Status | Evidence |
|---|---|---|---|
| Invocation | HTTP `POST /api/analysis/run`; request is a JSON object containing a project and optional `options.returnCsv` | `PROJECT_SPECIFIC` | `backend/app/main.py:100-143` |
| Solver call | Adapter deep-copies the project and calls in-process `run_analysis`; no external executable launch occurs in this route | `PROJECT_SPECIFIC` | `backend/app/main.py:118`; `backend/engine/solver.py:22-43` |
| Core input | Python mapping parsed into project, nodes, materials, sections, members, supports, load cases, nodal/member loads, and analysis settings | `PROJECT_SPECIFIC` | `backend/engine/model.py:184-231` |
| Core output | JSON response contains raw `result`, optional `csv`, normalized `if3Result`, and optional persisted result reference | `PROJECT_SPECIFIC` | `backend/app/main.py:120-143` |
| CSV representation | Requested CSV is a filename-to-text map in the JSON response, not a file written by the solver route | `PROJECT_SPECIFIC` | `backend/app/main.py:120-138`; `backend/app/reports.py:96-107` |
| Optional physical persistence | IF3 sidecar is `<frame-dir>/results/<result-id>.if3.json`; create-only persistence rejects an existing result ID | `PROJECT_SPECIFIC` | `backend/engine/if3_persistence.py:115-145,183-209,287-312` |
| Sidecar encoding/write | UTF-8 JSON, indent 2, terminal LF, non-finite values rejected; temporary file is flushed/fsynced then replaced and cleaned in `finally` | `PROJECT_SPECIFIC` | `backend/app/atomic_json.py:84-90,127-191` |
| Persistence concurrency | In-process path lock and expected-checksum conflict detection exist; cross-process external Analyzer behavior is not implied | `PROJECT_SPECIFIC` | `backend/app/atomic_json.py:150-161,203-238` |
| Failure transport | Solver failures are represented in result JSON; successful HTTP transport alone is not analysis success | `PROJECT_SPECIFIC` | `backend/engine/solver.py:22-43`; `backend/engine/errors.py` |
| CSV authority | Backend compatibility CSV is built from raw result before IF3 authorization and can be present when IF3 is invalid; it is never authoritative | `PROJECT_SPECIFIC` | `backend/app/main.py:103-139`; `backend/app/reports.py` |
| PDF authority | No PDF is emitted by this analysis route | `PROJECT_SPECIFIC` | `backend/app/main.py:100-143` |

The service advertises application version `0.3.0-preview`, while current IF3 producer metadata may
contain `scipy_sparse` / `0.3.0`. These repository strings are not an executable checksum, a SciPy
runtime inventory, or external Analyzer product evidence. IF3 creation also includes run-specific
identifiers and timestamps, so byte identity is not expected without an approved metadata
normalization policy. The two-step sidecar-then-frame-reference update can leave an unreferenced
sidecar after a later conflict or interruption; its presence alone cannot authorize consumption.

## External Analyzer physical contract

Executable name/path, product/version, checksum, arguments, environment, working directory,
master/work/temporary files, encoding, newline, overwrite rules, stdout, stderr, exit codes,
error files, license behavior, timeout/cancellation, cleanup, concurrency, crash recovery,
stale-output rejection, and deterministic repeatability are all
`BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`.

No SPACER manual workflow or repository IF3 schema may be promoted into an external Analyzer
physical contract. The exact acquisition packages are in
[analyzer_blocker_register.csv](analyzer_blocker_register.csv), and the required probes are in
[analyzer_probe_matrix.csv](analyzer_probe_matrix.csv).

## Success acceptance rule

An external run is successful only when all of the following are evidenced for the fixed binary
checksum and license state:

- process/service completion matches a documented success signal;
- required output set is newly created for the current input and run identifier;
- output checksums and timestamps/provenance bind to the current input checksum;
- schema/format parse and semantic validation pass;
- no license/error artifact indicates failure;
- stale pre-existing outputs cannot be selected;
- cancellation, timeout, crash, and concurrent runs cannot publish a successful authoritative result.

Exit status `0`, existence of any output, a screenshot, CSV appearance, or PDF appearance alone is
insufficient.

For the repository HTTP route, `analysisSummary.status` and IF3 status/diagnostics must be evaluated;
tests demonstrate that a structurally valid HTTP response can carry a failed analysis. A status-only
export helper without a live source document is not physical freshness evidence. Authoritative
CSV/PDF export requires a separate live-source IF3 gate; the backend compatibility CSV does not
enforce that gate. Closure evidence for derived-export authority is `AN-BLK-009`.

The repository service is started through Python/Uvicorn in development and can be packaged behind
the desktop launcher, but DS-06 does not promote a launcher process into the historical Analyzer.
The repository route has no analysis cancellation signal in its current client contract, no license
gate in the solver path, and no demonstrated external-process working-file behavior. Malformed HTTP
JSON and service-startup failures are transport concerns distinct from a solver result failure.

## Load-context mapping

The repository raw linear-static solver iterates named `loadCases`. The IF3 B1 normalizer accepts
linear-static `loadCase` context only; a `loadCombination` kind in the general contract does not
prove implementation support. External Analyzer load-case and combination mapping, and any
repository-to-external mapping, remain `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` under
`AN-BLK-010`. A combination must not be flattened, renamed, or treated as a load case without
versioned mapping evidence and a checksum-fixed minimal combination probe.

## Probe governance

Each machine probe must run in an isolated, newly created directory using a copied input artifact.
Record operating system, locale, timezone, executable/service identity, product version, license
identity (redacted where required), command/service request, environment allowlist, start/end time,
stdout/stderr bytes, exit/signal, before/after recursive file manifests, SHA-256 for every retained
artifact, and cleanup result. A stale-output sentinel must be seeded where the probe requires it.
Never modify licensed program files or redistribute restricted binaries/manuals.

## Verdicts

```text
DS06_ANALYZER_IDENTITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS06_INVOCATION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS06_FILE_IO_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS06_UNIT_COORDINATE_DOF_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS06_SIGN_CONVENTION_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS06_ERROR_EXIT_LICENSE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS06_CONCURRENCY_CLEANUP_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS06_REPRODUCIBILITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS06_MACHINE_EVIDENCE_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
DS06_DOCUMENT_COMPLETION_VERDICT: COMPLETE
```
