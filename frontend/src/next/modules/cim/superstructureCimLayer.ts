/**
 * Superstructure + Bearing CIM layers (Phase 8-02 WP-E/G).
 *
 * Regenerates the superstructure GeometrySnapshot from the canonical
 * SuperstructureDocument + Road alignment and renders the girders / deck /
 * cross beams. The bearing layer renders real-dimension bearing solids at the
 * snapshot bearing points, oriented by the bearing local frame.
 */

import * as THREE from "three";
import type { ProjectManager } from "../../project/projectManager";
import { readSuperstructureDocument } from "../superstructureModuleAdapter";
import { buildLinerIntermediateFromRoad, generateSuperstructureSnapshot } from "../superstructure/superstructureGeometry";
import { buildSuperstructureSceneGroup } from "../superstructure/superstructureSceneBuilder";
import { regenerateSuperstructureDerived } from "../superstructure/superstructurePersistence";
import { readRoadData } from "../roadModuleAdapter";
import { loadRoadEditorDraft } from "../road/roadEditorDraft";
import { verticalDraftAlignmentToElements } from "../road/verticalDraftBridge";
import { domainToThree } from "../renderCoordinate";
import { attachCimMetadata, type CimEntityMetadata } from "./integrated3dScene";

export interface SuperstructureCimLayerResult {
  readonly superstructureGroup: THREE.Group;
  readonly bearingGroup: THREE.Group;
  readonly metadata: readonly CimEntityMetadata[];
  readonly ok: boolean;
  readonly issues: readonly { path: string; message: string }[];
}

function subtractOrigin(p: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  return { x: p.x, y: p.y, z: p.z };
}

const BEARING_DIMENSIONS = { x: 0.5, y: 0.25, z: 0.35 };
const BEARING_COLOR = 0xd9a13a;
const FIXED_COLOR = 0xb45309;
const MOVABLE_COLOR = 0x64748b;

function bearingColor(seatType: string | null | undefined): number {
  if (seatType === "fixed") return FIXED_COLOR;
  if (seatType === "movable") return MOVABLE_COLOR;
  return BEARING_COLOR;
}

export function buildSuperstructureCimLayer(
  manager: ProjectManager,
  projectId: string,
): SuperstructureCimLayerResult {
  const superDoc = readSuperstructureDocument(manager, projectId);
  const superstructureGroup = new THREE.Group();
  const bearingGroup = new THREE.Group();
  const metadata: CimEntityMetadata[] = [];

  if (!superDoc) {
    return { superstructureGroup, bearingGroup, metadata, ok: true, issues: [] };
  }

  const roadData = readRoadData(manager, projectId);
  if (!roadData) {
    return {
      superstructureGroup, bearingGroup, metadata,
      ok: false,
      issues: [{ path: "superstructure.roadReference", message: "road data required for superstructure geometry" }],
    };
  }
  const loaded = loadRoadEditorDraft(roadData);
  if (!loaded.ok) {
    return {
      superstructureGroup, bearingGroup, metadata,
      ok: false,
      issues: [{ path: "superstructure.roadReference", message: "cannot build road draft" }],
    };
  }
  const draft = loaded.draft;
  const roadInputs = {
    label: "",
    horizontal: draft.alignment,
    vertical: verticalDraftAlignmentToElements(draft.verticalAlignment),
    crossSections: draft.crossSections ?? [],
  };
  const intermediate = buildLinerIntermediateFromRoad(roadInputs as never);
  if (!intermediate) {
    return {
      superstructureGroup, bearingGroup, metadata,
      ok: false,
      issues: [{ path: "superstructure.roadReference", message: "cannot build liner intermediate" }],
    };
  }

  const generated = generateSuperstructureSnapshot(intermediate, regenerateSuperstructureDerived(manager, projectId, superDoc));
  if (!generated.ok) {
    return {
      superstructureGroup, bearingGroup, metadata,
      ok: false,
      issues: generated.issues,
    };
  }
  const snapshot = generated.snapshot;

  const built = buildSuperstructureSceneGroup(snapshot, { localOrigin: null });
  for (const mesh of built.group.children as THREE.Mesh[]) {
    const selectionId = mesh.userData.selectionId as string | undefined;
    const sourceId = selectionId?.replace(/^super:/, "") ?? mesh.name;
    attachCimMetadata(mesh, {
      sourceModule: "superstructure",
      sourceEntityId: sourceId,
      stableId: selectionId ?? `super:${sourceId}`,
      coordinateContext: "world",
      label: sourceId,
    });
    metadata.push({
      sourceModule: "superstructure",
      sourceEntityId: sourceId,
      stableId: selectionId ?? `super:${sourceId}`,
      coordinateContext: "world",
      label: sourceId,
    });
  }
  superstructureGroup.add(built.group);

  // Bearing solids (real dimensions + orientation from the bearing local frame).
    const seatTypeById = new Map<string, string | null | undefined>(
      (superDoc.bearingConfiguration.bearingSeats ?? []).map((s) => [s.seatId, s.bearingType] as const),
    );
    for (const bp of snapshot.bearingPoints) {
      const seatId = `BRG-${bp.supportId}-${bp.girderId}`;
      const [tx, ty, tz] = domainToThree(subtractOrigin(bp.position));
      const geo = new THREE.BoxGeometry(
        BEARING_DIMENSIONS.x,
        BEARING_DIMENSIONS.z,
        BEARING_DIMENSIONS.y,
      );
      const material = new THREE.MeshStandardMaterial({
        color: bearingColor(seatTypeById.get(seatId)),
        roughness: 0.5,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(tx, ty + BEARING_DIMENSIONS.z / 2, tz);
      // Orient the bearing along the local frame (tangent/normal/binormal).
      if (bp.localFrame) {
        const f = bp.localFrame;
        const toThree = (v: { x: number; y: number; z: number }) =>
          new THREE.Vector3(v.x, v.z, -v.y).normalize();
        const tangent = toThree(f.tangent);
        const binormal = toThree(f.binormal);
        const normal = toThree(f.normal);
        mesh.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(tangent, binormal, normal),
        );
      }
    const bearingMeta: CimEntityMetadata = {
      sourceModule: "bearing",
      sourceEntityId: seatId,
      stableId: `bearing:${seatId}`,
      coordinateContext: "world",
      label: seatId,
      meta: {
        supportId: bp.supportId,
        girderId: bp.girderId,
        bearingType: seatTypeById.get(seatId) ?? null,
      },
    };
    attachCimMetadata(mesh, bearingMeta);
    mesh.name = `super-brg-${seatId}`;
    bearingGroup.add(mesh);
    metadata.push(bearingMeta);
  }

  return { superstructureGroup, bearingGroup, metadata, ok: true, issues: [] };
}
