# Apollo Phase 1-NN Unit 2 Data Contract

- Contract version: `2.0.0`
- Persistence location: `ProjectModel.apolloPhase1Unit2`
- Read path: hydrate existing persisted project, then hydrate Apollo unit2 sidecar
- Write path: serialize Apollo unit2 sidecar first, then serialize the persisted project payload

## Entities

- `metadata`
- `nodes[]`
- `materialReferences[]`
- `members[]`
- `supports[]`
- `audit[]`

## Fail-Closed Rules

- Unknown `schemaVersion` rejects hydration.
- Malformed arrays reject hydration.
- Duplicate IDs are surfaced as validation errors.
- Missing node/material references are surfaced as validation errors.
- Numeric material constants are not part of this contract.
