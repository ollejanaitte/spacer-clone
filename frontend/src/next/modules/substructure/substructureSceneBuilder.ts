/**
 * Substructure 3D scene builder (Phase 6-01 D FROZEN / Phase 6-02 WP-I).
 *
 * Builds the substructure Three.js group from the SubstructureDocument solids
 * (reusing the existing KEEP solid generators) using the shared `domainToThree`
 * render transform ONLY. ID rules:
 *  - entity ID (mesh name): sub-{supportId} / sub-{supportId}-pier / etc.
 *  - selection key: sub:{supportId}
 */

import * as THREE from "three";
import { buildSubstructureSolids } from "./substructureGeometry";
import { localToWorld } from "../../../substructure/geometryBase";
import { domainToThree, type RenderOrigin } from "../renderCoordinate";
import type { SubstructureDocument } from "./substructureTypes";

export interface SubstructureSceneBuildResult {
  readonly group: THREE.Group;
  readonly bounds: THREE.Box3;
  readonly meshCount: number;
}

const SUPPORT_COLORS: Record<string, number> = {
  abutment: 0x8a6d3b,
  pier: 0x6b7d99,
  footing: 0x9aa5b1,
  pile: 0x5a6b7d,
};

function subtractOrigin(p: { x: number; y: number; z: number }, origin: RenderOrigin | null): { x: number; y: number; z: number } {
  return {
    x: p.x - (origin?.x ?? 0),
    y: p.y - (origin?.y ?? 0),
    z: p.z - (origin?.z ?? 0),
  };
}

/** Build the substructure scene group from the document solids. */
export function buildSubstructureSceneGroup(
  document: SubstructureDocument,
  options: { localOrigin?: RenderOrigin | null } = {},
): SubstructureSceneBuildResult {
  const group = new THREE.Group();
  const origin = options.localOrigin ?? null;
  const solids = buildSubstructureSolids(document);

  solids.forEach((solidGroup, index) => {
    const support = document.supports[index];
    const supportId = support?.supportId ?? solidGroup.supportId;
    const supportType = support?.supportType ?? "pier";
    const color = SUPPORT_COLORS[supportType] ?? 0x999999;

    for (const node of solidGroup.solids) {
      const world = localToWorld(node.localCenter, solidGroup.transform);
      const [tx, ty, tz] = domainToThree(subtractOrigin(world, origin));
      const size = node.localSize;
      const geo = new THREE.BoxGeometry(size?.x ?? 0.5, size?.z ?? 0.5, size?.y ?? 0.5);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
      mesh.position.set(tx, ty, tz);
      // entity ID (mesh name) and selection key are separate contracts
      mesh.name = `sub-${supportId}`;
      mesh.userData.selectionId = `sub:${supportId}`;
      group.add(mesh);
    }
  });

  const bounds = new THREE.Box3().setFromObject(group);
  return { group, bounds, meshCount: group.children.length };
}

/** Merge the substructure group into an existing integrated group. */
export function addSubstructureToScene(
  parent: THREE.Group,
  document: SubstructureDocument,
  options: { localOrigin?: RenderOrigin | null } = {},
): SubstructureSceneBuildResult {
  const built = buildSubstructureSceneGroup(document, options);
  parent.add(built.group);
  return built;
}
