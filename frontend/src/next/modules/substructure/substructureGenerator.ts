/**
 * Substructure generation from Bridge Layout + Superstructure (Phase 6-02 WP-I).
 *
 * Builds a new SubstructureDocument from the current Bridge Layout (Phase 4
 * Support Handoff) + Superstructure (Phase 5 Bearing/Reaction Handoff) and
 * writes it to the PDC. Used by the UI "下部工を生成" flow.
 */

import type { ProjectManager } from "../../project/projectManager";
import { readBridgeLayoutDocument } from "../bridgeLayoutModuleAdapter";
import { buildSupportHandoff } from "../bridgeLayout/bridgeLayoutSupportHandoff";
import { readRoadAlignmentContext } from "../bridgeLayout/bridgeLayoutDomain";
import { readSuperstructureDocument } from "../superstructureModuleAdapter";

import { buildSubstructureDocument } from "./substructureDocumentDomain";
import { buildSupportPlacementFromHandoff } from "./substructurePhase4Adapter";
import { buildBearingReactionFromHandoff } from "./substructurePhase5Adapter";
import { writeSubstructureDocument } from "../substructureModuleAdapter";
import type { SubstructureDocument } from "./substructureTypes";

export type GenerateSubstructureResult =
  | { ok: true; document: SubstructureDocument }
  | { ok: false; issues: readonly { path: string; message: string }[] };

/**
 * Generate a new SubstructureDocument from the current Bridge Layout +
 * Superstructure. Fail-closed: Bridge Layout required; Superstructure optional
 * (bearing/reaction references only when available).
 */
export function generateSubstructureFromLayout(
  manager: ProjectManager,
  projectId: string,
): GenerateSubstructureResult {
  const layout = readBridgeLayoutDocument(manager, projectId);
  if (!layout || !layout.bridgeId || layout.bridgeRange.startStation >= layout.bridgeRange.endStation) {
    return { ok: false, issues: [{ path: "bridgeLayout", message: "Bridge Layout が未設定または無効です（先にBridge Layoutを保存してください）" }] };
  }
  const road = readRoadAlignmentContext(manager, projectId);
  if (!road.ok || !road.alignmentId) {
    return { ok: false, issues: [{ path: "road", message: "Road Module に有効な Alignment がありません（先に道路を保存してください）" }] };
  }
  const supportHandoff = buildSupportHandoff(manager, projectId, layout);
  if (!supportHandoff.ok) {
    return { ok: false, issues: [{ path: "supportHandoff", message: "Support Handoff を生成できませんでした（Bridge Layoutを確認してください）" }] };
  }

  // Phase 4 adapter
  const phase4 = buildSupportPlacementFromHandoff(supportHandoff.handoff, { alignmentId: road.alignmentId });

  // Phase 5 adapter reference (bearing/reaction seats attached in WP-K when a
  // GeometrySnapshot is available; superstructureDocumentReference is recorded).
  const superDoc = readSuperstructureDocument(manager, projectId);

  const built = buildSubstructureDocument({
    projectId,
    bridgeLayoutReference: {
      bridgeId: layout.bridgeId,
      moduleId: "bridgeLayout",
      documentVersion: layout.schemaVersion,
      layoutFingerprint: JSON.stringify({
        start: layout.bridgeRange.startStation,
        end: layout.bridgeRange.endStation,
        supports: [layout.abutments.A1.station, ...layout.piers.map((p) => p.station), layout.abutments.A2.station],
      }),
    },
    superstructureReference: superDoc
      ? { bridgeId: layout.bridgeId, moduleId: "superstructure", documentVersion: superDoc.schemaVersion, superstructureDocumentId: superDoc.documentId, handoffSchemaVersion: "1.0.0" }
      : { bridgeId: layout.bridgeId, moduleId: "superstructure", documentVersion: "0.1.0", superstructureDocumentId: "", handoffSchemaVersion: "1.0.0" },
    roadReference: {
      moduleId: "road",
      alignmentId: road.alignmentId,
      stationReferenceId: null,
      coordinatePolicyId: road.coordinatePolicyId,
    },
    supports: phase4.supports,
  });
  if (!built.ok) {
    return { ok: false, issues: built.issues };
  }

  const document = {
    ...built.document,
    supportReferences: phase4.supportReferences,
    bearingReactionReferences: null,
    bearingSeatReferences: [],
  };

  const write = writeSubstructureDocument(manager, projectId, document);
  if (!write.ok) {
    return { ok: false, issues: [{ path: "substructure", message: "SubstructureDocument を保存できませんでした（validation NG）" }] };
  }
  return { ok: true, document };
}
