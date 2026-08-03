import type { ProjectModel } from "../../types";
import {
  APPURTENANCE_SLOTS,
  BridgeSystem,
  PRESENCE_STATUS,
  applyHaunchExplicitNoneAll,
  buildContinuousLayout,
  getBridgeStructureInputDraft,
  withAppurtenanceConfiguration,
  withAppurtenanceSlotPresence,
  withBridgeStructureField,
  withBridgeStructureInputDraft,
  withHaunchConfiguration,
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

/** Explicit-none WF-03/WF-05 so downstream workflow prereqs can complete without inventing entities. */
export function applyAppurtenanceAndHaunchExplicitNone(project: ProjectModel): ProjectModel {
  const draft = getBridgeStructureInputDraft(project);
  let configuration = draft.appurtenanceConfiguration;
  for (const slot of APPURTENANCE_SLOTS) {
    configuration = withAppurtenanceSlotPresence(
      configuration,
      slot,
      PRESENCE_STATUS.EXPLICIT_NONE,
      project.project.id,
    );
  }
  let next = withAppurtenanceConfiguration(project, configuration);
  const girderCount = getBridgeStructureInputDraft(next).girderCount;
  if (girderCount !== null && girderCount >= 1) {
    next = withHaunchConfiguration(next, applyHaunchExplicitNoneAll(girderCount));
  }
  return next;
}

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
  return applyAppurtenanceAndHaunchExplicitNone(next);
}

/** Five-span CONTINUOUS fixture totalling 200 m (40 m each). */
export function fillContinuousBridgeStructureInput(project: ProjectModel): ProjectModel {
  const spanLengths = [40, 40, 40, 40, 40] as const;
  const layout = buildContinuousLayout(spanLengths);
  let next = fillSimpleSingleBridgeStructureInput(project);
  next = withBridgeStructureInputDraft(next, (draft) => ({
    ...draft,
    bridgeSystem: BridgeSystem.CONTINUOUS,
    bridgeLength: 200,
    spanLength: null,
    spans: layout.spans,
    supports: layout.supports,
    generatedAt: null,
  }));
  return applyAppurtenanceAndHaunchExplicitNone(next);
}
