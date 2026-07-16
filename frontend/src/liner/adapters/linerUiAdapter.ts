import type { BuildIntermediateInput } from "../core/pipeline/pipeline";
import { evaluateElementEndState } from "../core/geometry/horizontal";
import type {
  AlignmentElement,
  CircularArcElement,
  ClothoidElement,
  LinearAlignment,
  StationDefinition,
  StationEquation,
  StraightElement,
} from "../core/types";
import type {
  CrossSlopeIntervalDraft,
  CrossSectionOffsetLineDraft,
  CrossSectionTemplateDraft,
  CrossSlopeDraft,
  CrossfallMode,
  LinerDrawingSettingsDraft,
  VerticalAlignmentDraft,
  WidthChangePointDraft,
} from "../schema/types";

export type LinerDraft = BuildIntermediateInput;
export type LinerDraftAlignmentElement = AlignmentElement;
export type LinerDraftUpdate = LinerDraft | ((current: LinerDraft) => LinerDraft);

export type LinerDraftSummary = {
  elementCount: number;
  offsetCount: number;
  totalDeclaredLength: number;
};

export type LinerAlignmentMetadataPatch = Partial<Pick<LinearAlignment, "id" | "linerModelId" | "coordinatePolicyId">>;

export type LinerDraftSettingsPatch = Partial<Pick<BuildIntermediateInput, "offsets" | "sampleInterval" | "z">>;

export type LinerStraightElementPatch = Partial<{
  id: string;
  length: number;
  startX: number;
  startY: number;
  azimuth: number;
}>;

export type LinerArcElementPatch = LinerStraightElementPatch &
  Partial<{
    radius: number;
    turn: "left" | "right";
  }>;

export type LinerClothoidElementPatch = LinerStraightElementPatch &
  Partial<{
    clothoidParameter: number;
    startRadius: number | null;
    endRadius: number | null;
    turn: "left" | "right";
  }>;

export type LinerAlignmentElementPatch = LinerStraightElementPatch &
  Partial<{
    radius: number;
    turn: "left" | "right";
    clothoidParameter: number;
    startRadius: number | null;
    endRadius: number | null;
  }>;

export type LinerStationEquationPatch = Partial<
  Pick<StationEquation, "id" | "physicalDistance" | "type" | "value" | "sortIndex">
>;

export function createDefaultVerticalAlignment(
  totalLength: number,
  z = 0,
): VerticalAlignmentDraft {
  return {
    id: "VA-default",
    elements: [
      {
        type: "grade",
        id: "VG-default",
        startStation: 0,
        endStation: totalLength,
        startElevation: z,
        grade: 0,
        length: totalLength,
      },
    ],
  };
}

function offsetLinesFromOffsets(
  offsets: readonly number[],
  existingOffsetLines: readonly CrossSectionOffsetLineDraft[] = [],
): CrossSectionOffsetLineDraft[] {
  return offsets.map((offset, index) => {
    const existingLine = existingOffsetLines[index];
    return {
      id: existingLine?.id ?? `OL-${index}`,
      offset,
      elevation: existingLine?.elevation ?? 0,
      role: existingLine?.role ?? "custom",
      ...(existingLine?.label ? { label: existingLine.label } : {}),
    };
  });
}

export function createDefaultCrossSectionTemplate(
  offsets: readonly number[] = [0],
): CrossSectionTemplateDraft {
  return {
    id: "CS-default",
    name: "Default",
    offsetLines: offsetLinesFromOffsets(offsets),
  };
}

function totalDraftLength(draft: BuildIntermediateInput): number {
  return draft.alignment.elements.reduce((total, element) => total + element.length, 0);
}

function defaultCrossfallModeForSlope(valuePercent: number): CrossfallMode {
  if (valuePercent > 0) {
    return "one_way_right";
  }
  if (valuePercent < 0) {
    return "one_way_left";
  }
  return "flat";
}

export function createDefaultCrossSlopeInterval(
  draft: BuildIntermediateInput,
  patch: Partial<CrossSlopeIntervalDraft> = {},
): CrossSlopeIntervalDraft {
  const scalarSlope = draft.crossSections?.[0]?.crossSlope?.valuePercent ?? 0;
  const endPhysicalDistance = patch.endPhysicalDistance ?? totalDraftLength(draft);
  return {
    id: patch.id ?? `CF-${(draft.crossSlopeIntervals?.length ?? 0) + 1}`,
    startPhysicalDistance: patch.startPhysicalDistance ?? 0,
    endPhysicalDistance,
    mode: patch.mode ?? defaultCrossfallModeForSlope(scalarSlope),
    leftSlopePercent: patch.leftSlopePercent ?? scalarSlope,
    rightSlopePercent: patch.rightSlopePercent ?? scalarSlope,
    ...(patch.pivotDistance !== undefined ? { pivotDistance: patch.pivotDistance } : {}),
  };
}

export function createDefaultLinerDraft(): BuildIntermediateInput {
  const alignment: LinearAlignment = {
    id: "alignment-1",
    linerModelId: "liner-model-1",
    coordinatePolicyId: "global",
    elements: [
      {
        id: "S1",
        type: "straight",
        start: { x: 0, y: 0 },
        azimuth: 0,
        length: 100,
      },
    ],
  };
  const offsets = [0];
  const totalLength = alignment.elements.reduce((total, element) => total + element.length, 0);
  const draft: BuildIntermediateInput = {
    alignment,
    stationDefinition: {
      originDisplayedStation: 0,
      interval: 10,
    },
    verticalAlignment: createDefaultVerticalAlignment(totalLength, 0),
    crossSections: [createDefaultCrossSectionTemplate(offsets)],
    offsets,
    sampleInterval: 10,
    z: 0,
  };

  return {
    ...draft,
    crossSlopeIntervals: [createDefaultCrossSlopeInterval(draft)],
    selectedCrossSectionStation: 0,
  };
}

export function updateLinerAlignmentMetadata(
  draft: BuildIntermediateInput,
  patch: LinerAlignmentMetadataPatch,
): BuildIntermediateInput {
  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      ...patch,
    },
  };
}

export function updateLinerStationDefinition(
  draft: BuildIntermediateInput,
  patch: Partial<StationDefinition>,
): BuildIntermediateInput {
  return {
    ...draft,
    stationDefinition: {
      ...draft.stationDefinition,
      ...patch,
    },
  };
}

export function updateLinerDraftSettings(
  draft: BuildIntermediateInput,
  patch: LinerDraftSettingsPatch,
): BuildIntermediateInput {
  const nextDraft: BuildIntermediateInput = {
    ...draft,
    ...patch,
  };
  if (patch.offsets === undefined) {
    return nextDraft;
  }

  const currentTemplates = draft.crossSections?.length
    ? draft.crossSections
    : [createDefaultCrossSectionTemplate(draft.offsets ?? [0])];
  const firstTemplate = currentTemplates[0] ?? createDefaultCrossSectionTemplate(patch.offsets);
  return {
    ...nextDraft,
    crossSections: [
      {
        ...firstTemplate,
        offsetLines: offsetLinesFromOffsets(patch.offsets, firstTemplate.offsetLines),
      },
      ...currentTemplates.slice(1),
    ],
  };
}

export function updateLinerVerticalAlignment(
  draft: BuildIntermediateInput,
  verticalAlignment: VerticalAlignmentDraft,
): BuildIntermediateInput {
  const firstGrade = verticalAlignment.elements.find((element) => element.type === "grade");
  return {
    ...draft,
    verticalAlignment,
    z: firstGrade?.type === "grade" ? firstGrade.startElevation : draft.z,
  };
}

export function updateLinerCrossSectionTemplate(
  draft: BuildIntermediateInput,
  template: CrossSectionTemplateDraft,
  templateIndex = 0,
): BuildIntermediateInput {
  const currentTemplates = draft.crossSections?.length
    ? draft.crossSections
    : [createDefaultCrossSectionTemplate(draft.offsets ?? [0])];
  const nextTemplates = currentTemplates.map((currentTemplate, index) =>
    index === templateIndex ? template : currentTemplate,
  );
  if (templateIndex >= nextTemplates.length) {
    nextTemplates.push(template);
  }

  return {
    ...draft,
    crossSections: nextTemplates,
    offsets: nextTemplates[0]?.offsetLines.map((line) => line.offset) ?? draft.offsets,
  };
}

export function updateLinerCrossSlope(
  draft: BuildIntermediateInput,
  crossSlope: CrossSlopeDraft | undefined,
  templateIndex = 0,
): BuildIntermediateInput {
  const currentTemplates = draft.crossSections?.length
    ? draft.crossSections
    : [createDefaultCrossSectionTemplate(draft.offsets ?? [0])];
  const targetTemplate =
    currentTemplates[templateIndex] ?? createDefaultCrossSectionTemplate(draft.offsets ?? [0]);
  const nextTemplate: CrossSectionTemplateDraft = {
    ...targetTemplate,
    crossSlope,
  };
  if (crossSlope === undefined) {
    delete nextTemplate.crossSlope;
  }
  return updateLinerCrossSectionTemplate(draft, nextTemplate, templateIndex);
}

export function updateLinerCrossSlopeIntervals(
  draft: BuildIntermediateInput,
  crossSlopeIntervals: readonly CrossSlopeIntervalDraft[],
): BuildIntermediateInput {
  return {
    ...draft,
    ...(crossSlopeIntervals.length > 0
      ? { crossSlopeIntervals: [...crossSlopeIntervals] }
      : { crossSlopeIntervals: undefined }),
  };
}

export function createDefaultWidthChangePoint(
  draft: BuildIntermediateInput,
  patch: Partial<WidthChangePointDraft> = {},
): WidthChangePointDraft {
  return {
    id: patch.id ?? `WP-${(draft.widthChangePoints?.length ?? 0) + 1}`,
    physicalDistance: patch.physicalDistance ?? 0,
    leftOffset: patch.leftOffset ?? 0,
    rightOffset: patch.rightOffset ?? 0,
  };
}

export function updateLinerWidthChangePoints(
  draft: BuildIntermediateInput,
  widthChangePoints: readonly WidthChangePointDraft[],
): BuildIntermediateInput {
  return {
    ...draft,
    ...(widthChangePoints.length > 0
      ? { widthChangePoints: [...widthChangePoints] }
      : { widthChangePoints: undefined }),
  };
}

export function updateLinerSelectedCrossSectionStation(
  draft: BuildIntermediateInput,
  selectedCrossSectionStation: number | undefined,
): BuildIntermediateInput {
  return {
    ...draft,
    ...(Number.isFinite(selectedCrossSectionStation)
      ? { selectedCrossSectionStation }
      : { selectedCrossSectionStation: undefined }),
  };
}

export function updateLinerDrawingSettings(
  draft: BuildIntermediateInput,
  drawingSettings: LinerDrawingSettingsDraft | undefined,
): BuildIntermediateInput {
  return {
    ...draft,
    ...(drawingSettings ? { drawingSettings: structuredClone(drawingSettings) } : { drawingSettings: undefined }),
  };
}

export function updateLinerAlignmentElement(
  draft: BuildIntermediateInput,
  targetElementId: string,
  patch: LinerAlignmentElementPatch,
): BuildIntermediateInput {
  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: draft.alignment.elements.map((element): AlignmentElement => {
        if (element.id !== targetElementId) {
          return element;
        }

        const nextStart = {
          x: patch.startX ?? element.start.x,
          y: patch.startY ?? element.start.y,
        };
        const nextId = patch.id ?? element.id;
        const nextLength = patch.length ?? element.length;
        const nextAzimuth = patch.azimuth ?? element.azimuth;

        if (element.type === "straight") {
          return {
            ...element,
            id: nextId,
            length: nextLength,
            start: nextStart,
            azimuth: nextAzimuth,
          };
        }

        if (element.type === "arc") {
          return {
            ...element,
            id: nextId,
            length: nextLength,
            start: nextStart,
            azimuth: nextAzimuth,
            radius: patch.radius ?? element.radius,
            turn: patch.turn ?? element.turn,
          };
        }

        return {
          ...element,
          id: nextId,
          length: nextLength,
          start: nextStart,
          azimuth: nextAzimuth,
          clothoidParameter: patch.clothoidParameter ?? element.clothoidParameter,
          startRadius: patch.startRadius !== undefined ? patch.startRadius : element.startRadius,
          endRadius: patch.endRadius !== undefined ? patch.endRadius : element.endRadius,
          turn: patch.turn ?? element.turn,
        };
      }),
    },
  };
}

export function updateLinerAlignmentElementAtIndex(
  draft: BuildIntermediateInput,
  targetElementIndex: number,
  patch: LinerAlignmentElementPatch,
): BuildIntermediateInput {
  const target = draft.alignment.elements[targetElementIndex];
  if (!target) {
    return draft;
  }
  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: draft.alignment.elements.map((element, elementIndex) =>
        elementIndex === targetElementIndex
          ? updateLinerAlignmentElement(
              { ...draft, alignment: { ...draft.alignment, elements: [element] } },
              element.id,
              patch,
            ).alignment.elements[0] ?? element
          : element,
      ),
    },
  };
}

export function updateLinerStraightElement(
  draft: BuildIntermediateInput,
  targetElementId: string,
  patch: LinerStraightElementPatch,
): BuildIntermediateInput {
  return updateLinerAlignmentElement(draft, targetElementId, patch);
}

export function addLinerExplicitStation(draft: BuildIntermediateInput): BuildIntermediateInput {
  const explicitStations = draft.stationDefinition.explicitStations ?? [];

  return updateLinerStationDefinition(draft, {
    explicitStations: [...explicitStations, 0],
  });
}

export function updateLinerExplicitStation(
  draft: BuildIntermediateInput,
  index: number,
  physicalDistance: number,
): BuildIntermediateInput {
  const explicitStations = draft.stationDefinition.explicitStations ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= explicitStations.length) {
    return draft;
  }

  return updateLinerStationDefinition(draft, {
    explicitStations: explicitStations.map((station, stationIndex) =>
      stationIndex === index ? physicalDistance : station,
    ),
  });
}

export function removeLinerExplicitStation(draft: BuildIntermediateInput, index: number): BuildIntermediateInput {
  const explicitStations = draft.stationDefinition.explicitStations ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= explicitStations.length) {
    return draft;
  }

  return updateLinerStationDefinition(draft, {
    explicitStations: explicitStations.filter((_, stationIndex) => stationIndex !== index),
  });
}

export function addLinerStationEquation(draft: BuildIntermediateInput): BuildIntermediateInput {
  const equations = draft.stationDefinition.equations ?? [];
  const sortIndex = equations.length + 1;
  const nextEquation: StationEquation = {
    id: nextStationEquationId(equations),
    physicalDistance: 0,
    type: "add_constant",
    value: 0,
    sortIndex,
  };

  return updateLinerStationDefinition(draft, {
    equations: [...equations, nextEquation],
  });
}

export function updateLinerStationEquation(
  draft: BuildIntermediateInput,
  targetEquationId: string,
  patch: LinerStationEquationPatch,
): BuildIntermediateInput {
  const equations = draft.stationDefinition.equations ?? [];

  return updateLinerStationDefinition(draft, {
    equations: equations.map((equation) =>
      equation.id === targetEquationId
        ? {
            ...equation,
            ...patch,
          }
        : equation,
    ),
  });
}

export function removeLinerStationEquation(
  draft: BuildIntermediateInput,
  targetEquationId: string,
): BuildIntermediateInput {
  const equations = draft.stationDefinition.equations ?? [];

  return updateLinerStationDefinition(draft, {
    equations: equations.filter((equation) => equation.id !== targetEquationId),
  });
}

export function addLinerOffset(draft: BuildIntermediateInput): BuildIntermediateInput {
  const offsets = draft.offsets ?? [];
  return updateLinerDraftSettings(draft, { offsets: [...offsets, 0] });
}

export function updateLinerOffset(draft: BuildIntermediateInput, index: number, value: number): BuildIntermediateInput {
  const offsets = draft.offsets ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= offsets.length) {
    return draft;
  }

  return updateLinerDraftSettings(draft, {
    offsets: offsets.map((offset, offsetIndex) => (offsetIndex === index ? value : offset)),
  });
}

export function removeLinerOffset(draft: BuildIntermediateInput, index: number): BuildIntermediateInput {
  const offsets = draft.offsets ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= offsets.length || offsets.length <= 1) {
    return draft;
  }

  return updateLinerDraftSettings(draft, {
    offsets: offsets.filter((_, offsetIndex) => offsetIndex !== index),
  });
}

export function addLinerStraightElement(draft: BuildIntermediateInput): BuildIntermediateInput {
  const elements = draft.alignment.elements;
  const lastElement = elements[elements.length - 1];
  const endState = lastElement ? evaluateElementEndState(lastElement) : null;
  const nextElement: StraightElement = {
    id: nextAlignmentElementId("S", elements),
    type: "straight",
    start: endState?.point ?? { x: 0, y: 0 },
    azimuth: endState?.azimuth ?? 0,
    length: 50,
  };

  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: [...draft.alignment.elements, nextElement],
    },
  };
}

export function addLinerArcElement(draft: BuildIntermediateInput): BuildIntermediateInput {
  const elements = draft.alignment.elements;
  const lastElement = elements[elements.length - 1];
  const endState = lastElement ? evaluateElementEndState(lastElement) : null;
  const nextElement: CircularArcElement = {
    id: nextAlignmentElementId("A", elements),
    type: "arc",
    start: endState?.point ?? { x: 0, y: 0 },
    azimuth: endState?.azimuth ?? 0,
    radius: endState?.endRadius ?? 100,
    turn: endState?.turnDirection ?? "left",
    length: 50,
  };

  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: [...draft.alignment.elements, nextElement],
    },
  };
}

export function addLinerClothoidElement(draft: BuildIntermediateInput): BuildIntermediateInput {
  const elements = draft.alignment.elements;
  const lastElement = elements[elements.length - 1];
  const endState = lastElement ? evaluateElementEndState(lastElement) : null;
  const nextElement: ClothoidElement = {
    id: nextAlignmentElementId("C", elements),
    type: "clothoid",
    start: endState?.point ?? { x: 0, y: 0 },
    azimuth: endState?.azimuth ?? 0,
    clothoidParameter: 100,
    startRadius: endState?.endRadius ?? null,
    endRadius: 100,
    turn: endState?.turnDirection ?? "left",
    length: 50,
  };

  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: [...draft.alignment.elements, nextElement],
    },
  };
}

export function removeLinerAlignmentElement(
  draft: BuildIntermediateInput,
  targetElementId: string,
): BuildIntermediateInput {
  if (draft.alignment.elements.length <= 1) {
    return draft;
  }

  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: draft.alignment.elements.filter((element) => element.id !== targetElementId),
    },
  };
}

export function removeLinerAlignmentElementAtIndex(
  draft: BuildIntermediateInput,
  targetElementIndex: number,
): BuildIntermediateInput {
  if (draft.alignment.elements.length <= 1) {
    return draft;
  }
  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: draft.alignment.elements.filter((_, elementIndex) => elementIndex !== targetElementIndex),
    },
  };
}

export function summarizeLinerDraft(draft: BuildIntermediateInput): LinerDraftSummary {
  return {
    elementCount: draft.alignment.elements.length,
    offsetCount: draft.offsets?.length ?? 0,
    totalDeclaredLength: draft.alignment.elements.reduce((total, element) => total + element.length, 0),
  };
}

function nextAlignmentElementId(prefix: string, elements: readonly AlignmentElement[]): string {
  const ids = new Set(elements.map((element) => element.id));
  let index = elements.length + 1;
  let candidate = `${prefix}${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `${prefix}${index}`;
  }
  return candidate;
}

function nextStationEquationId(equations: readonly StationEquation[]): string {
  const ids = new Set(equations.map((equation) => equation.id));
  let index = equations.length + 1;
  let candidate = `EQ${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `EQ${index}`;
  }
  return candidate;
}
