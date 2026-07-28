# Apollo Phase 1 First Execution Plan

## Purpose

Define the first reversible implementation unit that may begin only after the overall gate changes to `GO`.

## Candidate first unit

Feature-flagged project shell with candidate bridge-geometry editor and provisional-status banner.

## Why this unit

- smallest user-visible slice
- reversible without touching released numerics
- compatible with current handoff scope
- enforces blocked numeric posture instead of weakening it

## Preconditions

- final gate changes from `NOGO` to `GO`
- source blockers closed
- machine identity and probe evidence accepted
- Golden and parity approvals accepted
- full validation rerun passes on `main`

## Implementation sequence

1. Add flags and kill switches.
2. Add provisional-status and blocked-result messaging.
3. Add project shell and topology editor with no adopted defaults.
4. Add adapter interface contracts without native execution.
5. Add regression coverage for disabled, enabled, and blocked-numeric paths.

## Non-goals for the first unit

- solver execution
- SPACER parity claims
- result numerics
- code-check equations
- production exports

## Rollback

Single-flag disablement must hide the new entry points and prevent persisted result publication.
