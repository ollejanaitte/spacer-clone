import type { StationDefinitionDraft } from "../../../schema/types";
import type { NormalizationContext } from "./normalizationContext";

export function normalizeStationDefinition(
  sectionStations: readonly number[],
  ctx: NormalizationContext,
): StationDefinitionDraft {
  const explicitStations = sectionStations.map((value) =>
    ctx.toNormalized(value, "stationDefinition.explicitStations"),
  );
  ctx.assertMonotonic(explicitStations, "explicitStations");
  for (const [i, station] of explicitStations.entries()) {
    ctx.assertInRange(station, `explicitStations[${i}]`);
  }

  return {
    originDisplayedStation: ctx.originStation,
    explicitStations,
    equations: [],
  };
}
