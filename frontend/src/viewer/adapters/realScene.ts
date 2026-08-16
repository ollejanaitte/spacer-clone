/**
 * Lane V-3 — Real-data unified scene assembler (terrain).
 *
 * Builds a UnifiedViewerModel from REAL Lane T Gujo terrain, expressed in the
 * shared canonical world frame (EPSG:6674: X=easting/along, Y=northing/
 * transverse, Z=elevation). The single render transform (domainToThree) is
 * applied by the viewer; no CRS conversion is re-implemented here. V-4 adds
 * the RB001 road layer, V-5 the bridge layers.
 */

import type { TerrainDocument } from "../../next/modules/terrainModule";
import { Heightfield } from "../../terrain/heightfield";
import { buildGujoSampleHeightfield } from "../../terrain";
import {
  createViewerLayer,
  type LayerSource,
  type UnifiedViewerModel,
  type WorldBasis,
} from "../layers/layerContract";
import { DEFAULT_RENDER_COORDINATE_TRANSFORM } from "../layers/renderCoordinate";
import { heightfieldToTerrainLayer, projectOriginFromTerrainDocument } from "./terrainAdapter";

const REAL_SOURCE: LayerSource = {
  lane: "V",
  moduleId: "reference-business-001",
  format: "lane-t-terrain",
  revision: "1",
};

export interface RealGujoTerrainInput {
  readonly heightfield: Heightfield;
  readonly document?: TerrainDocument | null;
  readonly label?: string;
}

/** Canonical world basis for the Gujo Reference Business 001 scene. */
export function createRealGujoWorldBasis(
  projectOrigin?: { readonly x: number; readonly y: number; readonly z: number } | null,
): WorldBasis {
  return {
    id: "gujo-rb001-canonical-epsg6674",
    frame: "canonical-project",
    axes: { x: "along", y: "transverse", z: "elevation" },
    handedness: "right-handed",
    unit: "m",
    elevationConvention: "z-up-tp",
    horizontalCrs: { authority: "EPSG", identifier: "6674" },
    verticalDatum: "tp",
    renderOrigin: projectOrigin ?? null,
    note: "Reference Business 001 Gujo Hachiman, EPSG:6674 (JGD2011 plane rect VII). CRS metadata only; conversion is Lane T territory.",
  };
}

export function buildRealGujoUnifiedScene(input: RealGujoTerrainInput): UnifiedViewerModel {
  const { heightfield, document, label } = input;
  const origin = document ? projectOriginFromTerrainDocument(document) : null;

  const terrainLayer = createViewerLayer({
    id: "layer-real-terrain",
    data: heightfieldToTerrainLayer(heightfield),
    source: REAL_SOURCE,
    metadata: {
      label: label ?? "Terrain (Gujo)",
      terrainId: document?.terrainId ?? null,
      horizontalCrs: "EPSG:6674",
      renderOrigin: origin ?? null,
    },
  });

  return {
    contractVersion: 1,
    id: "real-gujo-unified-scene",
    worldBasis: createRealGujoWorldBasis(origin),
    renderTransform: DEFAULT_RENDER_COORDINATE_TRANSFORM,
    layers: [terrainLayer],
    selection: null,
  };
}

/** V-3 real terrain scene using the Lane T Gujo DEM sample fixture. */
export function buildRealGujoTerrainScene(): UnifiedViewerModel {
  return buildRealGujoUnifiedScene({
    heightfield: buildGujoSampleHeightfield(),
    document: null,
    label: "Terrain (Gujo DEM sample fixture)",
  });
}