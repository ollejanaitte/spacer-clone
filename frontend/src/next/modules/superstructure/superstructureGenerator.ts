/**
 * Superstructure generation from Bridge Layout (Phase 5-02 WP-J E2E).
 *
 * Builds a new SuperstructureDocument from the current Bridge Layout + default
 * superstructure inputs (2 plate girders, spacing 8 m, RC deck 0.24 m) and
 * writes it to the PDC. Used by the UI "上部工を生成" flow and the E2E vertical.
 */

import type { ProjectManager } from "../../project/projectManager";
import { readBridgeLayoutDocument } from "../bridgeLayoutModuleAdapter";
import { buildSpanHandoff } from "../bridgeLayout/bridgeLayoutSpanHandoff";
import { buildSupportHandoff } from "../bridgeLayout/bridgeLayoutSupportHandoff";
import { readRoadAlignmentContext } from "../bridgeLayout/bridgeLayoutDomain";
import { buildSuperstructureDocument, attachSuperstructureHandoffs } from "./superstructureDocumentDomain";
import { writeSuperstructureDocument } from "../superstructureModuleAdapter";
import type { SuperstructureDocument } from "./superstructureTypes";

export type GenerateSuperstructureResult =
  | { ok: true; document: SuperstructureDocument }
  | { ok: false; issues: readonly { path: string; message: string }[] };

const DEFAULT_GIRDER_SPACING = 8;
const DEFAULT_DECK_THICKNESS = 0.24;
const DEFAULT_DECK_UNIT_WEIGHT = 24.5;

/**
 * Generate a new SuperstructureDocument from the current Bridge Layout.
 * Fail-closed: Bridge Layout must be set with a valid range.
 */
export function generateSuperstructureFromLayout(
  manager: ProjectManager,
  projectId: string,
): GenerateSuperstructureResult {
  const layout = readBridgeLayoutDocument(manager, projectId);
  if (!layout || !layout.bridgeId || layout.bridgeRange.startStation >= layout.bridgeRange.endStation) {
    return { ok: false, issues: [{ path: "bridgeLayout", message: "Bridge Layout が未設定または無効です（先にBridge Layoutを保存してください）" }] };
  }
  const road = readRoadAlignmentContext(manager, projectId);
  if (!road.ok || !road.alignmentId) {
    return { ok: false, issues: [{ path: "road", message: "Road Module に有効な Alignment がありません（先に道路を保存してください）" }] };
  }
  const spanHandoff = buildSpanHandoff(manager, projectId, layout);
  const supportHandoff = buildSupportHandoff(manager, projectId, layout);
  if (!spanHandoff.ok || !supportHandoff.ok) {
    return { ok: false, issues: [{ path: "handoff", message: "Span/Support Handoff を生成できませんでした（Bridge Layoutを確認してください）" }] };
  }
  const spanCount = spanHandoff.handoff.spans.length;
  const bridgeSystem = spanCount >= 2 ? "CONTINUOUS" : "SIMPLE_SINGLE";
  const spanSystem = bridgeSystem === "CONTINUOUS" ? "continuous" : "simple";

  const built = buildSuperstructureDocument({
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
    roadReference: {
      moduleId: "road",
      alignmentId: road.alignmentId,
      stationReferenceId: null,
      coordinatePolicyId: road.coordinatePolicyId,
    },
    structuralSystem: { spanSystem, bridgeSystem },
    girderConfiguration: {
      girderCount: 2,
      girderSpacingM: DEFAULT_GIRDER_SPACING,
      girderLines: [] as never[],
      girderSectionModel: { depthM: null, webThicknessM: null, topFlange: null, bottomFlange: null, areaM2: null, unitWeightPerM: null },
    },
    deckConfiguration: {
      deckId: "DECK-1",
      deckKind: "rc_non_composite",
      thicknessM: DEFAULT_DECK_THICKNESS,
      unitWeight: DEFAULT_DECK_UNIT_WEIGHT,
      overhangLeftM: 0.5,
      overhangRightM: 0.5,
      resolvedWidthM: null,
    },
  });
  if (!built.ok) {
    return { ok: false, issues: built.issues };
  }

  const document = attachSuperstructureHandoffs(
    built.document,
    spanHandoff.handoff,
    supportHandoff.handoff,
  );

  const write = writeSuperstructureDocument(manager, projectId, document);
  if (!write.ok) {
    return { ok: false, issues: [{ path: "superstructure", message: "SuperstructureDocument を保存できませんでした（validation NG）" }] };
  }
  return { ok: true, document };
}
