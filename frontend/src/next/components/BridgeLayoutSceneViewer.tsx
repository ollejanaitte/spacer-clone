import { useMemo } from "react";
import { SceneViewer, type SceneBuildResult } from "./SceneViewer";
import { buildBridgeLayoutThreeScene, type PierSceneMarker } from "../modules/bridgeLayout/bridgeLayoutScene";
import type { TerrainMesh } from "../modules/terrain/terrainSurface";
import type { Road3DMesh } from "../modules/road/roadMesh";
import type { ExistingConditionEntity } from "../modules/existingConditions";
import type { Origin3 } from "../modules/terrain/terrainCoordinate";
import type { RoadAlignmentContext } from "../modules/bridgeLayout/bridgeLayoutDomain";
import type { AbutmentPlacementCandidate } from "../modules/bridgeLayout/bridgeLayoutTypes";

export interface BridgeLayoutSceneViewerProps {
  readonly terrain?: TerrainMesh | null;
  readonly road?: Road3DMesh | null;
  readonly existing?: readonly ExistingConditionEntity[] | null;
  readonly roadContext?: RoadAlignmentContext | null;
  readonly bridgeRange?: { startStation: number; endStation: number } | null;
  readonly candidateA1?: AbutmentPlacementCandidate | null;
  readonly candidateA2?: AbutmentPlacementCandidate | null;
  readonly piers?: readonly PierSceneMarker[] | null;
  readonly spans?: readonly { spanId: string; from: string; to: string; length: number }[] | null;
  readonly localOrigin?: Origin3 | null;
  readonly showTerrainWireframe?: boolean;
}

/**
 * 3D viewer for the Bridge Layout (Terrain + Road + Existing +
 * Bridge Range + A1/P1..Pn/A2 + span labels). All layers share one Render
 * Coordinate space via buildBridgeLayoutThreeScene (shared domain->three adapter).
 */
export function BridgeLayoutSceneViewer({
  terrain,
  road,
  existing,
  roadContext,
  bridgeRange,
  candidateA1,
  candidateA2,
  piers,
  spans,
  localOrigin,
  showTerrainWireframe = false,
}: BridgeLayoutSceneViewerProps) {
  const buildScene = useMemo<() => SceneBuildResult>(() => {
    return () => {
      const built = buildBridgeLayoutThreeScene({
        terrain,
        road,
        existing,
        roadContext,
        bridgeRange,
        candidateA1,
        candidateA2,
        piers,
        spans,
        localOrigin,
        showTerrainWireframe,
      });
      return { group: built.group, bounds: built.bounds, focusBounds: built.focusBounds };
    };
  }, [terrain, road, existing, roadContext, bridgeRange, candidateA1, candidateA2, piers, spans, localOrigin, showTerrainWireframe]);

  return (
    <SceneViewer
      buildScene={buildScene}
      className="next-bridge-layout-viewer"
      testId="bridge-layout-viewer"
      showGrid
      focusBounds={null}
    />
  );
}
