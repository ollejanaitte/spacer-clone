import type { BuildIntermediateInput } from "../core/pipeline/pipeline";
import type { AlignmentElement, LinearAlignment, StationDefinition, StraightElement } from "../core/types";

export type LinerDraft = BuildIntermediateInput;
export type LinerDraftAlignmentElement = AlignmentElement;

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

export function createDefaultLinerDraft(): BuildIntermediateInput {
  return {
    alignment: {
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
    },
    stationDefinition: {
      originDisplayedStation: 0,
      interval: 10,
    },
    offsets: [0],
    sampleInterval: 10,
    z: 0,
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
  return {
    ...draft,
    ...patch,
  };
}

export function updateLinerStraightElement(
  draft: BuildIntermediateInput,
  targetElementId: string,
  patch: LinerStraightElementPatch,
): BuildIntermediateInput {
  return {
    ...draft,
    alignment: {
      ...draft.alignment,
      elements: draft.alignment.elements.map((element): AlignmentElement => {
        if (element.id !== targetElementId || element.type !== "straight") {
          return element;
        }

        return {
          ...element,
          id: patch.id ?? element.id,
          length: patch.length ?? element.length,
          start: {
            x: patch.startX ?? element.start.x,
            y: patch.startY ?? element.start.y,
          },
          azimuth: patch.azimuth ?? element.azimuth,
        };
      }),
    },
  };
}

export function addLinerStraightElement(draft: BuildIntermediateInput): BuildIntermediateInput {
  const nextElement: StraightElement = {
    id: nextStraightElementId(draft.alignment.elements),
    type: "straight",
    start: { x: 0, y: 0 },
    azimuth: 0,
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

export function summarizeLinerDraft(draft: BuildIntermediateInput): LinerDraftSummary {
  return {
    elementCount: draft.alignment.elements.length,
    offsetCount: draft.offsets?.length ?? 0,
    totalDeclaredLength: draft.alignment.elements.reduce((total, element) => total + element.length, 0),
  };
}

function nextStraightElementId(elements: readonly AlignmentElement[]): string {
  const ids = new Set(elements.map((element) => element.id));
  let index = elements.length + 1;
  let candidate = `S${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `S${index}`;
  }
  return candidate;
}
