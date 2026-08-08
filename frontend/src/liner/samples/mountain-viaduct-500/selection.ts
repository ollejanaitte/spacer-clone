/**
 * 3D selection / highlight (MAIN3D P07).
 *
 * Maps a selected entity id (abutment:A1, pier:P1, ... girder, node) to the
 * stable substructure object id in the unified scene so the UI highlight and
 * the 3D selection stay in sync. Also provides save/reload helpers that
 * reconstruct the same scene from a serialized draft (same deterministic
 * terrain seed -> same terrain).
 */
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import { resolveSupportMarkers } from "./markers";
import { buildSubstructure3d } from "./substructure";
import { MOUNTAIN_TERRAIN_SETTINGS, buildTerrainHeightfield, terrainHash } from "./terrain";
import { buildUnified3DScene } from "./scene";

/** Stable ids of the 9 supports. */
export const SUPPORT_IDS = ["A1", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "A2"];

export type SceneSelection =
  | { kind: "support"; id: string }
  | { kind: "girder"; id: string }
  | { kind: "node"; id: string }
  | null;

/** Stable object id for a support selection (matches substructure ids). */
export function supportObjectId(id: string): string {
  return id;
}

/** Resolve the substructure element (boxes) for a selection. */
export function substructureElementForSelection(
  draft: BuildIntermediateInput,
  selection: SceneSelection,
): { id: string; index: number } | null {
  if (!selection || selection.kind !== "support") {
    return null;
  }
  const elements = buildSubstructure3d(draft).elements;
  const index = elements.findIndex((e) => e.id === selection.id);
  if (index < 0) return null;
  return { id: elements[index].id, index };
}

/** Selection label shown in the viewer (entity name). */
export function selectionLabel(selection: SceneSelection): string {
  if (!selection) return "選択なし";
  if (selection.kind === "support") return `${selection.id}（下部工）`;
  if (selection.kind === "girder") return `Girder ${selection.id}`;
  return `Node ${selection.id}`;
}

/** Deterministic terrain identity hash for save/reload verification. */
export function terrainIdentity(): { seed: number; hash: number } {
  const hf = buildTerrainHeightfield();
  // sample a few cells for a cheap deterministic identity
  let hash = terrainHash(0, 0, MOUNTAIN_TERRAIN_SETTINGS.seed);
  const positions = hf.positions;
  for (let i = 0; i < positions.length; i += 3 * 137) {
    hash = terrainHash(Math.floor(hash * 1e6) % 100000, Math.floor(positions[i]), MOUNTAIN_TERRAIN_SETTINGS.seed);
  }
  return { seed: MOUNTAIN_TERRAIN_SETTINGS.seed, hash };
}

/** Verify two drafts reproduce the same scene (save/reload check). */
export function scenesEqual(
  a: BuildIntermediateInput,
  b: BuildIntermediateInput,
): boolean {
  const sceneA = buildUnified3DScene(a);
  const sceneB = buildUnified3DScene(b);
  // terrain is deterministic -> same positions
  const pa = sceneA.terrain.positions;
  const pb = sceneB.terrain.positions;
  if (pa.length !== pb.length) return false;
  for (let i = 0; i < pa.length; i += 1) {
    if (pa[i] !== pb[i]) return false;
  }
  // same support count
  if (sceneA.substructure.length !== sceneB.substructure.length) return false;
  // road points must match (reflects alignment edits)
  const ra = sceneA.road.points;
  const rb = sceneB.road.points;
  if (ra.length !== rb.length) return false;
  for (let i = 0; i < ra.length; i += 1) {
    if (ra[i].x !== rb[i].x || ra[i].y !== rb[i].y || ra[i].z !== rb[i].z) {
      return false;
    }
  }
  return true;
}

export { resolveSupportMarkers };
