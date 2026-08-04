# Step 5-R R1 — Sample reapply confirmation (DEC-S5-0002)

## Summary

Existing projects no longer silently overwrite when applying sample presets.
Detection distinguishes empty / unchanged / edited / other / dirty-unsaved.
Confirmation modal offers Cancel, Create new, and Replace with destructive action not as initial focus.

## Transaction

Replace snapshots the project, applies sample, generates, and rolls back fully on failure
(`forceGenerateFailure` fixture covered in unit tests). Create-new saves the current project
into Apollo workspace storage before opening a fresh sample project.

## Status

DEC_S5_0002_STATUS: IMPLEMENTED  
Authorization unchanged: NOT_GRANTED / PROHIBITED / UNVERIFIED_DEVELOPMENT_ONLY
