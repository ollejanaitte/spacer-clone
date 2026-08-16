/**
 * Reference Business 001 — Superstructure Sample (Lane S / S-5).
 *
 * RB001-SUPER-1: RB001-BRIDGE-1（郡上市八幡 長良川橋・6径間×50m・連続桁）の
 * 上部工 sample。既存 SPACER 上部工データモデル（next/modules/superstructure）と
 * 既存 generator 既定値（2主桁・RC床版・spacing 8m・厚0.24m）を再利用して作成する。
 * 本 Lane で上部工設計機能を再実装しない。
 *
 * 数値の根拠:
 * - 主桁2本は既存 generator 既定（girderCount=2, spacing 8m）。
 * - 床版厚 0.24m・unitWeight 24.5 は既存 generator 既定値。
 * - 連続桁システムは spanCount>=2 で CONTINUOUS（generator と同一ロジック）。
 * 根拠のない架空数値は増やさない。
 */

import {
  buildSuperstructureDocument,
  attachSuperstructureHandoffs,
} from "../../../next/modules/superstructure/superstructureDocumentDomain";
import { validateSuperstructureDocument } from "../../../next/modules/superstructure/superstructureValidation";
import type { SuperstructureDocument, SpanReferences, SupportReferences } from "../../../next/modules/superstructure/superstructureTypes";
import {
  RB001_BRIDGE_ID,
  buildRb001BridgeLayout,
} from "./bridgeArrangement";
import {
  buildRb001HorizontalAlignment,
  REF_BUSINESS_001_ROAD_ID,
} from "./roadAlignment";
import { buildBearingConfiguration } from "../../../next/modules/superstructure/superstructureComponents";
import { GUJO_COORDINATE_CONTEXT_ID } from "../../../terrain/gujoSample";

export const RB001_SUPER_ID = "RB001-SUPER-1";

const DEFAULT_GIRDER_SPACING = 8;
const DEFAULT_DECK_THICKNESS = 0.24;
const DEFAULT_DECK_UNIT_WEIGHT = 24.5;

/**
 * RB001-BRIDGE-1 の上部工 sample を構築する。
 * Bridge Layout（S-4）から Span/Support Handoff（derived）を生成し、
 * 既存 buildSuperstructureDocument で DRAFT 文書を作成する。
 */
export function buildRb001Superstructure(): SuperstructureDocument {
  const layout = buildRb001BridgeLayout();
  const horizontal = buildRb001HorizontalAlignment();

  const spanHandoff: SpanReferences = buildSpanHandoffFromLayout(layout);
  const supportHandoff: SupportReferences = buildSupportHandoffFromLayout(layout);

  const spanCount = spanHandoff.spans.length;
  const bridgeSystem = spanCount >= 2 ? "CONTINUOUS" : "SIMPLE_SINGLE";
  const spanSystem = bridgeSystem === "CONTINUOUS" ? "continuous" : "simple";

  const built = buildSuperstructureDocument({
    projectId: "RB001",
    bridgeLayoutReference: {
      bridgeId: RB001_BRIDGE_ID,
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
      alignmentId: REF_BUSINESS_001_ROAD_ID,
      stationReferenceId: null,
      coordinatePolicyId: horizontal.coordinatePolicyId ?? null,
    },
    structuralSystem: { spanSystem, bridgeSystem },
    girderConfiguration: {
      girderCount: 2,
      girderSpacingM: DEFAULT_GIRDER_SPACING,
      girderLines: [] as never[],
      girderSectionModel: { depthM: null, webThicknessM: null, topFlange: null, bottomFlange: null, areaM2: null, unitWeightPerM: null },
    },
    deckConfiguration: {
      deckId: "DECK-RB001",
      deckKind: "rc_non_composite",
      thicknessM: DEFAULT_DECK_THICKNESS,
      unitWeight: DEFAULT_DECK_UNIT_WEIGHT,
      overhangLeftM: 0.5,
      overhangRightM: 0.5,
      resolvedWidthM: 9.0,
    },
  });
  if (!built.ok) {
    throw new Error(`RB001-SUPER-BUILD-FAILED: ${built.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
  }

  const supports = supportHandoff.supports.map((sp) => ({
    supportId: sp.supportId,
    station: sp.station,
    supportType: sp.supportType,
  }));
  const girderIds = built.document.girderConfiguration.girderLines.map((l) => l.girderId);
  const bearingConfiguration = buildBearingConfiguration(supports, girderIds);

  const withBearings = {
    ...built.document,
    bearingConfiguration,
  };

  return attachSuperstructureHandoffs(withBearings, spanHandoff, supportHandoff);
}

/** Span Handoff を Bridge Layout から派生させる（正本複製ではなく derived view）。 */
function buildSpanHandoffFromLayout(layout: ReturnType<typeof buildRb001BridgeLayout>): SpanReferences {
  const skewById = new Map<string, number | null>([
    [layout.abutments.A1.supportId, layout.abutments.A1.skewAngleRad],
    [layout.abutments.A2.supportId, layout.abutments.A2.skewAngleRad],
    ...layout.piers.map((p) => [p.supportId, p.skewAngleRad] as const),
  ]);
  return {
    handoffId: `SH-SPAN-${RB001_BRIDGE_ID}`,
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-16T00:00:00.000Z",
    spans: layout.spans.map((s) => ({
      spanId: s.spanId,
      index: s.index,
      startSupportId: s.startSupportId,
      endSupportId: s.endSupportId,
      startStation: s.startStation,
      endStation: s.endStation,
      spanLength: s.length,
      startSupportSkew: skewById.get(s.startSupportId) ?? null,
      endSupportSkew: skewById.get(s.endSupportId) ?? null,
    })),
  };
}

/** Support Handoff を Bridge Layout から派生させる（正本複製ではなく derived view）。 */
function buildSupportHandoffFromLayout(layout: ReturnType<typeof buildRb001BridgeLayout>): SupportReferences {
  const supports = [
    layout.abutments.A1,
    ...layout.piers,
    layout.abutments.A2,
  ].sort((a, b) => a.station - b.station).map((s) => ({
    supportId: s.supportId,
    supportType: s.supportId.startsWith("A") ? "abutment" as const : "pier" as const,
    label: s.supportId,
    station: s.station,
    position: s.placement
      ? { domainX: s.placement.domainX, domainY: s.placement.domainY, elevation: s.placement.elevation }
      : { domainX: s.station, domainY: 0, elevation: 0 },
    tangentAzimuthRad: s.placement?.tangentAzimuthRad ?? 0,
    skewAngleRad: s.skewAngleRad ?? 0,
    terrainElevation: s.placement?.terrainElevation ?? null,
    roadReferenceId: REF_BUSINESS_001_ROAD_ID,
    coordinateContextId: GUJO_COORDINATE_CONTEXT_ID,
  }));
  return {
    handoffId: `SH-SUP-${RB001_BRIDGE_ID}`,
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-16T00:00:00.000Z",
    supports,
  };
}

/** 上部工 sample の検証（既存 validator・fail-closed）。 */
export function validateRb001Superstructure(doc: SuperstructureDocument): readonly { path: string; message: string }[] {
  return validateSuperstructureDocument(doc);
}

/** 上部工 sample の概要（テスト・他Lane向け）。 */
export function describeRb001Superstructure(): {
  readonly documentId: string;
  readonly superstructureType: string;
  readonly structuralSystem: string;
  readonly girderCount: number;
  readonly deckWidthM: number | null;
} {
  const doc = buildRb001Superstructure();
  return {
    documentId: doc.documentId,
    superstructureType: doc.superstructureType,
    structuralSystem: doc.structuralSystem.bridgeSystem,
    girderCount: doc.girderConfiguration.girderCount,
    deckWidthM: doc.deckConfiguration.resolvedWidthM,
  };
}