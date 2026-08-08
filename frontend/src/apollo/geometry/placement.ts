/**
 * Bridge base placement — support lines and girder lines (Phase 6-1C).
 *
 * Uses the Alignment Connector (LINER authority) to sample the alignment for
 * 3D positions / local frames. This module decides *where* support lines and
 * girder lines are placed (stations, offsets, extents) from declared input;
 * it never reimplements station->XYZ or offset->XYZ math.
 *
 * Reference Bridge 001 (plane grid, G-SM-0025): 4 support lines (AR2 abutment,
 * PR1 pier, PR2 pier, PU15 abutment) over 3 spans; 2 girder lines AG1/AG2.
 */

import {
  type AlignmentConnector,
} from "./contracts";
import type {
  GirderLine,
  GirderStationPoint,
  SupportLine,
  SupportPoint,
} from "./types";

export type SupportRole = "abutment" | "pier";

export type SupportPlacementRequest = {
  supports: { id: string; role: SupportRole }[];
  spanLengthsM: number[];
  bridgeLengthM: number;
  /** Girder ids that cross the support (one SupportPoint per girder). */
  girderIds: string[];
  alignmentId: string;
  /** Optional explicit skew (rad). Defaults to orthogonal (0) when absent. */
  skewRad?: number;
};

export type SupportPlacementResult = {
  supportLines: SupportLine[];
  supportPoints: SupportPoint[];
};

export type GirderPlacementRequest = {
  girders: {
    id: string;
    /** Constant offset, or use offsetStartM/offsetEndM for a tapered line. */
    offsetM?: number;
    offsetStartM?: number;
    offsetEndM?: number;
  }[];
  stationStartM: number;
  stationEndM: number;
  alignmentId: string;
};

/**
 * Compute support-line stations from cumulative span lengths.
 * support[0] -> 0; interior supports -> cumulative span ends;
 * support[last] -> bridgeLengthM. Requires supports == spans + 1.
 */
export function supportStationsFromSpans(
  supports: unknown[],
  spanLengthsM: number[],
  bridgeLengthM: number,
): number[] {
  if (supports.length !== spanLengthsM.length + 1) {
    throw new Error(
      `support count ${supports.length} != span count ${spanLengthsM.length} + 1`,
    );
  }
  const stations: number[] = [];
  for (let i = 0; i < supports.length; i += 1) {
    if (i === 0) {
      stations.push(0);
    } else if (i === supports.length - 1) {
      stations.push(bridgeLengthM);
    } else {
      stations.push(
        spanLengthsM.slice(0, i).reduce((sum, s) => sum + s, 0),
      );
    }
  }
  return stations;
}

/** Build one support line at a station using the Alignment Connector. */
function buildSupportLine(
  supportId: string,
  stationM: number,
  skewRad: number,
  connector: AlignmentConnector,
  alignmentId: string,
): SupportLine {
  const sample = connector.samplePoint({ alignmentId, stationM, offsetM: 0 });
  return {
    id: `SUP-LINE-${supportId}`,
    supportId,
    stationM: { state: "CONFIRMED", value: stationM, unit: "m" },
    skewRad: { state: "CONFIRMED", value: skewRad, unit: "rad" },
    transverseAxis: sample.transverse,
    elevationM: { state: "CONFIRMED", value: sample.position.z, unit: "m" },
  };
}

/** Build one support point (bearing reference) per girder at a support line. */
function buildSupportPoint(
  supportId: string,
  girderId: string,
  girderOffsetM: number,
  stationM: number,
  connector: AlignmentConnector,
  alignmentId: string,
): SupportPoint {
  const sample = connector.samplePoint({ alignmentId, stationM, offsetM: girderOffsetM });
  return {
    id: `SUP-PT-${supportId}-${girderId}`,
    supportId,
    girderId,
    stationM,
    offsetM: girderOffsetM,
    position: sample.position,
    localFrame: sample.localFrame,
  };
}

/**
 * Place support lines (and per-girder support points) on the alignment.
 */
export function placeSupportLines(
  request: SupportPlacementRequest,
  connector: AlignmentConnector,
  girderOffsetsM: Record<string, number>,
): SupportPlacementResult {
  const stations = supportStationsFromSpans(
    request.supports,
    request.spanLengthsM,
    request.bridgeLengthM,
  );
  const skewRad = request.skewRad ?? 0;
  const supportLines: SupportLine[] = [];
  const supportPoints: SupportPoint[] = [];

  request.supports.forEach((support, index) => {
    const stationM = stations[index];
    supportLines.push(
      buildSupportLine(support.id, stationM, skewRad, connector, request.alignmentId),
    );
    for (const girderId of request.girderIds) {
      const offsetM = girderOffsetsM[girderId] ?? 0;
      supportPoints.push(
        buildSupportPoint(support.id, girderId, offsetM, stationM, connector, request.alignmentId),
      );
    }
  });

  return { supportLines, supportPoints };
}

/** Build one girder line with endpoint station points. */
function buildGirderLine(
  girderId: string,
  offsetStartM: number,
  offsetEndM: number,
  stationStartM: number,
  stationEndM: number,
  connector: AlignmentConnector,
  alignmentId: string,
): GirderLine {
  const endpoints: [number, number][] = [
    [stationStartM, offsetStartM],
    [stationEndM, offsetEndM],
  ];
  const points: GirderStationPoint[] = endpoints.map(([stationM, offsetM], i) => {
    const sample = connector.samplePoint({ alignmentId, stationM, offsetM });
    return {
      id: `GIRL-${girderId}-${i === 0 ? "START" : "END"}`,
      girderId,
      stationM,
      offsetM,
      position: sample.position,
      azimuthRad: sample.azimuthRad,
      localFrame: sample.localFrame,
    };
  });

  return {
    id: `GIRL-${girderId}`,
    girderId,
    offsetM: { state: "CONFIRMED", value: offsetStartM, unit: "m" },
    stationStartM,
    stationEndM,
    points,
  };
}

/**
 * Place girder lines between two stations at declared offsets.
 */
export function placeGirderLines(
  request: GirderPlacementRequest,
  connector: AlignmentConnector,
): GirderLine[] {
  return request.girders.map((girder) => {
    const offsetStartM = girder.offsetStartM ?? girder.offsetM ?? 0;
    const offsetEndM = girder.offsetEndM ?? girder.offsetM ?? offsetStartM;
    return buildGirderLine(
      girder.id,
      offsetStartM,
      offsetEndM,
      request.stationStartM,
      request.stationEndM,
      connector,
      request.alignmentId,
    );
  });
}
