# 15. Windows Viewer Controls / Fallback / Runtime Diagnostics

Status date: Friday, July 31, 2026

## Scope

This note covers the Windows-focused viewer-layer follow-up after the earlier Apollo axis / camera investigation.

In scope:

- Apollo camera operator feel
- Apollo preset labels
- fallback disclosure
- runtime diagnostics
- GPU mode normalization across Electron preload -> frontend viewer

Out of scope:

- Apollo authoritative design data
- `ApolloVisualizationModel` responsibility changes
- solid geometry generation redesign
- STL geometry / manifest redesign
- persistence schema changes

## Windows symptoms

- Apollo 3D mouse feel was reported as “reversed” on Windows
- operators saw generic `XY / YZ / XZ` labels that did not match bridge-domain expectation
- when solid rendering fell back, users could misread the screen as “solid data missing”

## Implemented viewer contract

### Mouse convention

- left drag: rotate
- right drag: pan
- middle drag: pan
- wheel: zoom

### Apollo labels

- `全体`
- `アイソメ`
- `平面`
- `正面`
- `側面`

### Initial isometric direction

- updated from `(1, -0.8, 0.6)` to `(1, 0.8, 0.6)`

## Fallback disclosure

Viewer now distinguishes:

- `WebGL 3D`
- `line-only compatibility`
- `2D fallback`

Fallback disclosure includes:

- current viewer mode
- fallback reason
- solid data count when available
- diagnostics toggle
- retry action

## Runtime diagnostics contract

Diagnostics expose:

- viewer mode
- fallback reason
- WebGL availability
- WebGL renderer / vendor / version / shading language
- unmasked renderer / vendor when available
- GPU mode
- app version
- Apollo line / solid subgroup counts
- current visibility
- camera position / target / up
- current preset

Unavailable fields are rendered as `Unavailable`.

## GPU mode boundary

Boundary contract:

- Electron main owns raw launch configuration
- preload exposes only a small readonly DTO
- frontend normalizes unknown values before rendering

Known values:

- `normal`
- `compat-gpu-blocklist`
- `compat-angle-gl`
- `legacy-desktop-gl`
- `browser`
- `Unavailable`

## Additional Electron defect found during follow-up

One extra Electron runtime defect was found and fixed:

- sandboxed preload imported `./gpuMode`
- sandboxed preload bundle cannot reliably resolve relative helper imports
- fix: inline GPU mode normalization helper in `desktop/electron/preload.ts`

## Verification snapshot

Confirmed on Friday, July 31, 2026:

- TypeScript fix for readonly count aggregation
- TypeScript fix for GPU mode normalization
- targeted viewer tests passed
- frontend typecheck / lint / build passed
- Electron compile / Electron tests passed
- browser smoke confirmed:
  - Apollo route
  - sample load
  - bridge-domain labels
  - diagnostics visibility
  - STL export download
  - no browser console errors during smoke

Electron limitation on the same date:

- Playwright attach to Electron remained unstable across splash/main window handoff
- full automated Electron interaction smoke should be treated as partial unless a manual interactive check is also completed

## Linux cross-check on Friday, July 31, 2026

- `start-ubuntu.sh` was updated so trap registration happens before backend launch, frontend PGID is tracked explicitly, and reused backends are not killed by blanket cleanup.
- fallback banner action `診断を開く` now opens the view panel path that contains `ViewerDiagnostics`, so diagnostics are reachable even in compatibility mode.
- `frontend/scripts/verifyApolloElectron.mjs` now runs as a fallback-aware smoke harness under `xvfb-run`, captures all window URLs, records diagnostics, and writes a deterministic summary artifact.

Measured Friday, July 31, 2026 Linux results:

- browser Apollo sample:
  - `Viewer mode = WebGL 3D`
  - `Fallback reason = None`
  - `Solid count = 80`
  - `Solid display assessment = Visible expected in current 3D mode`
- Linux Electron under `xvfb-run`:
  - `Viewer mode = 2D fallback`
  - `Fallback reason = WebGL renderer initialization failed`
  - `Solid count = 80`
  - `Solid display assessment = C. solid data count > 0, WebGL fallback`

Interpretation:

- the standard sample still produces solid data on Linux
- browser and Electron differ at the WebGL/runtime layer, not at the builder / prop-flow layer
- Linux Electron “solid missing” should be classified as fallback when the diagnostics above are present

## Remaining risk

- headless automation did not produce reliable camera-delta evidence for drag operations
- Electron startup/attach needs a more stable smoke harness if strict automated interaction evidence is required

## GitHub fields

- PR: pending at doc creation time
- merge commit: pending at doc creation time
