# Phase 4.5 Step 8.6 Response Spectrum Partial Parity

## Status

Implemented in the frontend semantic parity layer for currently supported response spectrum result fields.

## Objective

Compare currently supported response spectrum results without changing backend solver behavior, project schema, UI, or package configuration.

## Implemented Scope

- modal results
- combined result
- displacement
- reaction
- member section force N/My/Mz
- mode matching by mode number and deterministic ordering
- deterministic report serialization

## Canonical Semantics

- `spectrumCaseId`, `direction`, `combinationMethod`, and `interpolationMethod` are treated as top-level identity fields.
- Modal results are matched by `modeNo`.
- Combined results are matched by method and per-row identity.

## Supported Components

- `N`
- `My`
- `Mz`

## Unsupported Components

- `Qy`
- `Qz`
- `Mx`

## Missing / Zero / Failure Rules

- missing result vs explicit zero is distinguished
- solver failure is invalid
- invalid numeric values are invalid
- absent modal or combined rows are reported

## Mode Matching

- modal rows are order independent
- mode count and `modeNo` are preserved as trace data
- no arbitrary matching is introduced

## I/J Reversal Handling

- no deterministic I/J reversal transform is inferred
- reversed member force handling remains unsupported rather than guessed

## Report Integration

- reuses the existing parity report envelope and serializer
- preserves static/eigen parity behavior

## Fixtures

- equivalent modal result
- modal permutation
- missing result
- failed result
- invalid numeric result
- explicit zero result

## Tests

- response spectrum parity unit tests
- serializer determinism checks
- existing semantic parity tests

## Backward Compatibility

- no backend schema changes
- no UI changes
- no CLI changes
- no package changes

## Explicit Non-Scope

- solver changes
- Qy / Qz / Mx support expansion
- stress parity
- influence line parity
- moving load parity
- time history parity

## Known Limitations

- result matching is limited to currently exposed response spectrum fields
- member section force comparison is partial and stays within the supported component subset

## Next Step

Step 8.7 JSON / CLI
