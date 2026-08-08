/**
 * Grid / panel point generation (Phase 6-2).
 *
 * Generates the panel-point structure along each girder line. Endpoint panel
 * points are CONFIRMED (positions from the Alignment Connector / LINER, mapped
 * through the declared plane-grid -> global transform). Intermediate panel
 * points whose coordinates were not extracted (RB-001 GRID-1002..1026 /
 * 2002..2026) are `HOLD_INSUFFICIENT_SOURCE` and carry no position — no
 * interpolation and no fabrication (STEP1_P04 §2/§6).
 */

import { type AlignmentConnector } from "./contracts";
import {
  type PlaneGridTransform,
  planeGridToOffset,
  planeGridToStation,
} from "./planeGridTransform";
import type { GridPanelPoint, GridPanelSpec } from "./types";

export const HOLD_INTERMEDIATE_PANEL_REASON =
  "Intermediate panel-point coordinates not extracted in Phase 2; no interpolation or back-calculation performed.";

/** Derive the numeric suffix and prefix of a grid ID (e.g. "GRID-1001" -> 1001). */
export function parseGridId(gridId: string): { prefix: string; number: number } {
  const match = /^(.+?)(\d+)$/.exec(gridId);
  if (!match) {
    throw new Error(`grid id has no numeric suffix: ${gridId}`);
  }
  return { prefix: match[1], number: parseInt(match[2], 10) };
}

/**
 * Generate the full panel structure for one girder line.
 * - index 1 (endpoint start) and index panelCount (endpoint end): CONFIRMED
 *   with plane-grid-transformed station/offset and LINER-sampled position.
 * - indices 2..panelCount-1 (intermediate): HOLD_INSUFFICIENT_SOURCE, no position.
 */
export function generateGridPanelPoints(
  spec: GridPanelSpec,
  connector: AlignmentConnector,
  alignmentId: string,
  transform: PlaneGridTransform,
): GridPanelPoint[] {
  if (!Number.isInteger(spec.panelCount) || spec.panelCount < 2) {
    throw new Error(`gridPanelSpec.panelCount must be >= 2, got ${spec.panelCount}`);
  }
  const { prefix, number: startNumber } = parseGridId(spec.startGridId);
  const points: GridPanelPoint[] = [];

  const endpoint = (
    panelIndex: number,
    gridPointId: string,
    plane: { x: number; y: number },
  ): GridPanelPoint => {
    const stationM = planeGridToStation(plane.x, transform);
    const offsetM = planeGridToOffset(plane.y);
    const sample = connector.samplePoint({ alignmentId, stationM, offsetM });
    return {
      id: gridPointId,
      gridPointId,
      girderId: spec.girderId,
      panelIndex,
      role: "endpoint",
      stationM,
      offsetM,
      position: sample.position,
      localFrame: sample.localFrame,
      state: "CONFIRMED",
    };
  };

  for (let panelIndex = 1; panelIndex <= spec.panelCount; panelIndex += 1) {
    if (panelIndex === 1) {
      if (!spec.planeStart) {
        throw new Error(`gridPanelSpec.planeStart required for ${spec.startGridId}`);
      }
      points.push(endpoint(panelIndex, spec.startGridId, spec.planeStart));
      continue;
    }
    if (panelIndex === spec.panelCount) {
      if (!spec.planeEnd) {
        throw new Error(`gridPanelSpec.planeEnd required for ${spec.endGridId}`);
      }
      points.push(endpoint(panelIndex, spec.endGridId, spec.planeEnd));
      continue;
    }
    const gridPointId = `${prefix}${startNumber + panelIndex - 1}`;
    points.push({
      id: gridPointId,
      gridPointId,
      girderId: spec.girderId,
      panelIndex,
      role: "intermediate",
      state: "HOLD_INSUFFICIENT_SOURCE",
      stateReason: HOLD_INTERMEDIATE_PANEL_REASON,
    });
  }
  return points;
}

/**
 * Reference Bridge 001 grid panel specs (Golden-derived plane coordinates):
 * AG1: GRID-1001..1027, AG2: GRID-2001..2027 (G-GEO-0009..0016).
 */
export const RB001_GRID_PANEL_SPECS: GridPanelSpec[] = [
  {
    girderId: "GIRDER-AG1",
    panelCount: 27,
    startGridId: "GRID-1001",
    endGridId: "GRID-1027",
    planeStart: { x: 1.21766, y: 1.47689 }, // G-GEO-0009 / 0010
    planeEnd: { x: 132.76045, y: 1.55372 }, // G-GEO-0011 / 0012
  },
  {
    girderId: "GIRDER-AG2",
    panelCount: 27,
    startGridId: "GRID-2001",
    endGridId: "GRID-2027",
    planeStart: { x: 1.46395, y: -3.02859 }, // G-GEO-0013 / 0014
    planeEnd: { x: 132.55077, y: -2.94155 }, // G-GEO-0015 / 0016
  },
];
