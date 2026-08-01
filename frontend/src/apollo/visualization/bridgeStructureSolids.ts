import type { BridgeSuperstructureDesignDocument } from "../../contracts";
import type { ProjectModel } from "../../types";
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
};

const LONGITUDINAL_X: Axis3 = [1, 0, 0];
const TRANSVERSE_Y: Axis3 = [0, 1, 0];
const VERTICAL_Z: Axis3 = [0, 0, 1];

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

function buildGirderSolid(
  entityId: string,
  label: string,
  offsetM: number,
  input: ResolvedBridgeStructureInput,
  useBoxFallback: boolean,
): ApolloSolidGeometryParameter {
  const midpointX = input.bridgeLength / 2;
  return {
    id: `solid:bsdd:girder:${entityId}`,
    sourceEntityKind: "member",
    sourceEntityId: entityId,
    selectionKey: buildDesignEntitySelectionKey("MainGirder", entityId),
    validationTargetKey: buildDesignEntitySelectionKey("MainGirder", entityId),
    displayLabel: label,
    kind: "girder",
    visibilityGroup: "girders",
    exportable: true,
    designEntityId: entityId,
    designEntityKind: "MainGirder",
    dimensionsM: {
      length: input.bridgeLength,
      offset: offsetM,
      depth: Math.max(input.girderDepth, 0.1),
      flangeWidth: Math.max(input.topFlangeWidth, 0.1),
      flangeThickness: Math.max(input.topFlangeThickness, 0.02),
      webThickness: Math.max(input.webThickness, 0.02),
      shape: useBoxFallback ? 0 : 1,
    },
    localFrame: longitudinalFrame([midpointX, offsetM, -Math.max(input.girderDepth, 0.1) / 2]),
  };
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
    displayLabel: `Cross beam ${index + 1}`,
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

  const model = document.structuralDesignModel;
  const offsets = girderOffsetsFromDocument(document, input);
  const useBoxFallback = girderUsesBoxFallback(input);
  const solids: ApolloSolidGeometryParameter[] = [];

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
    solids.push(buildGirderSolid(girder.mainGirderId, label, offsetM, input, useBoxFallback));
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
      solids.push(
        buildCrossBeamSolid(crossBeam.crossBeamId, stationM, crossBeamLength, input, index),
      );
    }
  }

  assumptions.push({
    code: "bsdd-bridge-structure-solids",
    message: `BSDD-driven solids: ${model.mainGirders.length} girders, ${model.rcDecks.length} deck(s), ${model.crossBeams.length} cross-beam(s); girder spacing ${input.girderSpacing}m, deck thickness ${input.deckThickness}m, cross-beam spacing ${input.crossBeamSpacing}m.`,
  });

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