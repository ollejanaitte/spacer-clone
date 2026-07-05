import type { LinerDomainDraftVNext } from "../../../schema/types";
import type { Bridge } from "../../types";
import { createUniqueId } from "../../utils/importerUtils";
import type { NormalizationContext } from "./normalizationContext";

export function normalizeVerticalAlignment(
  bridge: Bridge,
  ctx: NormalizationContext,
): LinerDomainDraftVNext["verticalAlignment"] {
  const profileElements = bridge.alignmentMetadata?.profile?.elements ?? [];
  return {
    id: createUniqueId("vertical-alignment"),
    elements: profileElements.map((element) => {
      let startStation = ctx.toNormalized(
        element.startStation,
        `profile.elements[${element.id}].startStation`,
      );
      const endStation = ctx.toNormalized(
        element.endStation,
        `profile.elements[${element.id}].endStation`,
      );
      if (startStation < -ctx.tolerance.station) {
        startStation = 0;
      }
      return {
        ...element,
        startStation,
        endStation,
        length: endStation - startStation,
      };
    }),
  };
}
