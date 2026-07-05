import type { GridDefinitionDraft } from "../../../schema/types";
import type { Bridge } from "../../types";
import { createUniqueId } from "../../utils/importerUtils";
import type { NormalizationContext } from "./normalizationContext";

export function normalizeGridDefinitions(
  bridge: Bridge,
  ctx: NormalizationContext,
): GridDefinitionDraft[] {
  const templateId = createUniqueId("grid-template");
  const stations = bridge.sections
    .map((section) => section.stationingRef.stationValue)
    .filter((value): value is number => value != null)
    .map((value) => ctx.toNormalized(value, "gridDefinitions.stationRange"));

  if (stations.length < 2) {
    return [];
  }

  return [
    {
      id: createUniqueId("grid-definition"),
      crossSectionTemplateId: templateId,
      stationRange: {
        startPhysicalDistance: Math.min(...stations),
        endPhysicalDistance: Math.max(...stations),
      },
      stationInterval: undefined,
    },
  ];
}
