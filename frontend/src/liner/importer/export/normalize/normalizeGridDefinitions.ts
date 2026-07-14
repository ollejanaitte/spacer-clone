import type { CrossSectionTemplateDraft, GridDefinitionDraft } from "../../../schema/types";
import type { LinerBridge } from "../../types";
import { createUniqueId } from "../../utils/importerUtils";
import type { NormalizationContext } from "./normalizationContext";

function midpoint(left: number, right: number): number {
  return left + (right - left) / 2;
}

export function normalizeGridDefinitions(
  bridge: LinerBridge,
  ctx: NormalizationContext,
  crossSections: readonly CrossSectionTemplateDraft[],
): GridDefinitionDraft[] {
  const stations = bridge.sections
    .map((section) => section.stationingRef.stationValue)
    .filter((value): value is number => value != null)
    .map((value) => ctx.toNormalized(value, "gridDefinitions.stationRange"));

  if (crossSections.length === 0 || stations.length === 0) {
    return [];
  }

  const startPhysicalDistance = Math.min(...stations);
  const endPhysicalDistance = Math.max(...stations);
  const stationTemplates = crossSections
    .filter((template) => Number.isFinite(template.station))
    .sort((left, right) => (left.station ?? 0) - (right.station ?? 0));

  if (stationTemplates.length === 0) {
    return [
      {
        id: createUniqueId("grid-definition"),
        crossSectionTemplateId: crossSections[0]!.id,
        stationRange: {
          startPhysicalDistance,
          endPhysicalDistance,
        },
        stationInterval: undefined,
      },
    ];
  }

  return stationTemplates.map((template, index) => {
    const previous = stationTemplates[index - 1];
    const next = stationTemplates[index + 1];
    const templateStation = template.station ?? startPhysicalDistance;
    return {
      id: createUniqueId("grid-definition"),
      crossSectionTemplateId: template.id,
      stationRange: {
        startPhysicalDistance:
          previous && Number.isFinite(previous.station)
            ? midpoint(previous.station!, templateStation)
            : startPhysicalDistance,
        endPhysicalDistance:
          next && Number.isFinite(next.station)
            ? midpoint(templateStation, next.station!)
            : endPhysicalDistance,
      },
      stationInterval: undefined,
      offsetLineIds: template.offsetLines.map((line) => line.id),
    };
  });
}
