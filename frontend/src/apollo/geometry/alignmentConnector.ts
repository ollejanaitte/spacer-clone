/**
 * Alignment Connector — adapter over LINER road-alignment output (Phase 6-1B).
 *
 * Single Source of Alignment = LINER. This connector maps bridge-side
 * station/offset requests to LINER evaluation and carries LINER-provided
 * XYZ / azimuth / local frame / curvature into the bridge contract. It NEVER
 * reimplements station->XY, clothoid, arc or vertical math.
 *
 * LINER authority: `frontend/src/liner/core/coordinate3d.ts`
 * (`pointAtStationOffset`, `crossSectionAtStation`) and
 * `frontend/src/liner/core/geometry/horizontal.ts` (`evaluateAlignmentAtDistance`).
 */

import {
  crossSectionAtStation,
  normalizeCoordinate3dInput,
  pointAtStationOffset,
  type Coordinate3dInput,
} from "../../liner/core/coordinate3d";
import { evaluateAlignmentAtDistance } from "../../liner/core/geometry/horizontal";
import {
  type AlignmentConnector,
  type AlignmentPointSample,
} from "./contracts";
import type { BuildIntermediateInput } from "../../liner/core/pipeline/pipeline";

/** Raised when LINER cannot evaluate the requested station/offset. */
export class AlignmentSamplingError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly diagnostics: unknown[],
  ) {
    super(message);
    this.name = "AlignmentSamplingError";
  }
}

export type LinerAlignmentConnectorOptions = {
  alignmentId?: string;
};

/**
 * Alignment Connector implementation backed by a LINER `Coordinate3dInput`.
 *
 * The LINER input is the road-side alignment data (a `BuildIntermediateInput` or
 * `LinerDomainDraftVNext`). All coordinates and frames come from LINER; this class
 * only maps requests and reshapes results.
 */
export class LinerAlignmentConnector implements AlignmentConnector {
  private readonly input: BuildIntermediateInput;

  constructor(
    input: Coordinate3dInput,
    private readonly options: LinerAlignmentConnectorOptions = {},
  ) {
    this.input = normalizeCoordinate3dInput(input);
  }

  samplePoint(request: {
    alignmentId: string;
    stationM: number;
    offsetM: number;
  }): AlignmentPointSample {
    const result = pointAtStationOffset(this.input, request.stationM, request.offsetM);
    if (!result.ok) {
      throw new AlignmentSamplingError(
        `LINER could not sample station ${request.stationM} offset ${request.offsetM}: ${result.error.code}`,
        result.error.code,
        result.error.diagnostics,
      );
    }
    const v = result.value;
    const curvature = evaluateAlignmentAtDistance(
      this.input.alignment,
      v.physicalDistance,
      v.displayedStation,
    ).curvature;

    return {
      position: { x: v.x, y: v.y, z: v.z },
      azimuthRad: v.azimuth,
      curvature,
      tangent: v.localFrame.tangent,
      transverse: v.localFrame.normal,
      vertical: v.localFrame.binormal,
      sourceStation: v.physicalDistance,
      sourceOffset: v.offset,
      localFrame: v.localFrame,
    };
  }

  sampleSection(request: {
    alignmentId: string;
    stationM: number;
    offsetsM: number[];
  }): AlignmentPointSample[] {
    const section = crossSectionAtStation(this.input, request.stationM);
    if (!section.ok) {
      throw new AlignmentSamplingError(
        `LINER could not sample section at station ${request.stationM}: ${section.error.code}`,
        section.error.code,
        section.error.diagnostics,
      );
    }
    return request.offsetsM.map((offsetM) =>
      this.samplePoint({ alignmentId: request.alignmentId, stationM: request.stationM, offsetM }),
    );
  }
}
