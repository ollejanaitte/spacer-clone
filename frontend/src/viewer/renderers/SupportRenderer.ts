import * as THREE from "three";
import type { ProjectModel, Support } from "../../types";
import type { ViewerScales } from "../types";
import { createNodeMap } from "../threeUtils";

const fixedMaterial = new THREE.MeshStandardMaterial({ color: "#4f5f70", roughness: 0.7 });
const pinnedMaterial = new THREE.MeshStandardMaterial({ color: "#3b8b6d", roughness: 0.7 });
const rollerMaterial = new THREE.MeshStandardMaterial({ color: "#7a6fb3", roughness: 0.7 });

export function renderSupports(project: ProjectModel, scales: ViewerScales): THREE.Object3D[] {
  const nodeMap = createNodeMap(project);
  const objects: THREE.Object3D[] = [];
  const size = Math.max(scales.nodeSize * 2.4, 0.16);

  for (const support of project.supports) {
    const position = nodeMap.get(support.nodeId);
    if (!position) continue;
    const kind = classifySupport(support);
    const group = new THREE.Group();
    group.position.copy(position).add(new THREE.Vector3(0, -size * 1.8, 0));

    if (kind === "fixed") {
      const block = new THREE.Mesh(new THREE.BoxGeometry(size * 1.8, size * 0.7, size * 1.8), fixedMaterial.clone());
      group.add(block);
      for (let index = -2; index <= 2; index += 1) {
        const hatch = new THREE.Mesh(new THREE.BoxGeometry(size * 0.08, size * 0.18, size * 1.8), fixedMaterial.clone());
        hatch.rotation.z = Math.PI / 4;
        hatch.position.set(index * size * 0.38, -size * 0.46, 0);
        group.add(hatch);
      }
    } else {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(size * 0.9, size * 1.35, 4),
        (kind === "pinned" ? pinnedMaterial : rollerMaterial).clone(),
      );
      cone.rotation.y = Math.PI / 4;
      group.add(cone);
      if (kind === "roller") {
        const rollerAxis = new THREE.Vector3(0, 0, 1);
        for (const offset of [-0.42, 0.42]) {
          const roller = new THREE.Mesh(
            new THREE.CylinderGeometry(size * 0.22, size * 0.22, size * 1.1, 18),
            rollerMaterial.clone(),
          );
          roller.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rollerAxis);
          roller.position.set(offset * size, -size * 0.75, 0);
          group.add(roller);
        }
      }
    }
    group.userData = { supportKind: kind, nodeId: support.nodeId };
    objects.push(group);
  }

  return objects;
}

function classifySupport(support: Support): "fixed" | "pinned" | "roller" {
  const translations = [support.ux, support.uy, support.uz].filter(Boolean).length;
  const rotations = [support.rx, support.ry, support.rz].filter(Boolean).length;
  if (translations === 3 && rotations === 3) return "fixed";
  if (translations >= 3) return "pinned";
  return "roller";
}
