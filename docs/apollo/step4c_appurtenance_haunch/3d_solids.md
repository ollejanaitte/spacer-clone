# Step 4-C2 — 3D Solids

## Scope

Render BridgeAppurtenance and RcDeckHaunch solids from the Step 4-C1 geometry kernel.

## Rules

- PROVIDED entities only; EXPLICIT_NONE / NOT_PROVIDED invent nothing
- Appurtenance: RECT extrusion along station (`APPURTENANCES` / `appurtenances`)
- Haunch: per `mainGirderRefId`, station range respected (`RC_DECK_HAUNCHES` / `rc-deck-haunches`)
- TRAPEZOID display uses average-width box (`ASSUMED_DEVELOPMENT_ONLY`); quantity/load keep exact C1 trap area
- No mesh reverse engineering; no dimension overlay
- Local CRS warning retained until Step 4-E

## Visibility

Viewer toggles: Appurtenances / Haunches (default ON with Apollo Solid).
