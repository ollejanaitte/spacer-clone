import { useMemo } from "react";
import * as THREE from "three";
import { SceneViewer, type SceneBuildResult } from "./SceneViewer";
import { buildIntegratedThreeScene } from "../modules/integratedSceneBuilder";
import type { TerrainMesh } from "../modules/terrain/terrainSurface";
import type { Road3DMesh } from "../modules/road/roadMesh";
import type { ExistingConditionEntity } from "../modules/existingConditions";
import type { Origin3 } from "../modules/terrain/terrainCoordinate";

export interface IntegratedSceneViewerProps {
  readonly terrain?: TerrainMesh | null;
  readonly road?: Road3DMesh | null;
  readonly existing?: readonly ExistingConditionEntity[] | null;
  readonly localOrigin?: Origin3 | null;
  readonly showTerrainWireframe?: boolean;
}

/**
 * 3D viewer for the integrated scene (Terrain + Road CIM + Existing Conditions).
 * All layers are placed in the same Render Coordinate space by
 * buildIntegratedThreeScene (single shared domain->three adapter).
 */
export function IntegratedSceneViewer({
  terrain,
  road,
  existing,
  localOrigin,
  showTerrainWireframe = false,
}: IntegratedSceneViewerProps) {
  const buildScene = useMemo<() => SceneBuildResult>(() => {
    return () => {
      const built = buildIntegratedThreeScene({
        terrain,
        road,
        existing,
        localOrigin,
        showTerrainWireframe,
      });
      return { group: built.group, bounds: built.bounds };
    };
  }, [terrain, road, existing, localOrigin, showTerrainWireframe]);

  return (
    <SceneViewer
      buildScene={buildScene}
      className="next-integrated-viewer"
      testId="integrated-viewer"
      showGrid
    />
  );
}
