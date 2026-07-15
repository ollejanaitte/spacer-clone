# Live Load Preset Design

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE FRAME REFERENCE
> This is subordinate feature/design evidence. Current implementation facts are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md), and target responsibilities and gaps by [`../../planning/stage6-10/stage6_target_architecture.md`](../../planning/stage6-10/stage6_target_architecture.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md). Partial or absent capabilities are not promoted to complete.
<!-- DOC-AUTHORITY:END -->

## 1. Purpose

This document defines how live load definitions based on the R7 Road Bridge Specification are managed as source-attributed `LiveLoadPreset`, without hard-coding them in the source code. The MVP does not use presets in the analysis, but the structure is defined so that T load, L load, crowd load, A-live, and B-live can be added safely in the future.

## 2. Principles

- Load values, coefficients, and applicability conditions are not hard-coded in Python, TypeScript, or JSON Schema.
- Load definitions are loaded as preset data.
- A preset always has a version, a source, units, and applicability conditions.
- Editions other than R7 can be held at the same time.
- The preset ID and version used are recorded in the analysis result.

## 3. Target Presets

### T Load

Treated as a concentrated-load live load model used for slabs and floor systems.

Design items:

- Axle or wheel point load sequence.
- Transverse placement.
- Loadable range.
- Applicable member type.
- Relationship with A-live and B-live.

Not implemented in the MVP.

### L Load

Treated as a distributed-load live load model used for main girders and similar.

Design items:

- Region of uniform load.
- Parameter reference that depends on span length or loaded length.
- Relationship with lane or loaded width.
- Relationship with A-live and B-live.

Not implemented in the MVP.

### Crowd Load

Treated as an area-load model for sidewalks and pedestrian regions.

Design items:

- Area load value.
- Applicable region.
- Bridge type or sidewalk conditions.
- Simultaneous loading rules.

Not implemented in the MVP.

### A-live

Treated as a live load category according to large-vehicle traffic conditions. It is not expressed as the load values themselves but as the applicability condition set for T load and L load.

### B-live

Like A-live, it is a live load category according to road type and traffic conditions. It is composed of T load, L load, the required multipliers, and the applicability rules through preset references.

## 4. Version Management

`LiveLoadPreset` has the following:

- `presetId`: a persistent ID.
- `edition`: e.g. `R7`. It is a searchable key, not just a display string.
- `revision`: the in-house revision number of the preset data.
- `effectiveDate`: the effective date.
- `status`: `draft`, `approved`, or `deprecated`.
- `supersedes`: the ID of the preset this one supersedes.
- `checksum`: a hash of the preset content for audit.

At analysis time, `presetId` and `revision` are stored on the result so that even when the preset is updated later, past results can be traced.

## 5. Source Management

The reference position of the Road Bridge Specification is always held in the following form:

```json
{
  "source": {
    "standard": "Road Bridge Specification and Commentary",
    "edition": "R7",
    "volume": "I Common Volume",
    "chapter": "",
    "section": "",
    "table": "",
    "figure": "",
    "note": ""
  }
}
```

`chapter`, `section`, `table`, and `figure` are filled in with the values confirmed against the original document when the preset is registered. Unconfirmed values must not be guessed.

## 6. JSON Structure

```json
{
  "presetId": "jra-r7-live-load-a",
  "name": "A-live load",
  "category": "roadBridgeLiveLoad",
  "edition": "R7",
  "revision": "1.0.0",
  "status": "draft",
  "source": {
    "standard": "Road Bridge Specification and Commentary",
    "edition": "R7",
    "volume": "",
    "chapter": "",
    "section": "",
    "table": "",
    "figure": "",
    "note": ""
  },
  "unitSystem": "kN-m",
  "parameters": [],
  "components": [
    {
      "id": "component-1",
      "type": "pointLoadTrain",
      "values": [
        {
          "name": "P",
          "value": null,
          "unit": "kN",
          "sourceRef": "source"
        }
      ],
      "layout": {}
    }
  ],
  "applicability": {
    "bridgeType": ["road"],
    "memberUse": [],
    "conditions": []
  }
}
```

`value: null` is the way to hold a definition slot first. In an approved preset, the required values must not be left unset.

## 7. Parameter Formulas

Loads that depend on span length, loaded length, lane width, and so on are kept as formula definitions inside the preset, not embedded in the source code.

Formula definition policy:

- The formula is interpreted by a safe formula evaluator.
- Usable variables are explicit in the preset.
- It has units.
- It has range conditions.
- It has a source reference.

```json
{
  "name": "P",
  "type": "piecewiseFormula",
  "unit": "kN/m",
  "variables": [
    { "name": "spanLength", "unit": "m" }
  ],
  "cases": [
    {
      "condition": "spanLength <= L1",
      "expression": "P1",
      "sourceRef": "source"
    }
  ]
}
```

`L1` and `P1` above are example names. The actual values are registered as preset data.

## 8. Future Extensions

- Switching between countries, agencies, and editions.
- User-defined presets.
- Preset diff display.
- Original-document confirmation flag.
- Approval workflow.
- Cross-checking against design examples.
- Snapshot saving of the preset into the analysis result.

## 9. Prohibitions

- Hard-coding the load values of the R7 Road Bridge Specification in Python or TypeScript.
- Determining the load logic from UI display strings.
- Saving only the preset ID without the revision number.
- Treating an unconfirmed numeric value as approved.
