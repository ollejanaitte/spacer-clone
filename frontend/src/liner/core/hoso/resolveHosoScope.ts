import type { HosoDefinitionDraft } from "../../schema/types";
import type { StationTableEntry } from "../types";
import { DEFAULT_TOLERANCES } from "../tolerances";

export function filterStationsForDefinition(
  definition: HosoDefinitionDraft,
  stationEntries: readonly StationTableEntry[],
): StationTableEntry[] {
  return stationEntries.filter(
    (entry) =>
      entry.physicalDistance >= definition.stationRange.fromM - DEFAULT_TOLERANCES.station
      && entry.physicalDistance <= definition.stationRange.toM + DEFAULT_TOLERANCES.station,
  );
}
