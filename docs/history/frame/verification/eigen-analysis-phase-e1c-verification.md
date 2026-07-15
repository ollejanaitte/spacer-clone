# Eigenvalue Analysis Phase E-1c Verification Record

<!-- DOC-AUTHORITY:START -->
> **Authority:** HISTORICAL / RETAINED EVIDENCE
> This document records prior planning, review, or executed verification. Current Frame facts are governed by [`../../../scoping/stage5_frame_analysis_scope.md`](../../../scoping/stage5_frame_analysis_scope.md), and target sequence, gaps, and gates by [`../../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../../planning/stage6-10/stage10_gap_migration_sequence.md). It does not establish current or target completion.
<!-- DOC-AUTHORITY:END -->

## Verification Purpose

This phase confirms that the following result items added in Phase E-1b are reliable for practical use.

- `totalMassByDirection`
- `effectiveMasses`
- `cumulativeEffectiveMassRatios`
- `eigen_modes.csv`

No new features are added in this phase. The purpose is to add the minimum automated tests and to record the verification to improve the reliability of the effective mass, cumulative participation ratio, and CSV output.

## Verification Targets

- `backend/engine/eigen.py`
- `backend/tests/test_eigen_analysis.py`
- `schemas/result.schema.json`
- `frontend/src/results/resultViewModel.ts`
- `frontend/src/components/ResultsPanel.tsx`
- `frontend/src/exports/resultCsvExport.ts`
- `docs/frame/analysis/eigen-analysis.md`
- `docs/frame/contracts/result-schema.md`

## Viewpoints Strengthened by Automated Tests

### Backend

- `cumulativeEffectiveMassRatios` is accumulated in mode order across multiple modes.
- `effectiveMasses = effectiveMassRatios * totalMassByDirection` is consistent for all X / Y / Z directions.
- When `totalMassByDirection` is 0 in a direction, the effective mass ratio, the effective mass, and the cumulative effective mass ratio are 0, and no NaN or inf is produced.
- The backend `eigen_modes.csv` header preserves the column order of E-1b.

### Frontend

- The ViewModel does not break when `totalMassByDirection` / `effectiveMasses` / `cumulativeEffectiveMassRatios` are missing in an old result.
- Missing optional values in old results are treated as empty cells in `eigen_modes.csv`.
- The frontend `eigen_modes.csv` header preserves the column order of E-1b.

## Automated Test Result

On 2026-06-08 the following were run.

- `pytest -q`: PASS
- `npm.cmd test`: PASS
- `npm.cmd run build`: PASS

`npm.cmd run build` showed a Vite chunk size warning, but this is not a failure for the features verified in E-1c.

## Manual Verification Result

User operation was confirmed.

Confirmed items:

- Eigenvalue analysis execution
- Result screen display
- Display of total mass per direction
- Display of effective mass
- Display of effective mass ratio
- Display of cumulative effective mass ratio
- `eigen_modes.csv` output

## Out of Scope

The following are not implemented in this phase.

- Response spectrum analysis
- CQC
- PDF output extension
- Schema changes
- Major UI rework
- Eigenvalue analysis logic change

Future issues:

- When designing response spectrum analysis E-2, connect the effective mass and cumulative participation ratio confirmed in E-1b / E-1c to the mode selection decision.
- The sparse eigenvalue solver policy for large models is studied in a separate phase.

## Conclusion

Phase E-1c is judged complete.

For the effective mass, cumulative participation ratio, and CSV output added in E-1b, the minimum automated test reinforcement and the verification record have been completed.

The next step, Phase E-2 "Response Spectrum Analysis Design", can be started.
