import { useMemo } from "react";
import * as THREE from "three";
import { SceneViewer, type SceneBuildResult } from "./SceneViewer";
import { buildTerrainThreeScene, applyDomainToThreeTransform } from "../modules/terrain/terrainViewerBuilder";
import type { TerrainMesh } from "../modules/terrain/terrainSurface";
import type { Origin3 } from "../modules/terrain/terrainCoordinate";

export interface TerrainViewerProps {
  readonly mesh: TerrainMesh | null;
  readonly localOrigin?: Origin3 | null;
  readonly showWireframe?: boolean;
}

export function TerrainViewer({ mesh, localOrigin, showWireframe = false }: TerrainViewerProps) {
  const buildScene = useMemo<() => SceneBuildResult>(() => {
    return () => {
      if (!mesh || mesh.vertices.length === 0) {
        return { group: new THREE.Group(), bounds: new THREE.Box3() };
      }
      const built = buildTerrainThreeScene(mesh);
      // mesh and wireframe share one geometry object, so the domain->three
      // transform is applied exactly ONCE (double application would stand the
      // terrain vertically).
      applyDomainToThreeTransform(built.mesh, localOrigin ?? null);
      built.wireframe.visible = showWireframe;
      const group = new THREE.Group();
      group.add(built.mesh);
      group.add(built.wireframe);
      return { group, bounds: new THREE.Box3().setFromObject(group) };
    };
  }, [mesh, localOrigin, showWireframe]);

  return (
    <SceneViewer
      buildScene={buildScene}
      className="next-terrain-viewer"
      testId="terrain-viewer"
      showGrid
    />
  );
}
