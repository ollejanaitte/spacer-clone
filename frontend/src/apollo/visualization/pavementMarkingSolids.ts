/** Step 5-3 P3 pavement + road-marking solids. */

import {
  derivePavementGeometry,
  deriveRoadMarkingGeometries,
  getBridgeStructureInputDraft,
} from "../bridgeStructure";
import { PRESENCE_STATUS } from "../bridgeStructure/presence";
import { buildDesignEntitySelectionKey } from "./designEntityBinding";
import type {
  ApolloSolidGeometryParameter,
  ApolloVisualizationAssumption,
  ApolloVisualizationWarning,
} from "./types";
import type { ProjectModel } from "../../types";

const LONGITUDINAL_X = [1, 0, 0] as const;
const TRANSVERSE_Y = [0, 1, 0] as const;
const VERTICAL_Z = [0, 0, 1] as const;

function frame(origin: readonly [number, number, number]): ApolloSolidGeometryParameter["localFrame"] {
  return { origin, xAxis: LONGITUDINAL_X, yAxis: TRANSVERSE_Y, zAxis: VERTICAL_Z };
}

export function buildPavementAndMarkingSolids(
  project: ProjectModel,
  warnings: ApolloVisualizationWarning[],
  assumptions: ApolloVisualizationAssumption[],
): readonly ApolloSolidGeometryParameter[] {
  const draft = getBridgeStructureInputDraft(project);
  const bridgeLength = draft.bridgeLength;
  const width = draft.width;
  const deckThickness = draft.deckThickness;
  if (bridgeLength === null || width === null || deckThickness === null) {
    return [];
  }

  const solids: ApolloSolidGeometryParameter[] = [];
  const pavement = derivePavementGeometry(
    draft.pavementConfiguration,
    bridgeLength,
    width,
    deckThickness,
  );
  const pavementThickness =
    draft.pavementConfiguration.presence === PRESENCE_STATUS.PROVIDED
      ? draft.pavementConfiguration.item?.thickness ?? 0
      : 0;

  if (pavement) {
    solids.push({
      id: `solid:pavement:${pavement.sourceEntityId}`,
      sourceEntityKind: "member",
      sourceEntityId: pavement.sourceEntityId,
      selectionKey: buildDesignEntitySelectionKey("RcDeck", pavement.sourceEntityId),
      validationTargetKey: buildDesignEntitySelectionKey("RcDeck", pavement.sourceEntityId),
      displayLabel: "Pavement",
      kind: "pavement",
      visibilityGroup: "pavement",
      exportable: true,
      designEntityId: pavement.sourceEntityId,
      designEntityKind: "RcDeck",
      dimensionsM: {
        length: pavement.lengthM,
        width: pavement.widthM,
        thickness: pavement.thicknessM,
        startStation: pavement.startStation,
        endStation: pavement.endStation,
      },
      localFrame: frame([pavement.centerStation, 0, pavement.centerZ]),
    });
    assumptions.push({
      code: "pavement-full-deck-width",
      message: "Pavement uses FULL_DECK_WIDTH transverse cover (DEC-S5-0003 draft).",
    });
  } else if (draft.pavementConfiguration.presence === PRESENCE_STATUS.PROVIDED) {
    warnings.push({
      code: "invalid-solid-dimension",
      severity: "warning",
      message: "Pavement presence is PROVIDED but geometry could not be derived.",
    });
  }

  for (const marking of deriveRoadMarkingGeometries(
    draft.roadMarkingsConfiguration,
    bridgeLength,
    width,
    deckThickness,
    pavementThickness,
  )) {
    solids.push({
      id: `solid:road-marking:${marking.sourceEntityId}`,
      sourceEntityKind: "member",
      sourceEntityId: marking.sourceEntityId,
      selectionKey: buildDesignEntitySelectionKey("RcDeck", marking.sourceEntityId),
      validationTargetKey: buildDesignEntitySelectionKey("RcDeck", marking.sourceEntityId),
      displayLabel: `Road marking ${marking.kind}`,
      kind: "road_marking",
      visibilityGroup: "road-markings",
      exportable: false,
      designEntityId: marking.sourceEntityId,
      designEntityKind: "RcDeck",
      dimensionsM: {
        length: marking.lengthM,
        width: marking.widthM,
        thickness: marking.thicknessM,
        transverseOffset: marking.transverseOffset,
      },
      localFrame: frame([marking.centerStation, marking.transverseOffset, marking.centerZ]),
    });
  }
  if (draft.roadMarkingsConfiguration.enabled) {
    assumptions.push({
      code: "road-markings-viz-only",
      message: "Road markings are visualization-only (DEC-S5-0004); excluded from structural STL by default.",
    });
  }
  return solids;
}
