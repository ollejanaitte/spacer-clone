/** Pavement quantity category (DEC-S5-0012). Invent nothing unless PROVIDED. */

import { PRESENCE_STATUS } from "../bridgeStructure/presence";
import { derivePavementGeometry } from "../bridgeStructure/pavementGeometry";
import type { ApolloBridgeStructureInputDraft } from "../bridgeStructure/types";

export type PavementQuantityRow = {
  readonly category: "PAVEMENT";
  readonly volumeM3: number;
  readonly weightKN: number | null;
  readonly status: "UNVERIFIED_DEVELOPMENT_ONLY";
};

export function computePavementQuantity(
  draft: ApolloBridgeStructureInputDraft,
): PavementQuantityRow | null {
  if (
    draft.pavementConfiguration.presence !== PRESENCE_STATUS.PROVIDED ||
    draft.bridgeLength === null ||
    draft.width === null ||
    draft.deckThickness === null
  ) {
    return null;
  }
  const geometry = derivePavementGeometry(
    draft.pavementConfiguration,
    draft.bridgeLength,
    draft.width,
    draft.deckThickness,
  );
  if (!geometry) return null;
  const volumeM3 = geometry.lengthM * geometry.widthM * geometry.thicknessM;
  const weightKN =
    geometry.unitWeight !== null && geometry.unitWeight > 0
      ? volumeM3 * geometry.unitWeight
      : null;
  return {
    category: "PAVEMENT",
    volumeM3,
    weightKN,
    status: "UNVERIFIED_DEVELOPMENT_ONLY",
  };
}
