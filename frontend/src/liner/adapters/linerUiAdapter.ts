import type { BuildIntermediateInput } from "../core/pipeline/pipeline";
import type {
  AlignmentElement,
  CircularArcElement,
  ClothoidElement,
  LinearAlignment,
  StationDefinition,
  StationEquation,
  StraightElement,
} from "../core/types";

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
  const nextElement: StraightElement = {
    id: nextAlignmentElementId("S", draft.alignment.elements),
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

export function addLinerArcElement(draft: BuildIntermediateInput): BuildIntermediateInput {
  const nextElement: CircularArcElement = {
    id: nextAlignmentElementId("A", draft.alignment.elements),
    type: "arc",
    start: { x: 0, y: 0 },
    azimuth: 0,
    radius: 100,
    turn: "left",
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
  const nextElement: ClothoidElement = {
    id: nextAlignmentElementId("C", draft.alignment.elements),
    type: "clothoid",
    start: { x: 0, y: 0 },
    azimuth: 0,
    clothoidParameter: 100,
    startRadius: null,
    endRadius: 100,
    turn: "left",
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
