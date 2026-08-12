/**
 * Superstructure 3D scene builder (Phase 5-01 C-02 FROZEN / Phase 5-02 WP-C2).
 *
 * Builds the superstructure Three.js group from the GeometrySnapshot (the
 * frozen geometry authority). Uses the shared `domainToThree` render transform
 * ONLY (display responsibility; never mutates source of truth).
 *
 * ID rules (C-02):
 *  - mesh names: `super-girder-{girderId}` / `super-deck-{deckId}` /
 *    `super-xbeam-{crossBeamId}` / `super-brg-{seatId}`
 *  - selection IDs: `super:{entityId}`
 */

import * as THREE from "three";
import type { GeometrySnapshot } from "../../../apollo/geometry/types";
import { domainToThree, type RenderOrigin } from "../renderCoordinate";

export interface SuperstructureSceneBuildResult {
  readonly group: THREE.Group;
  readonly bounds: THREE.Box3;
  readonly meshCount: number;
}

function subtractOrigin(p: { x: number; y: number; z: number }, origin: RenderOrigin | null): { x: number; y: number; z: number } {
  return {
    x: p.x - (origin?.x ?? 0),
    y: p.y - (origin?.y ?? 0),
    z: p.z - (origin?.z ?? 0),
  };
}

function boxBetween(
  group: THREE.Group,
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  widthM: number,
  heightM: number,
  color: number,
  name: string,
  selectionId: string,
): void {
  // Axis-aligned box in domain coordinates between the two points.
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const cz = (a.z + b.z) / 2;
  const len = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), Math.abs(b.z - a.z), 0.5);
  const [tx, ty, tz] = domainToThree(subtractOrigin({ x: cx, y: cy, z: cz }, null));
  const geo = new THREE.BoxGeometry(len, heightM, widthM);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2 }));
  mesh.name = name;
  mesh.userData.selectionId = selectionId;
  mesh.position.set(tx, ty, tz);
  group.add(mesh);
}

const GIRDER_COLOR = 0x4a6fa5;
const DECK_COLOR = 0x9aa5b1;
const CROSS_BEAM_COLOR = 0x6b7d99;
const BEARING_COLOR = 0xd9a13a;

/** Build the superstructure scene group from a frozen GeometrySnapshot. */
export function buildSuperstructureSceneGroup(
  snapshot: GeometrySnapshot,
  options: { localOrigin?: RenderOrigin | null } = {},
): SuperstructureSceneBuildResult {
  const group = new THREE.Group();
  const origin = options.localOrigin ?? null;

  // Main girders: thin box along each girder line (MISSING section -> thin representation).
  for (const line of snapshot.girderLines) {
    const pts = line.points;
    if (pts.length === 0) continue;
    const first = pts[0].position;
    const last = pts[pts.length - 1].position;
    boxBetween(group, first, last, 0.6, 0.3, GIRDER_COLOR, `super-girder-${line.girderId}`, `super:${line.girderId}`);
  }

  // Deck: bounding box from the deck reference boundary.
  for (const deck of snapshot.deckReferences) {
    const boundary: readonly { x: number; y: number; z: number }[] = deck.boundary ?? [];
    if (boundary.length === 0) continue;
    const xs = boundary.map((p) => p.x);
    const ys = boundary.map((p) => p.y);
    const zs = boundary.map((p) => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const [tx, ty, tz] = domainToThree(subtractOrigin({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 }, origin));
    const geo = new THREE.BoxGeometry(maxX - minX, Math.max(maxZ - minZ, 0.05), maxY - minY);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: DECK_COLOR, roughness: 0.8, transparent: true, opacity: 0.7 }));
    mesh.name = `super-deck-${deck.deckId}`;
    mesh.userData.selectionId = `super:${deck.deckId}`;
    mesh.position.set(tx, ty, tz);
    group.add(mesh);
  }

  // Cross girders (cross beams): box at cross girder stations across the girder band.
  for (const cg of snapshot.crossGirderReferences) {
    const related = snapshot.girderLines.filter((g) => cg.connectedGirderIds.includes(g.girderId));
    if (related.length < 2) continue;
    const stationYs: number[] = [];
    let refZ = 0;
    for (const g of related) {
      const pt = g.points.find((p) => Math.abs((p.stationM ?? 0) - cg.stationM) < 1e-6);
      if (pt) {
        stationYs.push(pt.position.y);
        refZ = pt.position.z;
      }
    }
    if (stationYs.length < 2) continue;
    const minY = Math.min(...stationYs);
    const maxY = Math.max(...stationYs);
    const midY = (minY + maxY) / 2;
    boxBetween(group, { x: cg.stationM, y: midY, z: refZ }, { x: cg.stationM, y: midY, z: refZ }, maxY - minY, 0.3, CROSS_BEAM_COLOR, `super-xbeam-${cg.crossGirderId}`, `super:${cg.crossGirderId}`);
  }

  // Bearings: small markers at bearing points.
  for (const bp of snapshot.bearingPoints) {
    const [tx, ty, tz] = domainToThree(subtractOrigin(bp.position, origin));
    const geo = new THREE.BoxGeometry(0.3, 0.15, 0.3);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: BEARING_COLOR, roughness: 0.5 }));
    const seatId = `BRG-${bp.supportId}-${bp.girderId}`;
    mesh.name = `super-brg-${seatId}`;
    mesh.userData.selectionId = `super:${seatId}`;
    mesh.position.set(tx, ty + 0.1, tz);
    group.add(mesh);
  }

  const bounds = new THREE.Box3().setFromObject(group);
  return { group, bounds, meshCount: group.children.length };
}

/** Merge the superstructure group into an existing integrated group (mutates parent). */
export function addSuperstructureToScene(
  parent: THREE.Group,
  snapshot: GeometrySnapshot,
  options: { localOrigin?: RenderOrigin | null } = {},
): SuperstructureSceneBuildResult {
  const built = buildSuperstructureSceneGroup(snapshot, options);
  parent.add(built.group);
  return built;
}
