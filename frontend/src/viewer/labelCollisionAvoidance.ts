import * as THREE from "three";

export type LabelPriority = "selected" | "hovered" | "force" | "reaction" | "node" | "member";

const PRIORITY_ORDER: Record<LabelPriority, number> = {
  selected: 0,
  hovered: 1,
  force: 2,
  reaction: 3,
  node: 4,
  member: 5,
};

const MIN_GAP_PX = 4;

export type LabelCandidate = {
  object: THREE.Object3D;
  priority: LabelPriority;
  ownerId?: string;
  ownerType?: "node" | "member";
};

export function assignLabelPriority(
  object: THREE.Object3D,
  priority: LabelPriority,
  ownerId?: string,
  ownerType?: "node" | "member",
): void {
  object.userData = {
    ...object.userData,
    labelPriority: priority,
    labelPriorityRank: PRIORITY_ORDER[priority],
    ownerId,
    ownerType,
  };
}

export function cullOverlappingLabels(
  candidates: LabelCandidate[],
  camera: THREE.PerspectiveCamera,
  rendererSize: { width: number; height: number },
  selectedId?: string | null,
  hoveredId?: string | null,
): Set<THREE.Object3D> {
  const hidden = new Set<THREE.Object3D>();
  if (candidates.length === 0) return hidden;

  const projected: Array<{
    candidate: LabelCandidate;
    cx: number;
    cy: number;
    w: number;
    h: number;
    rank: number;
  }> = [];

  const halfW = rendererSize.width / 2;
  const halfH = rendererSize.height / 2;
  const tempVec = new THREE.Vector3();

  for (const candidate of candidates) {
    const pos = candidate.object.position;
    tempVec.copy(pos).project(camera);
    const cx = (tempVec.x * halfW) + halfW;
    const cy = (-tempVec.y * halfH) + halfH;
    if (tempVec.z > 1) {
      hidden.add(candidate.object);
      continue;
    }
    const scale = candidate.object.scale;
    const baseW = 120 * (scale.x || 1);
    const baseH = 30 * (scale.y || 1);
    const rank = PRIORITY_ORDER[candidate.priority];
    projected.push({ candidate, cx, cy, w: baseW, h: baseH, rank });
  }

  projected.sort((a, b) => a.rank - b.rank);

  const accepted: Array<{ cx: number; cy: number; w: number; h: number }> = [];

  for (const p of projected) {
    const isForced =
      p.candidate.priority === "selected" ||
      p.candidate.ownerId === selectedId ||
      p.candidate.ownerId === hoveredId;
    if (isForced) {
      accepted.push(p);
      continue;
    }
    const overlapsAccepted = accepted.some(
      (a) =>
        Math.abs(p.cx - a.cx) < (p.w + a.w) / 2 + MIN_GAP_PX &&
        Math.abs(p.cy - a.cy) < (p.h + a.h) / 2 + MIN_GAP_PX,
    );
    if (overlapsAccepted) {
      hidden.add(p.candidate.object);
    } else {
      accepted.push(p);
    }
  }

  return hidden;
}
