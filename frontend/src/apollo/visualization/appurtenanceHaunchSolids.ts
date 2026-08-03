/**
 * Step 4-C2 solids for appurtenances and haunches.
 * Geometry from C1 kernel only — no mesh reverse engineering.
 */

import {
  APPURTENANCE_SLOT_LABELS,
  buildBridgeAppurtenanceModels,
  buildRcDeckHaunchModels,
  deriveAppurtenanceGeometries,
  deriveHaunchGeometries,
  getBridgeStructureInputDraft,
  type AppurtenanceGeometry,
  type HaunchGeometry,
} from "../bridgeStructure";
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

function longitudinalFrame(
  origin: readonly [number, number, number],
): ApolloSolidGeometryParameter["localFrame"] {
  return {
    origin,
    xAxis: LONGITUDINAL_X,
    yAxis: TRANSVERSE_Y,
    zAxis: VERTICAL_Z,
  };
}

function buildAppurtenanceSolid(geometry: AppurtenanceGeometry): ApolloSolidGeometryParameter {
  return {
    id: `solid:appurtenance:${geometry.sourceEntityId}`,
    sourceEntityKind: "member",
    sourceEntityId: geometry.sourceEntityId,
    selectionKey: buildDesignEntitySelectionKey("BridgeAppurtenance", geometry.sourceEntityId),
    validationTargetKey: buildDesignEntitySelectionKey("BridgeAppurtenance", geometry.sourceEntityId),
    displayLabel: APPURTENANCE_SLOT_LABELS[geometry.slot],
    kind: "appurtenance",
    visibilityGroup: "appurtenances",
    exportable: true,
    designEntityId: geometry.sourceEntityId,
    designEntityKind: "BridgeAppurtenance",
    dimensionsM: {
      length: geometry.lengthM,
      width: geometry.widthM,
      height: geometry.heightM,
      startStation: geometry.placement.startStation,
      endStation: geometry.placement.endStation,
      transverseOffset: geometry.placement.transverseOffset,
    },
    localFrame: longitudinalFrame([
      geometry.placement.centerStation,
      geometry.placement.transverseOffset,
      geometry.placement.centerZ,
    ]),
  };
}

function buildHaunchSolid(geometry: HaunchGeometry): ApolloSolidGeometryParameter {
  // RECT: exact box. TRAPEZOID: development box uses average width (ASSUMED_DEVELOPMENT_ONLY).
  const displayWidth =
    geometry.shapeType === "RECT"
      ? geometry.placement.topWidthM
      : (geometry.placement.topWidthM + geometry.placement.bottomWidthM) / 2;
  return {
    id: `solid:haunch:${geometry.sourceEntityId}`,
    sourceEntityKind: "member",
    sourceEntityId: geometry.sourceEntityId,
    selectionKey: buildDesignEntitySelectionKey("Haunch", geometry.sourceEntityId),
    validationTargetKey: buildDesignEntitySelectionKey("Haunch", geometry.sourceEntityId),
    displayLabel: `Haunch ${geometry.mainGirderKey}`,
    kind: "haunch",
    visibilityGroup: "rc-deck-haunches",
    exportable: true,
    designEntityId: geometry.sourceEntityId,
    designEntityKind: "Haunch",
    dimensionsM: {
      length: geometry.lengthM,
      width: displayWidth,
      height: geometry.placement.heightM,
      topWidth: geometry.placement.topWidthM,
      bottomWidth: geometry.placement.bottomWidthM,
      startStation: geometry.placement.startStation,
      endStation: geometry.placement.endStation,
      girderOffsetY: geometry.placement.girderOffsetY,
      shapeRect: geometry.shapeType === "RECT" ? 1 : 0,
    },
    localFrame: longitudinalFrame([
      geometry.placement.centerStation,
      geometry.placement.girderOffsetY,
      geometry.placement.centerZ,
    ]),
  };
}

export function buildAppurtenanceAndHaunchSolids(
  project: ProjectModel,
  warnings: ApolloVisualizationWarning[],
  assumptions: ApolloVisualizationAssumption[],
): ApolloSolidGeometryParameter[] {
  const draft = getBridgeStructureInputDraft(project);
  if (draft.deckThickness === null || draft.girderCount === null || draft.girderSpacing === null) {
    return [];
  }

  const solids: ApolloSolidGeometryParameter[] = [];

  const appModels = buildBridgeAppurtenanceModels(draft.appurtenanceConfiguration, {
    bridgeLength: draft.bridgeLength,
    width: draft.width,
    projectScopeId: project.project.id,
  });
  if (appModels.complete && appModels.models.length > 0) {
    const derived = deriveAppurtenanceGeometries(appModels.models, {
      deckThicknessM: draft.deckThickness,
    });
    for (const failure of derived.failures) {
      if (!failure.ok) {
        warnings.push({
          code: "invalid-solid-dimension",
          severity: "warning",
          message: `Appurtenance solid skipped (${failure.sourceEntityId}): ${failure.diagnostics.join("; ")}`,
          sourceEntityId: failure.sourceEntityId,
        });
      }
    }
    for (const geometry of derived.geometries) {
      solids.push(buildAppurtenanceSolid(geometry));
    }
    assumptions.push({
      code: "appurtenance-solids-local-crs",
      message:
        "Appurtenance solids use local CRS (+Y=right); offset is cross-section centerline (DEC-S4C-0001). Step 4-E binding pending.",
    });
  }

  const haunchModels = buildRcDeckHaunchModels(draft.haunchConfiguration, {
    bridgeLength: draft.bridgeLength,
    girderCount: draft.girderCount,
    projectScopeId: project.project.id,
  });
  if (haunchModels.complete && haunchModels.models.length > 0) {
    const derived = deriveHaunchGeometries(haunchModels.models, {
      girderCount: draft.girderCount,
      girderSpacing: draft.girderSpacing,
      rcUnitWeightKNPerM3: draft.rcUnitWeight,
    });
    for (const failure of derived.failures) {
      if (!failure.ok) {
        warnings.push({
          code: "invalid-solid-dimension",
          severity: "warning",
          message: `Haunch solid skipped (${failure.sourceEntityId}): ${failure.diagnostics.join("; ")}`,
          sourceEntityId: failure.sourceEntityId,
        });
      }
    }
    let trapCount = 0;
    for (const geometry of derived.geometries) {
      if (geometry.shapeType === "TRAPEZOID") trapCount += 1;
      solids.push(buildHaunchSolid(geometry));
    }
    assumptions.push({
      code: "haunch-solids-datum",
      message:
        "Haunch solids sit on top flange upper face (Z=0) up to deck soffit (Z=height); mesh not used (DEC-S4-0009).",
    });
    if (trapCount > 0) {
      assumptions.push({
        code: "haunch-trapezoid-display-average-width",
        message:
          "TRAPEZOID haunch solids use average width for box display (ASSUMED_DEVELOPMENT_ONLY). Quantity/load use exact trap area from C1 kernel.",
      });
    }
  }

  return solids.sort((a, b) => a.id.localeCompare(b.id));
}
