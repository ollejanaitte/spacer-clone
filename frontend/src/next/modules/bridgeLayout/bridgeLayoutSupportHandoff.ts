import type { ProjectManager } from "../../project/projectManager";
import type {
  BridgeLayoutDocument,
  BridgeLayoutIssue,
  ExistingConditionsReference,
  RoadReference,
  TerrainReference,
} from "./bridgeLayoutTypes";
import { listOrderedSupports } from "./bridgeLayoutPiers";
import { readRoadAlignmentContext } from "./bridgeLayoutDomain";
import { computePierPlacementCandidate, lookupTerrainElevation, getProjectTerrainGrid } from "./bridgeLayoutPlacement";
import { resolveBridgeLayoutReferences } from "./bridgeLayoutReferences";

/**
 * Phase 4-04 Support Handoff Contract（Phase 5下部工へ渡す正式配置情報）.
 *
 * BridgeLayoutDocument が唯一正本。本Handoffは ID/reference + derived snapshot
 * であり、正本データを二重保持しない。
 * 下部工側で初めて決定する情報（柱形状・梁・フーチング・杭・基礎設計・耐震等）は含めない。
 */
export const SUPPORT_HANDOFF_SCHEMA_VERSION = "1.0.0" as const;

export interface SupportHandoffItem {
  readonly supportId: string;
  readonly supportType: "abutment" | "pier";
  readonly label: string;
  readonly station: number;
  readonly position: { readonly domainX: number; readonly domainY: number; readonly elevation: number };
  readonly tangentAzimuthRad: number;
  readonly skewAngleRad: number | null;
  readonly skewSource?: "automatic" | "user";
  readonly terrainElevation: number | null;
  readonly roadReferenceId: string;
  readonly coordinateContextId: string | null;
}

export interface SupportHandoff {
  readonly handoffKind: "support-handoff";
  readonly schemaVersion: string;
  readonly handoffId: string;
  readonly bridgeId: string;
  /** 正本参照（複製しない） */
  readonly documentReference: string;
  readonly generatedAt: string;
  readonly roadReference: RoadReference;
  readonly terrainReference: TerrainReference;
  readonly existingConditionsReference: ExistingConditionsReference;
  readonly coordinateContext: {
    readonly coordinatePolicyId: string | null;
    readonly axisConvention: "x-along/y-transverse/z-up";
    readonly unitSystem: "metric";
  };
  readonly skewConvention: "counterclockwise-positive";
  readonly supports: readonly SupportHandoffItem[];
  readonly validation: { readonly ok: boolean; readonly issues: readonly BridgeLayoutIssue[] };
}

export type SupportHandoffResult =
  | { ok: true; handoff: SupportHandoff }
  | { ok: false; issues: readonly BridgeLayoutIssue[] };

/** A1/P1..Pn/A2 を station 順に並べた Support Handoff を生成する（derived）。 */
export function buildSupportHandoff(
  manager: ProjectManager,
  projectId: string,
  document: BridgeLayoutDocument,
): SupportHandoffResult {
  const issues: BridgeLayoutIssue[] = [];
  const road = readRoadAlignmentContext(manager, projectId);
  const references = resolveBridgeLayoutReferences(manager, projectId, document);
  if (!references.ok) {
    issues.push(...references.issues);
  }
  if (!road.ok) {
    issues.push(...road.issues.map((i) => ({ path: i.path, message: i.message })));
  }

  const grid = getProjectTerrainGrid(manager, projectId);
  const supports = listOrderedSupports(document);
  const items: SupportHandoffItem[] = [];
  const horizontal = road.horizontal;

  const seen = new Set<string>();
  for (const support of supports) {
    if (seen.has(support.supportId)) {
      issues.push({ path: `supportHandoff.supports`, message: `duplicate supportId: ${support.supportId}` });
    }
    seen.add(support.supportId);

    if (typeof support.station !== "number" || !Number.isFinite(support.station)) {
      issues.push({ path: `supportHandoff.supports[${support.supportId}].station`, message: "station must be a finite number" });
      continue;
    }
    if (!horizontal) {
      issues.push({ path: `supportHandoff.supports[${support.supportId}]`, message: `road alignment is unavailable` });
      continue;
    }

    const placement = computePierPlacementCandidate({
      horizontal,
      vertical: road.vertical,
      crossSections: road.crossSections,
      station: support.station,
    });
    if (!placement.ok) {
      issues.push({ path: `supportHandoff.supports[${support.supportId}]`, message: `could not evaluate station ${support.station} on the road alignment` });
      continue;
    }

    const documentSupport = support.kind === "abutment"
      ? (support.supportId === "A1" ? document.abutments.A1 : document.abutments.A2)
      : document.piers.find((p) => p.supportId === support.supportId);
    const skewAngleRad = documentSupport ? (documentSupport.skewAngleRad ?? null) : null;
    const skewSource = documentSupport && "skewSource" in documentSupport
      ? (documentSupport as { skewSource?: "automatic" | "user" }).skewSource
      : undefined;

    const terrainElevation = lookupTerrainElevation(grid, placement.candidate.domainX, placement.candidate.domainY);
    items.push({
      supportId: support.supportId,
      supportType: support.kind,
      label: support.label,
      station: support.station,
      position: {
        domainX: placement.candidate.domainX,
        domainY: placement.candidate.domainY,
        elevation: placement.candidate.elevation,
      },
      tangentAzimuthRad: placement.candidate.tangentAzimuthRad,
      skewAngleRad,
      skewSource,
      terrainElevation,
      roadReferenceId: placement.candidate.roadReferenceId,
      coordinateContextId: placement.candidate.coordinateContextId,
    });
  }

  // ordering check (A1 < P1 < ... < Pn < A2)
  for (let i = 1; i < items.length; i += 1) {
    if (items[i].station <= items[i - 1].station) {
      issues.push({ path: "supportHandoff.supports", message: `station order violation: ${items[i - 1].supportId}@${items[i - 1].station} >= ${items[i].supportId}@${items[i].station}` });
    }
  }

  const handoff: SupportHandoff = {
    handoffKind: "support-handoff",
    schemaVersion: SUPPORT_HANDOFF_SCHEMA_VERSION,
    handoffId: `SH-${document.bridgeId}`,
    bridgeId: document.bridgeId,
    documentReference: document.bridgeId,
    generatedAt: new Date().toISOString(),
    roadReference: document.roadReference,
    terrainReference: document.terrainReference,
    existingConditionsReference: document.existingConditionsReference,
    coordinateContext: {
      coordinatePolicyId: road.coordinatePolicyId,
      axisConvention: "x-along/y-transverse/z-up",
      unitSystem: "metric",
    },
    skewConvention: "counterclockwise-positive",
    supports: items,
    validation: { ok: issues.length === 0, issues },
  };

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, handoff };
}
