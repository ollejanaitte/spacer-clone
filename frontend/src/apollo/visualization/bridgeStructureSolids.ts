import type { BraceMember, BridgeSuperstructureDesignDocument } from "../../contracts";
import type { ProjectModel } from "../../types";
import {
  BridgeSystem,
  resolveEffectiveLayout,
  type BridgeLayoutSpan,
} from "../contracts";
import {
  getBridgeStructureInputDraft,
  isBridgeStructureGenerationCurrent,
  validateBridgeStructureInputDraft,
} from "../bridgeStructure";
import {
  buildDesignEntitySelectionKey,
  collectDesignEntityBindingWarnings,
} from "./designEntityBinding";
import type { ApolloDesignEntityKind } from "./types";
import type {
  ApolloSolidGeometryParameter,
  ApolloVisualizationAssumption,
  ApolloVisualizationWarning,
} from "./types";

type Axis3 = readonly [number, number, number];

type LocalFrame = {
  readonly origin: readonly [number, number, number];
  readonly xAxis: Axis3;
  readonly yAxis: Axis3;
  readonly zAxis: Axis3;
};

type ResolvedBridgeStructureInput = {
  readonly bridgeLength: number;
  readonly width: number;
  readonly girderCount: number;
  readonly girderSpacing: number;
  readonly girderDepth: number;
  readonly topFlangeWidth: number;
  readonly topFlangeThickness: number;
  readonly bottomFlangeWidth: number;
  readonly bottomFlangeThickness: number;
  readonly webThickness: number;
  readonly deckThickness: number;
  readonly crossBeamSpacing: number;
  readonly stiffenerSpacing: number | null;
  readonly swayBracingInterval: number | null;
  readonly lateralBracingEnabled: boolean;
};

const LONGITUDINAL_X: Axis3 = [1, 0, 0];
const TRANSVERSE_Y: Axis3 = [0, 1, 0];
const VERTICAL_Z: Axis3 = [0, 0, 1];

/** Documented pure-geometry assumptions for secondary-member visualization. */
const STIFFENER_PLATE_DEPTH_M = 0.15;
const BRACING_MEMBER_DIAMETER_M = 0.08;
const LATERAL_BRACING_Z_CLEARANCE_M = 0.03;

/** Decorative substructure placeholders (non-design, visualization only). */
const BEARING_WIDTH_M = 0.6;
const BEARING_LENGTH_M = 0.6;
const BEARING_HEIGHT_M = 0.12;
const ABUTMENT_MARKER_WIDTH_M = 1.5;
const ABUTMENT_MARKER_LENGTH_M = 1.5;
const ABUTMENT_MARKER_HEIGHT_M = 2.0;
const PIER_MARKER_WIDTH_M = 1.2;
const PIER_MARKER_LENGTH_M = 1.2;
const PIER_MARKER_HEIGHT_M = 3.0;
const SUPPORT_STATION_TOLERANCE_M = 1e-6;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 1e-9;
}

function resolveInput(project: ProjectModel): ResolvedBridgeStructureInput | null {
  const draft = getBridgeStructureInputDraft(project);
  const validation = validateBridgeStructureInputDraft(draft);
  if (!validation.complete) {
    return null;
  }
  return {
    bridgeLength: draft.bridgeLength!,
    width: draft.width!,
    girderCount: draft.girderCount!,
    girderSpacing: draft.girderSpacing!,
    girderDepth: draft.girderDepth!,
    topFlangeWidth: draft.topFlangeWidth!,
    topFlangeThickness: draft.topFlangeThickness!,
    bottomFlangeWidth: draft.bottomFlangeWidth!,
    bottomFlangeThickness: draft.bottomFlangeThickness!,
    webThickness: draft.webThickness!,
    deckThickness: draft.deckThickness!,
    crossBeamSpacing: draft.crossBeamSpacing!,
    stiffenerSpacing: draft.stiffenerSpacing,
    swayBracingInterval: draft.swayBracingInterval,
    lateralBracingEnabled: draft.lateralBracingEnabled,
  };
}

function longitudinalFrame(origin: readonly [number, number, number]): LocalFrame {
  return {
    origin,
    xAxis: LONGITUDINAL_X,
    yAxis: TRANSVERSE_Y,
    zAxis: VERTICAL_Z,
  };
}

function girderOffsetsFromDocument(
  document: BridgeSuperstructureDesignDocument,
  input: ResolvedBridgeStructureInput,
): number[] {
  const offsets = document.bridge.girderLines
    .map((line) => line.offsetFromCenterline.value)
    .filter((value): value is number => isFiniteNumber(value))
    .sort((left, right) => left - right);

  if (offsets.length === input.girderCount) {
    return offsets;
  }

  return Array.from({ length: input.girderCount }, (_, index) => {
    return (index - (input.girderCount - 1) / 2) * input.girderSpacing;
  });
}

function girderUsesBoxFallback(input: ResolvedBridgeStructureInput): boolean {
  return (
    !isPositiveFiniteNumber(input.girderDepth) ||
    !isPositiveFiniteNumber(input.topFlangeWidth) ||
    !isPositiveFiniteNumber(input.topFlangeThickness) ||
    !isPositiveFiniteNumber(input.webThickness) ||
    input.topFlangeThickness * 2 >= input.girderDepth ||
    input.webThickness >= input.topFlangeWidth
  );
}

function buildGirderSegmentSolid(
  entityId: string,
  label: string,
  offsetM: number,
  input: ResolvedBridgeStructureInput,
  useBoxFallback: boolean,
  segmentIndex: number,
  segmentStartX: number,
  segmentLength: number,
): ApolloSolidGeometryParameter {
  const midpointX = segmentStartX + segmentLength / 2;
  const segmentSuffix = segmentIndex >= 0 ? `:seg-${segmentIndex}` : "";
  return {
    id: `solid:bsdd:girder:${entityId}${segmentSuffix}`,
    sourceEntityKind: "member",
    sourceEntityId: entityId,
    selectionKey: buildDesignEntitySelectionKey("MainGirder", entityId),
    validationTargetKey: buildDesignEntitySelectionKey("MainGirder", entityId),
    displayLabel: segmentIndex >= 0 ? `${label} seg ${segmentIndex + 1}` : label,
    kind: "girder",
    visibilityGroup: "girders",
    exportable: true,
    designEntityId: entityId,
    designEntityKind: "MainGirder",
    dimensionsM: {
      length: segmentLength,
      offset: offsetM,
      depth: Math.max(input.girderDepth, 0.1),
      flangeWidth: Math.max(input.topFlangeWidth, 0.1),
      flangeThickness: Math.max(input.topFlangeThickness, 0.02),
      webThickness: Math.max(input.webThickness, 0.02),
      shape: useBoxFallback ? 0 : 1,
      segmentIndex: Math.max(segmentIndex, 0),
      segmentStart: segmentStartX,
    },
    localFrame: longitudinalFrame([midpointX, offsetM, -Math.max(input.girderDepth, 0.1) / 2]),
  };
}

function girderSpanSegments(spans: readonly BridgeLayoutSpan[]): Array<{ startX: number; length: number }> {
  const segments: Array<{ startX: number; length: number }> = [];
  let startX = 0;
  for (const span of spans) {
    segments.push({ startX, length: span.length });
    startX += span.length;
  }
  return segments;
}

function isAtSupportStation(stationM: number, supportStations: readonly number[]): boolean {
  return supportStations.some(
    (supportStation) => Math.abs(supportStation - stationM) <= SUPPORT_STATION_TOLERANCE_M,
  );
}

function supportFixityIsFixed(fixity: string): boolean {
  return fixity === "fixed";
}

function buildBsddBearingSolid(
  supportId: string,
  stationM: number,
  offsetM: number,
  fixed: boolean,
  girderIndex: number,
): ApolloSolidGeometryParameter {
  return {
    id: `solid:bsdd:bearing:${supportId}:${girderIndex}`,
    sourceEntityKind: "support",
    sourceEntityId: supportId,
    selectionKey: `support:${supportId}`,
    validationTargetKey: `support:${supportId}`,
    displayLabel: `Bearing ${girderIndex + 1}`,
    kind: "bearing",
    visibilityGroup: "bearings",
    exportable: true,
    dimensionsM: {
      width: BEARING_WIDTH_M,
      length: BEARING_LENGTH_M,
      height: BEARING_HEIGHT_M,
      offset: offsetM,
      fixed: fixed ? 1 : 0,
      station: stationM,
    },
    localFrame: {
      origin: [stationM, offsetM, -BEARING_HEIGHT_M / 2],
      xAxis: LONGITUDINAL_X,
      yAxis: TRANSVERSE_Y,
      zAxis: VERTICAL_Z,
    },
  };
}

function buildBsddSubstructureMarkerSolid(
  supportId: string,
  stationM: number,
  role: string,
  deckThickness: number,
): ApolloSolidGeometryParameter {
  const isAbutment = role === "abutment";
  const markerKind = isAbutment ? "abutment_marker" : "pier_marker";
  const widthM = isAbutment ? ABUTMENT_MARKER_WIDTH_M : PIER_MARKER_WIDTH_M;
  const lengthM = isAbutment ? ABUTMENT_MARKER_LENGTH_M : PIER_MARKER_LENGTH_M;
  const heightM = isAbutment ? ABUTMENT_MARKER_HEIGHT_M : PIER_MARKER_HEIGHT_M;
  return {
    id: `solid:bsdd:marker:${supportId}`,
    sourceEntityKind: "support",
    sourceEntityId: supportId,
    selectionKey: `support:${supportId}`,
    validationTargetKey: `support:${supportId}`,
    displayLabel: isAbutment ? "Abutment" : "Pier",
    kind: markerKind,
    visibilityGroup: "markers",
    exportable: false,
    dimensionsM: {
      width: widthM,
      length: lengthM,
      height: heightM,
      station: stationM,
    },
    localFrame: {
      origin: [
        stationM,
        0,
        -heightM / 2 - BEARING_HEIGHT_M - deckThickness,
      ],
      xAxis: LONGITUDINAL_X,
      yAxis: TRANSVERSE_Y,
      zAxis: VERTICAL_Z,
    },
  };
}

function buildBsddSubstructureSolids(
  document: BridgeSuperstructureDesignDocument,
  offsets: readonly number[],
  deckThickness: number,
): ApolloSolidGeometryParameter[] {
  const solids: ApolloSolidGeometryParameter[] = [];
  for (const support of document.bridge.supports) {
    const stationM = support.station.value ?? 0;
    const fixed = supportFixityIsFixed(support.fixity);
    for (const [girderIndex, offsetM] of offsets.entries()) {
      solids.push(
        buildBsddBearingSolid(support.supportId, stationM, offsetM, fixed, girderIndex),
      );
    }
    solids.push(buildBsddSubstructureMarkerSolid(support.supportId, stationM, support.role, deckThickness));
  }
  return solids;
}

function buildDeckSolid(
  entityId: string,
  input: ResolvedBridgeStructureInput,
): ApolloSolidGeometryParameter {
  const midpointX = input.bridgeLength / 2;
  return {
    id: `solid:bsdd:deck:${entityId}`,
    sourceEntityKind: "member",
    sourceEntityId: entityId,
    selectionKey: buildDesignEntitySelectionKey("RcDeck", entityId),
    validationTargetKey: buildDesignEntitySelectionKey("RcDeck", entityId),
    displayLabel: "RC deck",
    kind: "deck",
    visibilityGroup: "deck",
    exportable: true,
    designEntityId: entityId,
    designEntityKind: "RcDeck",
    dimensionsM: {
      length: input.bridgeLength,
      width: input.width,
      thickness: input.deckThickness,
      overhang: 0,
    },
    localFrame: longitudinalFrame([midpointX, 0, input.deckThickness / 2]),
  };
}

function buildCrossBeamSolid(
  entityId: string,
  stationM: number,
  beamLengthM: number,
  input: ResolvedBridgeStructureInput,
  index: number,
  atSupport: boolean,
): ApolloSolidGeometryParameter {
  const crossBeamDepth = Math.max(input.girderDepth * 0.35, 0.1);
  const crossBeamWidth = Math.max(input.webThickness, 0.02);
  const station: readonly [number, number, number] = [stationM, 0, 0];
  const origin: readonly [number, number, number] = [
    stationM,
    0,
    -Math.max(input.girderDepth, 0.1) / 2 + crossBeamDepth / 2,
  ];

  return {
    id: `solid:bsdd:cross-beam:${entityId}`,
    sourceEntityKind: "member",
    sourceEntityId: entityId,
    selectionKey: buildDesignEntitySelectionKey("CrossBeam", entityId),
    validationTargetKey: buildDesignEntitySelectionKey("CrossBeam", entityId),
    displayLabel: atSupport ? `Cross beam ${index + 1} (support)` : `Cross beam ${index + 1}`,
    kind: "cross_beam",
    visibilityGroup: "cross-beams",
    exportable: true,
    designEntityId: entityId,
    designEntityKind: "CrossBeam",
    dimensionsM: {
      length: beamLengthM,
      width: crossBeamWidth,
      depth: crossBeamDepth,
      station: stationM,
      atSupport: atSupport ? 1 : 0,
    },
    localFrame: {
      origin,
      xAxis: TRANSVERSE_Y,
      yAxis: VERTICAL_Z,
      zAxis: LONGITUDINAL_X,
    },
    path: [station],
  };
}

function cross(left: Axis3, right: Axis3): Axis3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function frameFromStartEnd(
  start: readonly number[],
  end: readonly number[],
): { frame: ApolloSolidGeometryParameter["localFrame"]; length: number } | null {
  const delta = [end[0] - start[0], end[1] - start[1], end[2] - start[2]] as const;
  const length = Math.hypot(delta[0], delta[1], delta[2]);
  if (!Number.isFinite(length) || length <= 1e-9) return null;
  const xAxis: Axis3 = [delta[0] / length, delta[1] / length, delta[2] / length];
  let yAxis = cross(xAxis, VERTICAL_Z);
  if (Math.hypot(yAxis[0], yAxis[1], yAxis[2]) <= 1e-9) {
    yAxis = [1, 0, 0];
  }
  const zAxis = cross(xAxis, yAxis);
  return {
    length,
    frame: {
      origin: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2],
      xAxis,
      yAxis,
      zAxis,
    },
  };
}

function buildStiffenerSolid(
  entityId: string,
  stationM: number,
  offsetM: number,
  webHeight: number,
  input: ResolvedBridgeStructureInput,
): ApolloSolidGeometryParameter {
  return {
    id: `solid:bsdd:stiffener:${entityId}`,
    sourceEntityKind: "member",
    sourceEntityId: entityId,
    selectionKey: buildDesignEntitySelectionKey("Stiffener", entityId),
    validationTargetKey: buildDesignEntitySelectionKey("Stiffener", entityId),
    displayLabel: `Stiffener ${entityId.slice(0, 8)}`,
    kind: "stiffener",
    visibilityGroup: "girders",
    exportable: true,
    designEntityId: entityId,
    designEntityKind: "Stiffener",
    dimensionsM: {
      length: Math.max(input.webThickness, 0.02),
      width: STIFFENER_PLATE_DEPTH_M,
      height: Math.max(webHeight, 0.02),
      station: stationM,
    },
    localFrame: longitudinalFrame([stationM, offsetM, 0]),
  };
}

function buildBracingMember(
  entityId: string,
  start: readonly [number, number, number],
  end: readonly [number, number, number],
  label: string,
): ApolloSolidGeometryParameter | null {
  const oriented = frameFromStartEnd(start, end);
  if (!oriented) {
    return null;
  }
  return {
    id: `solid:bsdd:bracing:${entityId}`,
    sourceEntityKind: "member",
    sourceEntityId: entityId,
    selectionKey: buildDesignEntitySelectionKey("BraceMember", entityId),
    validationTargetKey: buildDesignEntitySelectionKey("BraceMember", entityId),
    displayLabel: label,
    kind: "bracing",
    visibilityGroup: "bracings",
    exportable: true,
    designEntityId: entityId,
    designEntityKind: "BraceMember",
    dimensionsM: {
      length: oriented.length,
      diameter: BRACING_MEMBER_DIAMETER_M,
    },
    localFrame: oriented.frame,
    path: [start, end],
  };
}

function webHeightOf(input: ResolvedBridgeStructureInput): number {
  return input.girderDepth - input.topFlangeThickness - input.bottomFlangeThickness;
}

function groupBraceMembersByParent(
  model: { readonly braceMembers: readonly BraceMember[] },
): Map<string, readonly BraceMember[]> {
  const byParent = new Map<string, BraceMember[]>();
  for (const member of model.braceMembers) {
    const parent = member.parentBracingRefId ?? "";
    const list = byParent.get(parent) ?? [];
    list.push(member);
    byParent.set(parent, list);
  }
  return byParent;
}

export function buildBridgeStructureSolidGeometryParameters(
  project: ProjectModel,
  warnings: ApolloVisualizationWarning[],
  assumptions: ApolloVisualizationAssumption[],
): ApolloSolidGeometryParameter[] {
  if (!isBridgeStructureGenerationCurrent(project)) {
    return [];
  }

  const document = project.apolloBsdd;
  const input = resolveInput(project);
  if (!document?.structuralDesignModel || !input) {
    return [];
  }

  const inputDraft = getBridgeStructureInputDraft(project);
  const layout = resolveEffectiveLayout({
    bridgeSystem: inputDraft.bridgeSystem,
    spanLength: inputDraft.spanLength,
    spans: inputDraft.spans,
    supports: inputDraft.supports,
  });
  const layoutSpans = layout?.spans ?? [{ id: "span-0", length: input.bridgeLength }];
  const supportStations =
    document.bridge.supports
      .map((support) => support.station.value)
      .filter((value): value is number => isFiniteNumber(value))
      .sort((left, right) => left - right) ??
    layout?.supports.map((support) => support.station) ??
    [];

  const model = document.structuralDesignModel;
  const offsets = girderOffsetsFromDocument(document, input);
  const useBoxFallback = girderUsesBoxFallback(input);
  const solids: ApolloSolidGeometryParameter[] = [];
  const crossBeamCount = Math.floor(input.bridgeLength / input.crossBeamSpacing) + 1;
  const webHeight = Math.max(webHeightOf(input), 0.02);
  const membersByParent = groupBraceMembersByParent(model);
  const girderSegments = girderSpanSegments(layoutSpans);
  const isContinuous = inputDraft.bridgeSystem === BridgeSystem.CONTINUOUS;

  if (useBoxFallback) {
    warnings.push({
      code: "invalid-solid-dimension",
      severity: "warning",
      message: "Girder section dimensions are invalid. Falling back to simple box girders for BSDD visualization.",
    });
  }

  for (const [index, girder] of model.mainGirders.entries()) {
    const girderLine = document.bridge.girderLines.find(
      (line) => line.girderLineId === girder.girderLineRefId,
    );
    const offsetM = offsets[index] ?? offsets[0] ?? 0;
    const label = girderLine?.label ?? `G${index + 1}`;
    if (isContinuous && girderSegments.length > 1) {
      for (const [segmentIndex, segment] of girderSegments.entries()) {
        solids.push(
          buildGirderSegmentSolid(
            girder.mainGirderId,
            label,
            offsetM,
            input,
            useBoxFallback,
            segmentIndex,
            segment.startX,
            segment.length,
          ),
        );
      }
    } else {
      solids.push(
        buildGirderSegmentSolid(
          girder.mainGirderId,
          label,
          offsetM,
          input,
          useBoxFallback,
          -1,
          0,
          input.bridgeLength,
        ),
      );
    }
  }

  for (const deck of model.rcDecks) {
    solids.push(buildDeckSolid(deck.rcDeckId, input));
  }

  const crossBeamLength =
    offsets.length >= 2 ? Math.max(...offsets) - Math.min(...offsets) : 0;

  if (model.crossBeams.length > 0 && crossBeamLength <= 1e-9) {
    warnings.push({
      code: "missing-bridge-geometry",
      severity: "warning",
      message: "Cross beams were omitted because fewer than two girder lines are available.",
    });
  } else {
    for (const [index, crossBeam] of model.crossBeams.entries()) {
      const stationM = Math.min(index * input.crossBeamSpacing, input.bridgeLength);
      const atSupport = isAtSupportStation(stationM, supportStations);
      solids.push(
        buildCrossBeamSolid(crossBeam.crossBeamId, stationM, crossBeamLength, input, index, atSupport),
      );
    }
  }

  solids.push(...buildBsddSubstructureSolids(document, offsets, input.deckThickness));

  if (input.stiffenerSpacing !== null) {
    const stiffenerSpacing = input.stiffenerSpacing;
    const stationsPerGirder = Math.floor(input.bridgeLength / stiffenerSpacing) + 1;
    model.stiffeners.forEach((stiffener, index) => {
      const girderIndex = Math.floor(index / stationsPerGirder);
      const station = index % stationsPerGirder;
      const offsetM = offsets[girderIndex] ?? offsets[0] ?? 0;
      solids.push(
        buildStiffenerSolid(
          stiffener.stiffenerId,
          station * stiffenerSpacing,
          offsetM,
          webHeight,
          input,
        ),
      );
    });
  }

  if (input.swayBracingInterval !== null) {
    const swayBracingInterval = input.swayBracingInterval;
    const swayStations: number[] = [];
    for (let index = 1; index <= crossBeamCount - 2; index += 1) {
      if (index % swayBracingInterval === 0) {
        swayStations.push(index);
      }
    }
    model.swayBracings.forEach((swayBracing, swayIndex) => {
      const station = swayStations[swayIndex];
      if (station === undefined) {
        return;
      }
      const x = station * input.crossBeamSpacing;
      const zTop = webHeight / 2;
      const zBottom = -webHeight / 2;
      const members = membersByParent.get(swayBracing.swayBracingId) ?? [];
      let memberIndex = 0;
      for (let pair = 0; pair < input.girderCount - 1; pair += 1) {
        const yA = offsets[pair] ?? 0;
        const yB = offsets[pair + 1] ?? offsets[pair] ?? 0;
        const diagonals: ReadonlyArray<readonly [readonly [number, number, number], readonly [number, number, number]]> = [
          [[x, yA, zTop], [x, yB, zBottom]],
          [[x, yA, zBottom], [x, yB, zTop]],
        ];
        for (const [start, end] of diagonals) {
          const member = members[memberIndex];
          memberIndex += 1;
          if (!member) {
            continue;
          }
          const solid = buildBracingMember(
            member.braceMemberId,
            start,
            end,
            `Sway ${swayIndex + 1}`,
          );
          if (solid) {
            solids.push(solid);
          }
        }
      }
    });
  }

  if (input.lateralBracingEnabled) {
    const lateralBracing = model.lateralBracings[0];
    if (lateralBracing) {
      const bays = crossBeamCount - 1;
      const members = membersByParent.get(lateralBracing.lateralBracingId) ?? [];
      const zLat = -input.girderDepth / 2 + LATERAL_BRACING_Z_CLEARANCE_M;
      let memberIndex = 0;
      for (let pair = 0; pair < input.girderCount - 1; pair += 1) {
        const yA = offsets[pair] ?? 0;
        const yB = offsets[pair + 1] ?? offsets[pair] ?? 0;
        for (let bay = 0; bay < bays; bay += 1) {
          const x1 = bay * input.crossBeamSpacing;
          const x2 = Math.min((bay + 1) * input.crossBeamSpacing, input.bridgeLength);
          const diagonals: ReadonlyArray<readonly [readonly [number, number, number], readonly [number, number, number]]> = [
            [[x1, yA, zLat], [x2, yB, zLat]],
            [[x1, yB, zLat], [x2, yA, zLat]],
          ];
          for (const [start, end] of diagonals) {
            const member = members[memberIndex];
            memberIndex += 1;
            if (!member) {
              continue;
            }
            const solid = buildBracingMember(
              member.braceMemberId,
              start,
              end,
              `Lateral ${pair + 1}-${bay + 1}`,
            );
            if (solid) {
              solids.push(solid);
            }
          }
        }
      }
    }
  }

  assumptions.push({
    code: "bsdd-bridge-structure-solids",
    message: `BSDD-driven solids: ${model.mainGirders.length} girders (${girderSegments.length} segment(s) each when continuous), ${model.rcDecks.length} deck(s), ${model.crossBeams.length} cross-beam(s), ${document.bridge.supports.length} support(s), ${model.stiffeners.length} stiffener(s), ${model.swayBracings.length} sway-bracing site(s), ${model.lateralBracings.length} lateral-bracing site(s); girder spacing ${input.girderSpacing}m, deck thickness ${input.deckThickness}m, cross-beam spacing ${input.crossBeamSpacing}m.`,
  });

  if (isContinuous) {
    assumptions.push({
      code: "bsdd-continuous-girder-segments",
      message:
        "Continuous girders are split into per-span segment solids at support stations with no physical gap; segment IDs differ but designEntityId remains the parent MainGirder.",
    });
  }

  assumptions.push({
    code: "bsdd-cross-beam-station-convention",
    message:
      "Cross-beam stations use longitudinal index * crossBeamSpacing; geometryRef span anchor is not used for transverse placement in Block C.",
  });

  warnings.push(...collectDesignEntityBindingWarnings(document, solids));

  return solids.sort((left, right) => left.id.localeCompare(right.id));
}

export function hasBridgeStructureVisualizationSource(project: ProjectModel): boolean {
  return isBridgeStructureGenerationCurrent(project) && resolveInput(project) !== null;
}

export function designEntityKindForSolid(
  solid: ApolloSolidGeometryParameter,
): ApolloDesignEntityKind | null {
  return solid.designEntityKind ?? null;
}