import * as THREE from "three";
import type { ExistingConditionEntity, ExistingConditionType } from "./existingConditions";

export interface Existing3DObject {
  readonly entityId: string;
  readonly type: ExistingConditionType;
  readonly label: string;
  readonly mesh: THREE.Mesh;
}

const TYPE_COLORS: Record<ExistingConditionType, number> = {
  road: 0x666666,
  river: 0x2f6fba,
  railway: 0x8a4f2f,
  existingBridge: 0x9c5e2f,
  building: 0xb8b8c8,
  seawall: 0x7a6f6f,
  pond: 0x3f86c4,
  underground: 0x556b2f,
  pipe: 0x7a8f3f,
  tunnel: 0x445544,
  utility: 0x8899aa,
  other: 0x999999,
};

export function entityColor(type: ExistingConditionType): number {
  return TYPE_COLORS[type] ?? TYPE_COLORS.other;
}

/**
 * Build a THREE.js mesh for an existing condition entity.
 * Display-only; never mutates the source of truth.
 */
export function buildExistingEntityMesh(entity: ExistingConditionEntity): THREE.Mesh {
  const color = entityColor(entity.type);
  const material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });

  if (entity.type === "pipe" || entity.type === "underground") {
    // cylinder along the centerline
    const points = entity.geometry.points;
    if (points.length >= 2) {
      const p0 = points[0];
      const p1 = points[points.length - 1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dz = p1.z - p0.z;
      const length = Math.hypot(dx, dy, dz) || 1;
      const diameter = entity.geometry.diameter ?? 2;
      const cylinder = new THREE.CylinderGeometry(diameter / 2, diameter / 2, length, 12);
      const mesh = new THREE.Mesh(cylinder, material);
      const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2, z: (p0.z + p1.z) / 2 };
      mesh.position.set(mid.x, mid.z, -mid.y);
      mesh.rotation.x = Math.PI / 2;
      mesh.lookAt(p1.x, p1.z, -p1.y);
      return mesh;
    }
    // fallback to sphere
    const sphere = new THREE.SphereGeometry(2, 8, 8);
    return new THREE.Mesh(sphere, material);
  }

  // line/polygon: build a tube along the polyline
  const points = entity.geometry.points;
  if (points.length >= 2) {
    const curvePoints = points.map((p) => new THREE.Vector3(p.x, p.z, -p.y));
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeometry = new THREE.TubeGeometry(curve, Math.max(2, points.length - 1) * 4, entity.type === "river" ? 4 : 1.5, 8, false);
    return new THREE.Mesh(tubeGeometry, material);
  }

  // single point -> small marker
  const p = points[0];
  const box = new THREE.BoxGeometry(2, 4, 2);
  const mesh = new THREE.Mesh(box, material);
  mesh.position.set(p.x, p.z, -p.y);
  return mesh;
}

export function buildExistingSceneGroup(entities: readonly ExistingConditionEntity[]): THREE.Group {
  const group = new THREE.Group();
  for (const entity of entities) {
    try {
      const mesh = buildExistingEntityMesh(entity);
      mesh.name = `${entity.entityId}:${entity.label}`;
      group.add(mesh);
    } catch {
      // skip unbuildable entity
    }
  }
  return group;
}
