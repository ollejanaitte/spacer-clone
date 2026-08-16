/**
 * Wave 1 mock scene assembler (Lane V).
 *
 * Assembles all six mock layers into one UnifiedViewerModel sharing the
 * canonical world basis and the default render transform. This is the minimal
 * integrated rendering skeleton: multiple layers, one common coordinate frame.
 */

import {
  createDefaultWorldBasis,
  createViewerLayer,
  type LayerSource,
  type UnifiedViewerModel,
  type ViewerLayer,
} from "../layerContract";
import { DEFAULT_RENDER_COORDINATE_TRANSFORM } from "../renderCoordinate";
import { createMockTerrainLayerData } from "./mockTerrain";
import { createMockRoadLayerData } from "./mockRoad";
import {
  createMockBearingLayerData,
  createMockSuperstructureLayerData,
} from "./mockBridge";
import { createMockSubstructureLayerData } from "./mockSubstructure";
import { createMockExistingConditionsLayerData } from "./mockExistingConditions";

const MOCK_SOURCE: LayerSource = {
  lane: "V",
  moduleId: "mock-fixture",
  format: "wave1-mock",
  revision: "1",
};

export function createMockUnifiedScene(): UnifiedViewerModel {
  const layers: ViewerLayer[] = [
    createViewerLayer({
      id: "layer-terrain",
      data: createMockTerrainLayerData(),
      source: MOCK_SOURCE,
      metadata: { label: "Terrain (mock)", standsInForLane: "T" },
    }),
    createViewerLayer({
      id: "layer-road",
      data: createMockRoadLayerData(),
      source: MOCK_SOURCE,
      metadata: { label: "Road (mock)" },
    }),
    createViewerLayer({
      id: "layer-superstructure",
      data: createMockSuperstructureLayerData(),
      source: MOCK_SOURCE,
      metadata: { label: "Superstructure (mock)" },
    }),
    createViewerLayer({
      id: "layer-bearing",
      data: createMockBearingLayerData(),
      source: MOCK_SOURCE,
      metadata: { label: "Bearings (mock)" },
    }),
    createViewerLayer({
      id: "layer-substructure",
      data: createMockSubstructureLayerData(),
      source: MOCK_SOURCE,
      metadata: { label: "Substructure (mock)" },
    }),
    createViewerLayer({
      id: "layer-existing-conditions",
      data: createMockExistingConditionsLayerData(),
      source: MOCK_SOURCE,
      metadata: { label: "Existing Conditions (mock)" },
    }),
  ];

  return {
    contractVersion: 1,
    id: "mock-unified-scene-wave1",
    worldBasis: createDefaultWorldBasis(),
    renderTransform: DEFAULT_RENDER_COORDINATE_TRANSFORM,
    layers,
    selection: null,
  };
}