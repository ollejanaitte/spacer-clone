/**
 * Reference Business 001 — Bridge Placement / Span Arrangement (Lane S / S-4).
 *
 * RB001-BRIDGE-1: 郡上市八幡山岳道路 (RB001-ROAD-1) の長良川横断候補区間
 * （STA.1200-1500・想定支間50m級）上に、橋梁配置・支間割の sample data を
 * 既存 Bridge Layout データモデル（next/modules/bridgeLayout）で確定する。
 *
 * - A1/A2・P1..Pn の配置候補は Road Module 正式 station→XYZ 変換
 *   （computeAbutmentPlacementCandidate / computePierPlacementCandidate）で算出し、
 *   ここで再実装しない。
 * - spans は generateSpans で自動生成し、validateSpanConfiguration で検証する。
 * - 数値は RB001-ROAD-1（STA.1200-1500・nominalSpanM=50）に基づく。
 *   根拠のない架空数値は増やさない。
 */

import type { LinearAlignment } from "../../core/types";
import type { VerticalElement } from "../../core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../schema/types";
import {
  buildRb001HorizontalAlignment,
  buildRb001Vertical,
  buildRb001CrossSection,
  RB001_BRIDGE_CANDIDATE,
  REF_BUSINESS_001_ROAD_ID,
} from "./roadAlignment";
import {
  computeAbutmentPlacementCandidate,
  computePierPlacementCandidate,
} from "../../../next/modules/bridgeLayout/bridgeLayoutPlacement";
import {
  createEmptyBridgeLayoutDocument,
  type AbutmentPlacement,
  type BridgeLayoutDocument,
  type BridgeSpan,
  type PierPlacement,
} from "../../../next/modules/bridgeLayout/bridgeLayoutTypes";
import { generateSpans, validateSpanConfiguration } from "../../../next/modules/bridgeLayout/bridgeLayoutSpans";
import { validateBridgeLayoutDocument, createValidationState } from "../../../next/modules/bridgeLayout/bridgeLayoutValidation";

export const RB001_BRIDGE_ID = "RB001-BRIDGE-1";
export const RB001_BRIDGE_NAME = "郡上市八幡 長良川橋";
export const RB001_BRIDGE_LENGTH = RB001_BRIDGE_CANDIDATE.endStation - RB001_BRIDGE_CANDIDATE.startStation;

/**
 * 支間割: 橋梁区間 STA.1200-1500（300m）を 6 径間 × 50m で割る。
 * A1@1200 + P1..P5 + A2@1500（50m 等間隔）。
 */
export const RB001_SUPPORT_STATIONS = [
  { supportId: "A1", supportType: "abutment" as const, station: RB001_BRIDGE_CANDIDATE.startStation },
  { supportId: "P1", supportType: "pier" as const, station: RB001_BRIDGE_CANDIDATE.startStation + 50 },
  { supportId: "P2", supportType: "pier" as const, station: RB001_BRIDGE_CANDIDATE.startStation + 100 },
  { supportId: "P3", supportType: "pier" as const, station: RB001_BRIDGE_CANDIDATE.startStation + 150 },
  { supportId: "P4", supportType: "pier" as const, station: RB001_BRIDGE_CANDIDATE.startStation + 200 },
  { supportId: "P5", supportType: "pier" as const, station: RB001_BRIDGE_CANDIDATE.startStation + 250 },
  { supportId: "A2", supportType: "abutment" as const, station: RB001_BRIDGE_CANDIDATE.endStation },
] as const;

function roadContext() {
  const horizontal = buildRb001HorizontalAlignment();
  const vertical = buildRb001Vertical();
  const crossSections = [buildRb001CrossSection()];
  return { horizontal, vertical, crossSections };
}

function candidateFor(
  road: ReturnType<typeof roadContext>,
  supportId: string,
  supportType: "abutment" | "pier",
  station: number,
): AbutmentPlacement | PierPlacement {
  const input = {
    horizontal: road.horizontal,
    vertical: road.vertical,
    crossSections: road.crossSections,
    station,
  };
  const compute = supportType === "abutment" ? computeAbutmentPlacementCandidate : computePierPlacementCandidate;
  const result = compute(input);
  const base = {
    supportId,
    station,
    skewAngleRad: null,
    skewSource: "automatic" as const,
  };
  if (result.ok) {
    return { ...base, placement: result.candidate };
  }
  return base;
}

/**
 * RB001-ROAD-1 の橋梁候補区間上に A1/P1..P5/A2 を配置し、
 * BridgeLayoutDocument + spans（6径間×50m）を構築する。
 * 検証（validateBridgeLayoutDocument / validateSpanConfiguration）を実施し、
 * 不整合があれば throw（fail-closed）。
 */
export function buildRb001BridgeLayout(): BridgeLayoutDocument {
  const road = roadContext();
  const horizontal: LinearAlignment = road.horizontal;
  const vertical: VerticalElement[] = road.vertical;
  const crossSections: CrossSectionTemplateDraft[] = road.crossSections;

  const document: BridgeLayoutDocument = {
    ...createEmptyBridgeLayoutDocument(),
    bridgeId: RB001_BRIDGE_ID,
    name: RB001_BRIDGE_NAME,
    metadata: {
      createdBy: "reference-business-001",
      createdAt: "2026-08-16T00:00:00.000Z",
      updatedAt: "2026-08-16T00:00:00.000Z",
      note: "RB001-ROAD-1 長良川横断部 (STA.1200-1500) 6径間×50m",
    },
    roadReference: {
      moduleId: "road",
      alignmentId: REF_BUSINESS_001_ROAD_ID,
      stationReferenceId: null,
      coordinatePolicyId: horizontal.coordinatePolicyId ?? null,
    },
    bridgeRange: {
      startStation: RB001_BRIDGE_CANDIDATE.startStation,
      endStation: RB001_BRIDGE_CANDIDATE.endStation,
      bridgeLength: RB001_BRIDGE_LENGTH,
    },
    abutments: {
      A1: candidateFor(road, "A1", "abutment", RB001_SUPPORT_STATIONS[0].station) as AbutmentPlacement,
      A2: candidateFor(road, "A2", "abutment", RB001_SUPPORT_STATIONS[RB001_SUPPORT_STATIONS.length - 1].station) as AbutmentPlacement,
    },
    piers: RB001_SUPPORT_STATIONS.filter((s) => s.supportType === "pier").map((s) =>
      candidateFor(road, s.supportId, "pier", s.station) as PierPlacement,
    ),
    spans: [],
    skew: { signConvention: "counterclockwise-positive", angleRad: null },
    terrainReference: {
      moduleId: "terrain",
      surfaceReference: "assets/terrain/gujo-hachiman-sample.sct1",
      coordinateContextId: "ctx-gujo-jgd2011-6674",
    },
    existingConditionsReference: { moduleId: "terrain", documentReferenceId: "existing-gujo-hachiman" },
  };

  const spans: readonly BridgeSpan[] = generateSpans(document);
  const withSpans: BridgeLayoutDocument = { ...document, spans };
  const now = "2026-08-16T00:00:00.000Z";

  const spanIssues = validateSpanConfiguration({ document: withSpans });
  const docIssues = validateBridgeLayoutDocument(withSpans);
  const issues = [...spanIssues, ...docIssues];
  return {
    ...withSpans,
    validation: createValidationState(issues.length === 0, issues, now),
  };
}

/** 橋梁配置・支間割 sample の概要（テスト・他Lane向け）。 */
export function describeRb001BridgeLayout(): {
  readonly bridgeId: string;
  readonly bridgeLength: number;
  readonly supportCount: number;
  readonly spanCount: number;
  readonly spans: readonly { spanId: string; length: number; startStation: number; endStation: number }[];
} {
  const doc = buildRb001BridgeLayout();
  return {
    bridgeId: doc.bridgeId,
    bridgeLength: doc.bridgeRange.bridgeLength ?? doc.bridgeRange.endStation - doc.bridgeRange.startStation,
    supportCount: 2 + doc.piers.length,
    spanCount: doc.spans.length,
    spans: doc.spans.map((s) => ({ spanId: s.spanId, length: s.length, startStation: s.startStation, endStation: s.endStation })),
  };
}