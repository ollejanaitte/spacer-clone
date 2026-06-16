# Bridge Animation & Display Design

This document records the design decisions for the 5-spans straight
continuous viaduct default model and the viewer animation feature that
ships in the MVP. The goal is to give the user an immediately
recognizable bridge geometry (A1 - P1 - P2 - P3 - P4 - A2) with a
visible contrast between the rock-founded piers and the soft-founded
piers when the animation is enabled.

## 1. Coordinate system

The whole project keeps the following convention:

| axis | meaning                              |
| ---- | ------------------------------------ |
| X    | bridge axis (longitudinal)           |
| Y    | height (vertical, upward positive)   |
| Z    | transverse direction                 |

This is consistent with the 3D viewer, the analysis engine, and all
input/output schemas. It is intentionally **not** the CAD Z-up
convention so that the same project file can be reused everywhere.

## 2. Default 5-spans viaduct

```
A1 - P1 - P2 - P3 - P4 - A2
0    30   60   90   120  150 m
```

* Superstructure nodes (G0..G5): y = 20 m, z = 0, x = 0/30/60/90/120/150
* Pier base nodes (B1..B4): y = 0, z = 0
* Members:
  * MG0..MG4: deck (G0-G1, G1-G2, G2-G3, G3-G4, G4-G5)
  * MP1..MP4: piers (G1-B1, G2-B2, G3-B3, G4-B4)

### Boundary conditions

The MVP `Support` schema only supports a 6-DOF boolean (true = fixed,
false = free) description. The default model encodes the desired
behaviour as follows:

| node | ux | uy | uz | rx | ry | rz | role                                |
| ---- | -- | -- | -- | -- | -- | -- | ----------------------------------- |
| G0   | F  | T  | T  | T  | T  | T  | Abutment A1: sliding bearing        |
| G5   | F  | T  | T  | T  | T  | T  | Abutment A2: sliding bearing        |
| B1   | T  | T  | T  | T  | T  | T  | Pier P1 on rock: fully fixed        |
| B2   | T  | T  | T  | T  | T  | T  | Pier P2 on rock: fully fixed        |
| B3   | F  | T  | F  | F  | T  | F  | Pier P3 on soft soil: Y/Ry fixed    |
| B4   | F  | T  | F  | F  | T  | F  | Pier P4 on soft soil: Y/Ry fixed    |

(T = fixed, F = free. Rx/Ry/Rz at the abutments remain fixed because
the boolean Support cannot express a hinge; the animation focuses on
the horizontal DOFs which are what the user expects to see move.)

The "soft ground" piers only fix vertical Y and the rotation about the
bridge axis. This leaves longitudinal X, transverse Z, and two
rotations free, which causes the soft side to sway more than the rock
side.

## 3. Animation feature

The 3D viewer adds a small animation control panel with the following
elements:

* ON/OFF button
* Mode selector (always shows Mode 1..N; real modes become available
  after running an Eigen analysis)
* Display scale slider (0.1..10)
* Playback speed slider (0..5; 0 = frozen)
* Pseudo-mode direction selector (bridge axis X or transverse Z)
* "Use demo mode" toggle (default ON; when OFF the real Eigen mode
  shape is used if available)

The animation is display-only and never mutates `project.json`,
`project.nodes`, or any analysis input.

### Composition formula

```
animatedPosition = originalPosition
                  + displacement * sin(omega * t) * displayScale
```

The displacement is the per-node (ux, uy, uz) vector from either:

* the active Eigen mode shape inside `result.eigenResult.modes`, or
* the demo pseudo-mode shape (see below).

The animation phase `omega * t` uses the same wall clock for every
node so the model stays rigid.

### Pseudo-mode shape

When no Eigen result is available (the default state at app launch) we
synthesize a unit-amplitude pseudo-mode:

* Soft piers (B3/B4) and the deck above them (G3/G4) sway with
  amplitude 1.0 in the selected direction.
* Rock piers (B1/B2) and their deck (G1/G2) sway with amplitude 0.2
  in the selected direction.
* The abutment deck (G0/G5) inherits the rock amplitude.
* A small vertical (Y) component (~0.05) is added so the deck does
  not look completely frozen when the dominant axis is horizontal.

Because the SPACER axis-swap toggle and the animation displacement
both run as display-only transforms, they can be combined freely
without touching the underlying project data.

## 4. Suspended deck (future split-girder variant)

The split-girder variant is modelled as a "suspended deck" where the two
continuous girders are not connected at the pier:

* Use distinct node IDs on the two sides of the deck, e.g. `G3L` and
  `G3R` at x = 90 m, with z = -0.5 m and z = +0.5 m respectively.
* The pier top is also duplicated: `G3P_L` and `G3P_R`. The pier
  column itself (`P3` = B3) is shared with the rock/soft ground node.
* Bearings: each deck end is supported by a short member or a spring
  support from `G3P_L` / `G3P_R`. Because the MVP Support schema
  cannot express a spring, the bearing is initially modelled as a
  stiff vertical member and the rotation releases are expressed via
  free Rx/Rz flags.
* The two decks meet at the central node of the pier cap but do not
  share a node, so they can vibrate independently (or nearly so).

The dedicated `CompareView` component lays out two
`<ThreeViewport />` instances side-by-side. The parent (App.tsx) feeds
both viewports the same animation clock and options so they stay in
sync. A future PR can add a project variant builder that emits a
a "continuous viaduct variant" and a "split-girder variant" `ProjectModel` from the same wizard
inputs.

## 5. File layout

| file | role |
| ---- | ---- |
| `frontend/src/data/defaultProject.ts` | builds the 5-spans bridge default model |
| `frontend/src/viewer/animation.ts` | display-only animation helpers (phase, demo mode shape) |
| `frontend/src/viewer/animation.test.ts` | unit tests for the animation helpers |
| `frontend/src/viewer/SceneBuilder.ts` | `withNodeDisplacement()` and `rebuildModelScene()` |
| `frontend/src/viewer/ThreeViewport.tsx` | drives the animation clock and feeds the displacement map |
| `frontend/src/viewer/ViewerControls.tsx` | exposes the animation UI |
| `frontend/src/viewer/CompareView.tsx` | future side-by-side shell for A/B comparison |

## 6. Backward compatibility

* The `Support` schema is unchanged (boolean 6-DOF).
* The `ProjectModel` schema is unchanged.
* The animation toggle is OFF by default; users who do not interact
  with the new UI see the exact same default view they used to see
  after the previous SPACER coordinate system display change.
