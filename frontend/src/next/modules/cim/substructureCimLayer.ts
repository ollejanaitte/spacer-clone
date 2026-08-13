/**
 * Substructure + Foundation CIM layers (Phase 8-02 WP-F).
 *
 * Renders the substructure solids (abutment / pier / column / cap) from the
 * canonical SubstructureDocument and splits the foundation (footing / pile)
 * solids into the dedicated foundation layer.
 */

import * as THREE from "three";
import type { ProjectManager } from "../../project/projectManager";
import { readSubstructureDocument } from "../substructureModuleAdapter";
import { buildSubstructureSceneGroup } from "../substructure/substructureSceneBuilder";
import { buildSubstructureSolids } from "../substructure/substructureGeometry";
import { localToWorld } from "../../../substructure/geometryBase";
import { domainToThree } from "../renderCoordinate";
import { attachCimMetadata, type CimEntityMetadata } from "./integrated3dScene";

export interface SubstructureCimLayerResult {
  readonly substructureGroup: THREE.Group;
  readonly foundationGroup: THREE.Group;
  readonly metadata: readonly CimEntityMetadata[];
  readonly ok: boolean;
  readonly issues: readonly { path: string; message: string }[];
}

function subtractOrigin(p: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  return { x: p.x, y: p.y, z: p.z };
}

const FOUNDATION_COLOR = 0x9aa5b1;
const PILE_COLOR = 0x5a6b7d;

export function buildSubstructureCimLayer(
  manager: ProjectManager,
  projectId: string,
): SubstructureCimLayerResult {
  const subDoc = readSubstructureDocument(manager, projectId);
  const substructureGroup = new THREE.Group();
  const foundationGroup = new THREE.Group();
  const metadata: CimEntityMetadata[] = [];

  if (!subDoc) {
    return { substructureGroup, foundationGroup, metadata, ok: true, issues: [] };
  }

  const built = buildSubstructureSceneGroup(subDoc, { localOrigin: null });
  for (const mesh of built.group.children as THREE.Mesh[]) {
    const selectionId = mesh.userData.selectionId as string | undefined;
    const supportId = selectionId?.replace(/^sub:/, "") ?? mesh.name;
    const meta: CimEntityMetadata = {
      sourceModule: "substructure",
      sourceEntityId: supportId,
      stableId: selectionId ?? `sub:${supportId}`,
      coordinateContext: "world",
      label: supportId,
    };
    attachCimMetadata(mesh, meta);
    metadata.push(meta);
  }
  substructureGroup.add(built.group);

  // Foundation layer: footing + pile solids only.
  const solidGroups = buildSubstructureSolids(subDoc);
  for (const solidGroup of solidGroups) {
    const supportId = solidGroup.supportId;
    for (const node of solidGroup.solids) {
      if (node.entity !== "footing" && node.entity !== "pile") {
        continue;
      }
      const world = localToWorld(node.localCenter, solidGroup.transform);
      const [tx, ty, tz] = domainToThree(subtractOrigin(world));
      const size = node.localSize;
      const color = node.entity === "pile" ? PILE_COLOR : FOUNDATION_COLOR;
      const geo = new THREE.BoxGeometry(size?.x ?? 0.5, size?.z ?? 0.5, size?.y ?? 0.5);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
      mesh.position.set(tx, ty, tz);
      const part = node.id;
      const stableId = `foundation:${part}`;
      const meta: CimEntityMetadata = {
        sourceModule: "foundation",
        sourceEntityId: part,
        stableId,
        coordinateContext: "world",
        label: `${supportId} ${node.entity}`,
        meta: { supportId, entity: node.entity },
      };
      attachCimMetadata(mesh, meta);
      mesh.name = `foundation-${part}`;
      foundationGroup.add(mesh);
      metadata.push(meta);
    }
  }

  return { substructureGroup, foundationGroup, metadata, ok: true, issues: [] };
}
