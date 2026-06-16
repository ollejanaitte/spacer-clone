# response-spectrum-analysis.md

## 1. Position of Response Spectrum Analysis

Response spectrum analysis is a modal analysis method that uses the eigenvalue analysis result to estimate the maximum seismic response of a structure.

In this software it is implemented as a higher-level analysis on top of the eigenvalue analysis (E-1).

The MVP uses a user-supplied response spectrum.

Automatic generation of standard spectra such as the Road Bridge Specification or the Railway Structures Design Standard is out of scope.

---

## 2. Connection to Eigenvalue Analysis

The response spectrum analysis uses the following eigenvalue analysis results:

- Natural period
- Natural frequency
- Mode shape
- participationFactors
- effectiveMasses
- effectiveMassRatios
- cumulativeEffectiveMassRatios

Response spectrum analysis is not run on its own. At runtime it either invokes the eigenvalue analysis internally or uses an existing eigenvalue analysis result.

---

## 3. Input Spectrum

In the MVP only the pseudo-acceleration response spectrum (Sa) is supported.

The spectrum point list is supplied in one of the following ways, not as a top-level `spectrumCases` array:

1. `spectrumPoints` in the API request.
2. `project.analysisSettings.responseSpectrum.spectrumPoints`.

`spectrumCaseId` is a string used to identify the result. In the MVP it is not persisted as an independent entity.

### Units

```text
m/s^2
```

Future units:

```text
gal
g
```

### Input Format

Example of `analysisSettings.responseSpectrum`:

```json
{
  "modeCount": 10,
  "massCaseId": "mass-1",
  "spectrumCaseId": "spec-1",
  "direction": "X",
  "dampingRatio": 0.05,
  "targetCumulativeMassRatio": 0.9,
  "spectrumPoints": [
    { "period": 0.1, "value": 1.0 },
    { "period": 1.0, "value": 0.5 }
  ]
}
```

API request example:

```json
{
  "project": {},
  "massCaseId": "mass-1",
  "modeCount": 10,
  "spectrumCaseId": "spec-1",
  "direction": "X",
  "dampingRatio": 0.05,
  "targetCumulativeMassRatio": 0.9,
  "spectrumPoints": [
    { "period": 0.1, "value": 1.0 },
    { "period": 1.0, "value": 0.5 }
  ]
}
```

The request takes priority over `analysisSettings.responseSpectrum`.

### Interpolation

In the MVP, **linear interpolation** is used in the period direction. Outside the range, the **end value is held constant**.

```text
Tmin <= T <= Tmax: linear interpolation
T < Tmin -> Sa(Tmin)
T > Tmax -> Sa(Tmax)
```

No extrapolation is performed.

---

## 4. Damping Ratio

In the MVP, damping is the same for all modes.

Standard value:

```text
h = 0.05
```

Future extensions:

- Per-mode damping
- Per-member damping
- Rayleigh damping
- Structure-type templates

---

## 5. Excitation Direction

The excitation direction is defined in the global coordinate system.

In the MVP:

```text
X
Y
Z
```

Arbitrary direction vectors are out of scope.

The modal participation factor is evaluated for each direction using the `participationFactors`.

---

## 6. Effective Mode Selection

Modes are selected using `cumulativeEffectiveMassRatios`.

Steps:

1. Run the eigenvalue analysis internally and obtain modes up to the requested `modeCount`.
2. For each excitation direction, walk through the modes and consult `cumulativeEffectiveMassRatios`.
3. Stop as soon as the cumulative value reaches `targetCumulativeMassRatio` (MVP default 0.9).

The selected mode numbers are stored in `usedModes`. If the criterion is not met even with all the obtained modes, every obtained mode is used.

---

## 7. Modal Combination

In the MVP, SRSS is adopted.

```text
R = sqrt(sum of Ri^2)
```

The SRSS result is treated as an absolute-value envelope, not a signed value.

CQC is out of scope.

Future extensions:

- CQC
- DSC
- NRC Ten Percent Method

---

## 8. Output Specification

Endpoint:

```text
POST /api/analysis/response-spectrum
```

The response includes both `eigenResult` and `responseSpectrumResult` in the same result. The linear static result arrays are empty.

```json
{
  "analysisSummary": {
    "analysisType": "response_spectrum",
    "status": "success"
  },
  "displacements": [],
  "reactions": [],
  "memberEndForces": [],
  "eigenResult": {},
  "responseSpectrumResult": {
    "spectrumCaseId": "spec-1",
    "direction": "X",
    "dampingRatio": 0.05,
    "combinationMethod": "SRSS",
    "targetCumulativeMassRatio": 0.9,
    "usedModes": [1, 2, 3],
    "modalResults": [],
    "combinedResult": {
      "method": "SRSS",
      "displacements": [],
      "reactions": [],
      "memberSectionForces": []
    }
  },
  "warnings": [],
  "errors": []
}
```

### MVP Output

- Per-mode displacement response (`modalResults[].displacements`)
- SRSS combined displacement (`combinedResult.displacements`)
- Selected modes list (`usedModes`)
- `spectralAcceleration`, `participationFactor`, and `modalCoordinate` per mode

The eigen-derived `participationFactors`, `effectiveMassRatios`, and `cumulativeEffectiveMassRatios` are kept on the `eigenResult` side. They are not duplicated into `responseSpectrumResult`.

### Out of Scope for the MVP

- Reactions (`reactions` is an empty array)
- Member section forces (`memberSectionForces` is an empty array)
- Section force envelope

---

## 9. UI Policy

### Analysis Conditions

- Mass case
- Number of modes
- Spectrum selection
- Damping ratio
- Excitation direction

### Result Display

- Natural period list
- Effective mass ratio list
- Spectrum value list
- Per-mode displacement response
- SRSS combined displacement

Advanced visualization such as deformed shape or mode shape is out of scope for the MVP.

---

## 10. Result Schema Reference

The authoritative source for the response spectrum result is [result-schema.md](result-schema.md) and `responseSpectrumResult` in `schemas/result.schema.json`.

In the MVP, `combinationMethod` is fixed to `"SRSS"`. Even if `CQC` is listed in the schema, the MVP implementation and UI do not use it.

---

## 11. Future Extensions

### Modal Combination

- CQC
- DSC
- NRC

### Spectrum

- Velocity response spectrum
- Displacement response spectrum

### Seismic Input

- Arbitrary direction input
- Multi-direction simultaneous input

### Design Standards

- Road Bridge Specification
- Railway Structures Design Standard
- Soil classification correction
- Regional correction

### Result

- Reactions
- Member end forces
- Section forces
- PDF report
- 3D response display

---

## 12. MVP Decisions

The MVP (E-2) adopts the following:

- Sa spectrum
- m/s^2
- Linear interpolation, end value held outside the range
- X / Y / Z directions
- SRSS
- Cumulative effective mass ratio at least 90% (`targetCumulativeMassRatio = 0.9`)
- Response displacement output

### Out of Scope

- CQC
- Rotational inertia
- Arbitrary direction input
- Multi-direction simultaneous input
- Standard spectrum generation
- Reaction / section force response spectrum

## 13. Design Review Adopted Items

### Adopted

- Always call the internal eigenvalue analysis at runtime.
- Spectrum input is the `spectrumPoints` point list (API or `analysisSettings.responseSpectrum`).
- Mode truncation by cumulative effective mass ratio.
- SRSS displacement envelope.
- Keep `eigenResult` and `responseSpectrumResult` in the same response.

### Pending

- Top-level `spectrumCases` persistence.
- Multi-direction simultaneous input, CQC, standard spectrum auto-generation.

### Re-discussion Required

- Whether to make `massCaseId` mandatory in the response spectrum settings, or fall back to `analysisSettings.eigen.massCaseId`.
- The order in which reactions and section forces SRSS are added after E-2.
