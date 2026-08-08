/**
 * Phase 3-3: BridgeProject -> superstructure GeometryEngineInput binding.
 *
 * The official ①→② route: the BridgeProject CBDM document is the authoritative
 * numeric source (supports / spans / bridge length / deck width / alignment),
 * and the Liner draft remains the geometry authority for evaluation. This facade
 * produces a fully numeric `GeometryEngineInput` from the CBDM and validates the
 * bound-mode invariants (fail-closed).
 *
 * Girder offsets are SUPERSTRUCTURE-OWNED input (the CBDM does not carry them);
 * they are passed via options, never invented here and never silently re-derived
 * from sample constants.
 */

import { CommonModelGeometryInputAdapter } from "../apollo/geometry/geometryInputAdapter";
import type { GeometryEngineInput } from "../apollo/geometry/contracts";
import type { CommonBridgeDataModelValue } from "../contracts/runtime/schemas/commonBridgeDataModel";
import { BridgeProjectAdapterError, BP_CODES } from "./validation";

export interface BoundGeometryInputOptions {
  /** Superstructure-owned girder line offsets (m). Required for bound mode. */
  readonly girderOffsetsM?: Record<string, number>;
  /** Girder ids to place (superstructure-owned). */
  readonly girderIds?: readonly string[];
}

const BINDING_MISSING_SUPPORT = "BP_BINDING_MISSING_SUPPORT";
const BINDING_MISSING_STATION = "BP_BINDING_MISSING_STATION";
const BINDING_MISSING_BRIDGE_LENGTH = "BP_BINDING_MISSING_BRIDGE_LENGTH";
const BINDING_MISSING_SPAN = "BP_BINDING_MISSING_SPAN";

export const BINDING_CODES = {
  MISSING_SUPPORT: BINDING_MISSING_SUPPORT,
  MISSING_STATION: BINDING_MISSING_STATION,
  MISSING_BRIDGE_LENGTH: BINDING_MISSING_BRIDGE_LENGTH,
  MISSING_SPAN: BINDING_MISSING_SPAN,
} as const;

/**
 * Build a fully numeric GeometryEngineInput from the BridgeProject CBDM.
 *
 * Fail-closed conditions (throw BridgeProjectAdapterError):
 *  - CBDM absent / not schema-valid
 *  - no supports, or supports without declared stations (mixed station presence)
 *  - no bridge length
 *  - span lengths inconsistent (validated by the engine; the adapter surfaces spans)
 *  - girder offsets absent (superstructure input required)
 */
export function buildBoundGeometryInput(
  commonModel: CommonBridgeDataModelValue,
  options: BoundGeometryInputOptions = {},
): GeometryEngineInput {
  const adapter = new CommonModelGeometryInputAdapter();
  const input = adapter.adapt(commonModel);

  if (input.supports.length === 0) {
    throw new BridgeProjectAdapterError(
      BINDING_MISSING_SUPPORT,
      "BridgeProject bound mode requires at least one support; the CBDM bridgeGeometry has none.",
    );
  }
  const hasAnyStation = input.supports.some(
    (support) => support.stationM !== undefined && Number.isFinite(support.stationM),
  );
  const hasAllStations = input.supports.every(
    (support) => support.stationM !== undefined && Number.isFinite(support.stationM),
  );
  if (!hasAllStations) {
    throw new BridgeProjectAdapterError(
      BINDING_MISSING_STATION,
      hasAnyStation
        ? "BridgeProject bound mode requires stationM on EVERY support (mixed presence is not allowed)."
        : "BridgeProject bound mode requires declared support stations; the CBDM carries none.",
    );
  }
  if (input.bridgeLengthM === undefined || !Number.isFinite(input.bridgeLengthM)) {
    throw new BridgeProjectAdapterError(
      BINDING_MISSING_BRIDGE_LENGTH,
      "BridgeProject bound mode requires a numeric bridge length from the CBDM.",
    );
  }
  if (input.spanLengthsM === undefined || input.spanLengthsM.length !== input.supports.length - 1) {
    throw new BridgeProjectAdapterError(
      BINDING_MISSING_SPAN,
      `BridgeProject bound mode requires spans == supports - 1 (got ${input.spanLengthsM?.length ?? 0} spans for ${input.supports.length} supports).`,
    );
  }

  const girderOffsetsM = options.girderOffsetsM;
  const girderIds = options.girderIds ?? (girderOffsetsM ? Object.keys(girderOffsetsM) : []);
  if (girderOffsetsM === undefined || girderIds.length === 0) {
    throw new BridgeProjectAdapterError(
      BP_CODES.SOURCE_INVALID,
      "BridgeProject bound mode requires superstructure-owned girder offsets (girderOffsetsM); they are not invented.",
    );
  }

  return {
    ...input,
    girders: girderIds.map((id) => ({ id, offsetM: girderOffsetsM[id], state: "CONFIRMED" })),
    girderOffsetsM,
  };
}
