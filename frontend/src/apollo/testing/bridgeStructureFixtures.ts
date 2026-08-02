import type { ProjectModel } from "../../types";
import {
  BridgeSystem,
  buildContinuousLayout,
  withBridgeStructureField,
  withBridgeStructureInputDraft,
} from "../bridgeStructure";

const DEFAULT_STRUCTURE_NUMBERS = {
  width: 12,
  girderCount: 4,
  girderSpacing: 3,
  girderDepth: 2.5,
  topFlangeWidth: 0.5,
  topFlangeThickness: 0.02,
  bottomFlangeWidth: 0.6,
  bottomFlangeThickness: 0.025,
  webThickness: 0.012,
  deckThickness: 0.25,
  crossBeamSpacing: 5,
} as const;

/** Single-span SIMPLE_SINGLE fixture (bridgeLength === spanLength). */
export function fillSimpleSingleBridgeStructureInput(project: ProjectModel): ProjectModel {
  let next = project;
  const values = {
    spanLength: 40,
    bridgeLength: 40,
    ...DEFAULT_STRUCTURE_NUMBERS,
  };
  for (const [key, value] of Object.entries(values)) {
    next = withBridgeStructureField(next, key as never, value);
  }
  return next;
}

/** Five-span CONTINUOUS fixture totalling 200 m (40 m each). */
export function fillContinuousBridgeStructureInput(project: ProjectModel): ProjectModel {
  const spanLengths = [40, 40, 40, 40, 40] as const;
  const layout = buildContinuousLayout(spanLengths);
  let next = fillSimpleSingleBridgeStructureInput(project);
  return withBridgeStructureInputDraft(next, (draft) => ({
    ...draft,
    bridgeSystem: BridgeSystem.CONTINUOUS,
    bridgeLength: 200,
    spanLength: null,
    spans: layout.spans,
    supports: layout.supports,
    generatedAt: null,
  }));
}
