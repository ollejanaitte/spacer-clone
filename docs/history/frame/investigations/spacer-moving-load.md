# SPACER Moving Load and Influence Line Study

## 1. Purpose

This document organizes the findings of the study used to add moving load and influence line features to the 3D frame analysis of this project, with reference to the JIP-SPACER ideas. The purpose is not to imitate SPACER''s UI or feature names, but to incorporate the design idea of separating fixed-load analysis from influence-line-based analysis.

This study is based on publicly available information. It does not aim to fully reproduce SPACER''s internal specification.

## 2. Reference Information

- The JIP Techno Science FAQ explains that a "grid shape" in SPACER is an ordered set of grid points used to place loads during influence line loading in INFLOAD.
- The JIP-SPACER product catalog lists support for linear analysis of arbitrary 3D frames, fixed loads, influence line loading, A/B live loads for road bridges, T load, crowd load, and train loads for railway bridges.
- The R7 Road Bridge Specification is the Reiwa 7 revision. Load values and coefficients are not hard-coded into the source of this software. They are managed as a `LiveLoadPreset` and as source metadata.

Reference URLs:

- https://www.jip-ts.co.jp/support/jip_spacer/faq/000773.html
- https://www.jip-ts.co.jp/docs/jipspacercat_201910.pdf
- https://e-book.road.or.jp/blogs/news/%E9%9B%BB%E5%AD%90%E7%89%88-%E9%81%93%E8%B7%AF%E6%A9%8B%E7%A4%BA%E6%96%B9%E6%9B%B8-%E5%90%8C%E8%A7%A3%E8%AA%AC-%E4%BB%A4%E5%92%8C%EF%BC%97%E5%B9%B4%E6%94%B9%E8%A8%82%E7%89%88-%E3%82%92%EF%BC%91%EF%BC%91%E6%9C%88%EF%BC%95%E6%97%A5%E3%81%AB%E7%99%BA%E5%88%8A%E3%81%97%E3%81%BE%E3%81%99

## 3. STATICS

SPACER''s STATICS is interpreted as the area that performs static analysis by applying fixed-position loads to a structural model. The existing analysis function of this project corresponds to this area.

Aspects to take in:

- Treat frame nodes, members, supports, sections, materials, and fixed loads as the structural analysis model.
- Include the input loads as node loads or member loads at known positions in the global load vector.
- Treat displacements, reactions, and member end forces as the existing linear analysis result.

Aspects to leave out:

- Duplicating SPACER''s screen layout, menu names, and report format.
- Mixing fixed loads and live loads in the same input table.

## 4. INFLOAD

SPACER''s INFLOAD is interpreted as the area that handles grid shapes for influence line loading, loading lines, carriageways, sidewalks, tracks, live loads, and train loads. In this project this area is separated as `LoadingSurfaceModel`.

Aspects to take in:

- Build the influence line first, then convolve the moving load with it.
- Loading points do not have to coincide with structural members. Loading points are geometric points at which loads are placed.
- Separate the unit load used for influence line generation from the actual live load model.

Aspects to leave out:

- Copying the INFLOAD input screen unit directly into the UI tree.
- Handling road, railway, and pedestrian bridges at the same time in the initial MVP.

## 5. Grid Shape

A SPACER grid shape is a sequence of grid points on which loads are placed, and is independent of the existence of members. This point is also important in this project.

How this software handles it:

- `LoadingGrid` is a load-only grid that is independent of the `StructuralModel` nodes and members.
- Grid points may coincide with structural nodes, but it is not required.
- When passing loads to the structural model, grid points are converted to equivalent nodal loads on structural nodes or on members.
- Influence line accuracy depends on the grid point density and the load distribution rule.

In the MVP, instead of the full grid surface, only the station sequence on a single `LoadingLine` is handled.

## 6. Line

`LoadingLine` is the 1D path along which a moving load travels. It can represent a lane centerline along the bridge axis, a sidewalk centerline, a track centerline, and so on.

MVP:

- Only a single line.
- Stations are managed by the distance from the line start, or by the normalized position.
- Load direction is the global vertical direction only.
- A single concentrated load is moved to each station.

Future:

- Polyline.
- Multiple lines.
- Transverse eccentricity.
- Automatic loading interval generation.
- Line and grid interpolation.

## 7. Carriageway

`Carriageway` holds the road bridge carriageway range, lanes, loadable area, and the live load type to apply.

In this software, the carriageway belongs to the load model, not to the structural model. Number of lanes, lane width, end margin, and simultaneous loading rules are managed on the `LoadingSurfaceModel` side.

It is not implemented in the MVP. Only the design is kept for future `LoadingLine` groups.

## 8. Sidewalk

`Sidewalk` represents the sidewalk range and the area where surface loads such as crowd load are applied.

In this software, the sidewalk is the future source of area and line loads. It is out of scope in the MVP, and only a definition slot for crowd load is reserved in `LiveLoadPreset`.

## 9. Track

`Track` represents the track centerline, gauge, and train-load loading rule for railway bridges.

In this software, it is treated as a preset category separate from the road-bridge live loads. It is out of scope in the MVP. The concrete values of the train load and the vehicle consist are not defined.

## 10. Live Load

Live load is split into `LiveLoadModel` and `LiveLoadPreset`.

- `LiveLoadPreset`: a load definition with source information, such as a specification or an in-house standard. It holds values, units, applicability conditions, and version.
- `LiveLoadModel`: a concrete instance of the live load used in an analysis case. It holds the preset reference, multiplier, direction, target line, and loading range.

R7 Road Bridge Specification load values must not be hard-coded. They must be loaded from a preset JSON or from user-managed data.

## 11. Dead Load

Dead load in principle belongs to the existing fixed-load analysis. When combining dead load and live load in a moving load analysis, the dead load is solved as a fixed load case on the `StructuralModel` side.

Design policy:

- `DeadLoadCase` stays in the existing load case list.
- `MovingLoadCase` handles the movement and the envelope of the live load.
- Combination is handled by the future `LoadCombination`.

## 12. Train Load

Train load involves multiple axles, axle spacing, vehicle consist, and simultaneous loading on the influence line. It pairs well with influence lines, but its complexity differs from the road-bridge MVP.

In this project, it is a future extension. It is not handled in the initial MVP.

## 13. Ideas to Adopt in This Software

- Internally separate STATICS-equivalent fixed-load analysis from INFLOAD-equivalent influence line and moving load analysis.
- Keep `StructuralModel != LoadingSurfaceModel`.
- Keep load-only grids and lines as geometry independent of structural members.
- Separate influence line generation from moving load analysis into stages.
- Manage load values through presets, and keep the source information and version.
- In the MVP, restrict to a single line, a vertical unit load, a single concentrated load, and envelope results.

## 14. Ideas Not to Adopt in This Software

- Direct copy of SPACER''s UI, reports, or file format.
- T load, L load, crowd load, A-live, B-live, train load, impact factor, and multiple lanes in the initial MVP.
- A design that forces the structural model node sequence to be the load grid.
- A design that embeds load values into the engine or the UI source.
- A design that forces influence lines and fixed loads into the same analysis case type.
