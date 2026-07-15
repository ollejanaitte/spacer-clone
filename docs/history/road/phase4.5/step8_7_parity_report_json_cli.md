# Phase 4.5 Step 8.7 — Versioned Parity Report JSON Contract and Node CLI

> Status: Implemented

## Objective

Provide a local Node CLI that reads two UTF-8 `ProjectModel` JSON files, runs the existing semantic parity core, and emits a deterministic versioned parity report JSON envelope.

## JSON Contract

- Envelope schema version: `1.0.0`
- The CLI uses the existing `ParityReportEnvelope` contract from `frontend/src/bridgeDefinition/semanticParity/serializer.ts`.
- The report is serialized with the existing canonical serializer; no duplicate serializer is introduced.
- Volatile timestamps are not injected by the CLI, so repeated runs on the same inputs are byte-identical.
- `toolVersion` is populated from `frontend/package.json` when available.

## CLI Usage

```bash
npm run parity:cli -- \
  --left path/to/left-project.json \
  --right path/to/right-project.json
```

Optional flags:

- `--output <path>`
- `--pretty`
- `--help`
- `--label-left <text>`
- `--label-right <text>`
- `--version`

## Input

- Local UTF-8 `ProjectModel` JSON only
- No YAML
- No remote URL input
- No stdin streaming

## Output

Without `--output`:

- JSON report is written to `stdout`
- `stderr` is reserved for diagnostics only

With `--output`:

- JSON report is written to the specified file
- `stdout` prints a short success notice only
- `stderr` is reserved for diagnostics only

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | equivalent |
| `1` | different |
| `2` | indeterminate |
| `3` | invalid input / invalid `ProjectModel` / invalid report |
| `4` | unexpected internal tool error |
| `64` | usage error |

## Validation

- Missing file, malformed JSON, and invalid `ProjectModel` input return exit code `3`.
- Unknown options and missing required arguments return exit code `64`.
- The CLI performs minimal local validation before comparison, including ProjectModel schema validation and basic cross-reference checks for nodes, members, supports, load cases, nodal loads, and member loads.

## Node / Browser Boundary

- The CLI is Node-only.
- Browser code does not depend on the CLI entrypoint.
- The comparison core remains reusable by browser and Node callers.

## Emit / Build

- Dedicated build config: `frontend/tsconfig.parity-cli.json`
- Build script: `npm run parity:cli:build`
- Runtime script: `npm run parity:cli -- ...`

The CLI build emits into `frontend/.tmp/parity-cli/`, which remains outside tracked source.

## Package Scripts

- `parity:cli:build`
- `parity:cli`
- `test:parity-cli`

## Deterministic Rules

- Use the existing canonical serializer.
- Do not inject runtime timestamps into the CLI envelope.
- Keep `schemaVersion` fixed at `1.0.0`.
- Keep source metadata stable and path-independent.

## Tests

- `--help`
- `--version`
- missing arguments
- unknown option
- missing file
- malformed JSON
- invalid `ProjectModel`
- equivalent / different / indeterminate status mapping
- `--pretty`
- `--output`
- stdout / stderr separation
- repeated run byte-identical output
- input file non-destructive behavior
- invalid report / unexpected internal error handling

## Backward Compatibility

- `compareSemanticParity` API remains unchanged.
- `createParityReportEnvelope` and `serializeParityReportEnvelope` are reused as-is.
- No existing `ProjectModel` schema changes were introduced.

## Explicit Non-Scope

- UI changes
- backend changes
- schema redesign
- package additions
- package-lock changes
- remote URL input
- YAML support
- stdin streaming
- watch mode
- interactive prompts
- GitHub workflow changes

## Known Limitations

- The CLI accepts only local files.
- Invalid input is rejected before report emission.
- `generatedAt` is intentionally not emitted by the CLI to preserve byte-identical output.

## Next Step

- Step 8.8 UI consumption of the parity report JSON contract.
