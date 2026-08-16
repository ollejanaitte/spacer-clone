/**
 * Reference Business 001 — Substructure Sample (Lane S / S-6).
 *
 * RB001-SUB-1: RB001-BRIDGE-1（郡上市八幡 長良川橋・6径間×50m）の下部工 sample。
 * 橋台 A1/A2・橋脚 P1..P5 を既存 SPACER 下部工データモデル
 * （next/modules/substructure）で作成する。下部工設計機能は再実装しない。
 *
 * 数値の根拠:
 * - 支点配置（supportId / station / skew）は S-4 Bridge Layout（RB001-BRIDGE-1）から派生。
 * - 柱・キャップ・フーチングは既存 substructure model.ts の型（PierData/AbutmentData/
 *   Footing/PileGroup/BearingSeat）と、既存 generator の配置ロジックに従う。
 * - terrain 参照は Lane T の郡上市八幡 terrainDocument（GUJO_SAMPLE_ASSET_PATH）を参照。
 * 根拠のない架空数値は増やさない。
 */

import { buildSubstructureDocument } from "../../../next/modules/substructure/substructureDocumentDomain";
import { buildSupportPlacementFromHandoff } from "../../../next/modules/substructure/substructurePhase4Adapter";
import { validateSubstructureDocument } from "../../../next/modules/substructure/substructureValidation";
import type {
  SubstructureDocument,
  SupportReferences,
  SupportHandoffItem,
  SubstructureSupport,
  FootingConfiguration,
  FoundationConfiguration,
  PileConfiguration,
} from "../../../next/modules/substructure/substructureTypes";
import type { PierData, AbutmentData, PierColumn, PierCap, PortalPierBeam } from "../../../substructure/model";
import {
  RB001_BRIDGE_ID,
  buildRb001BridgeLayout,
} from "./bridgeArrangement";
import {
  buildRb001HorizontalAlignment,
  REF_BUSINESS_001_ROAD_ID,
} from "./roadAlignment";
import { GUJO_COORDINATE_CONTEXT_ID, GUJO_SAMPLE_ASSET_PATH } from "../../../terrain/gujoSample";

export const RB001_SUB_ID = "RB001-SUB-1";

/** 既存 support model（substructure/model.ts）に合わせた支持列。 */
function buildSupportHandoffFromLayout(layout: ReturnType<typeof buildRb001BridgeLayout>): SupportReferences {
  const supports: readonly SupportHandoffItem[] = [
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

/** 郡上市八幡 橋脚 P1..P5（門型2柱・既存 PierData 型）。 */
function makePierData(index: number): PierData {
  const pierId = `P${index}`;
  const columns: PierColumn[] = [
    { id: `${pierId}-C1`, width: 1.2, depth: 1.5, height: 6.0, transverseOffset: -3.0 },
    { id: `${pierId}-C2`, width: 1.2, depth: 1.5, height: 6.0, transverseOffset: 3.0 },
  ];
  const cap: PierCap = { id: `${pierId}-CAP`, width: 2.2, depth: 8.6, height: 1.2, overhangL: 1.0, overhangR: 1.0 };
  const beam: PortalPierBeam = { id: `${pierId}-BEAM`, width: 1.2, depth: 8.6, height: 1.0, spanDirection: "transverse" };
  return {
    id: pierId,
    formType: "portal_frame",
    columns,
    beam,
    cap,
    footing: {
      id: `${pierId}-FT`,
      length: 8.6,
      width: 4.6,
      thickness: 1.5,
      topElevation: 300.0,
    },
    pileGroup: {
      id: `${pierId}-PG`,
      pileType: "bored_pile",
      diameter: 1.2,
      length: 15.0,
      pileCount: 4,
      spacing: { x: 3.0, y: 3.0 },
      rows: 2,
      cols: 2,
      edgeX: 1.5,
      edgeY: 1.5,
    },
  };
}

/** 郡上市八幡 橋台 A1/A2（逆T式・既存 AbutmentData 型）。 */
function makeAbutmentData(supportId: string): AbutmentData {
  return {
    id: supportId,
    formType: "inverted_t",
    backwall: {
      id: `${supportId}-BW`,
      height: 3.0,
      thickness: 0.8,
      width: 9.0,
      seatElevation: 310.0,
    },
    wingWallL: { id: `${supportId}-WWL`, length: 4.0, height: 3.0, thickness: 0.6 },
    wingWallR: { id: `${supportId}-WWR`, length: 4.0, height: 3.0, thickness: 0.6 },
    footing: {
      id: `${supportId}-FT`,
      length: 9.6,
      width: 5.6,
      thickness: 1.5,
      topElevation: 305.0,
    },
    pileGroup: {
      id: `${supportId}-PG`,
      pileType: "bored_pile",
      diameter: 1.2,
      length: 12.0,
      pileCount: 6,
      spacing: { x: 3.0, y: 3.0 },
      rows: 2,
      cols: 3,
      edgeX: 1.5,
      edgeY: 1.5,
    },
  };
}

/** Phase4 生成 supports に既存 PierData/AbutmentData を付与する。 */
function attachShapes(supports: SubstructureSupport[]): SubstructureSupport[] {
  return supports.map((s) => {
    if (s.supportType === "pier") {
      const index = Number(s.supportId.replace("P", ""));
      return { ...s, pier: makePierData(Number.isFinite(index) ? index : 1) };
    }
    return { ...s, abutment: makeAbutmentData(s.supportId) };
  });
}

/**
 * RB001-BRIDGE-1 の下部工 sample を構築する。
 * 既存 buildSupportPlacementFromHandoff（Phase 4 Adapter）で placement を生成し、
 * 既存 buildSubstructureDocument で DRAFT 文書を作成する。
 */
export function buildRb001Substructure(): SubstructureDocument {
  const layout = buildRb001BridgeLayout();
  const horizontal = buildRb001HorizontalAlignment();

  const supportHandoff = buildSupportHandoffFromLayout(layout);
  const phase4 = buildSupportPlacementFromHandoff(supportHandoff, { alignmentId: REF_BUSINESS_001_ROAD_ID });
  const supportsWithShapes = attachShapes(phase4.supports);

  const built = buildSubstructureDocument({
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
    superstructureReference: {
      bridgeId: RB001_BRIDGE_ID,
      moduleId: "superstructure",
      documentVersion: "0.1.0",
      superstructureDocumentId: "RB001-SUPER-1",
      handoffSchemaVersion: "1.0.0",
    },
    roadReference: {
      moduleId: "road",
      alignmentId: REF_BUSINESS_001_ROAD_ID,
      stationReferenceId: null,
      coordinatePolicyId: horizontal.coordinatePolicyId ?? null,
    },
    supports: supportsWithShapes,
    footingConfigurations: buildFootingConfigurations(),
    foundationConfigurations: buildFoundationConfigurations(),
    pileConfigurations: buildPileConfigurations(),
    terrainReferences: {
      moduleId: "terrain",
      surfaceReference: GUJO_SAMPLE_ASSET_PATH,
      coordinateContextId: GUJO_COORDINATE_CONTEXT_ID,
    },
    existingReferences: { moduleId: "existingConditions", documentReferenceId: "existing-gujo-hachiman" },
  });
  if (!built.ok) {
    throw new Error(`RB001-SUB-BUILD-FAILED: ${built.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
  }

  const document: SubstructureDocument = {
    ...built.document,
    supportReferences: phase4.supportReferences,
    bearingSeatReferences: [],
    bearingReactionReferences: null,
  };
  return document;
}

/** フーチング一覧（既存 FootingConfiguration 型・support 内 footing と一致）。 */
function buildFootingConfigurations(): FootingConfiguration[] {
  const entries = [
    { id: "A1-FT", length: 9.6, width: 5.6, thickness: 1.5, topElevation: 305.0 },
    { id: "A2-FT", length: 9.6, width: 5.6, thickness: 1.5, topElevation: 305.0 },
  ];
  for (let i = 1; i <= 5; i += 1) {
    entries.push({ id: `P${i}-FT`, length: 8.6, width: 4.6, thickness: 1.5, topElevation: 300.0 });
  }
  return entries;
}

/** 基礎形式一覧（既存 FoundationConfiguration 型）。 */
function buildFoundationConfigurations(): FoundationConfiguration[] {
  const entries: FoundationConfiguration[] = [
    { id: "A1-FND", formType: "piled", footingRefId: "A1-FT", pileGroupRefId: "A1-PG" },
    { id: "A2-FND", formType: "piled", footingRefId: "A2-FT", pileGroupRefId: "A2-PG" },
  ];
  for (let i = 1; i <= 5; i += 1) {
    entries.push({ id: `P${i}-FND`, formType: "piled", footingRefId: `P${i}-FT`, pileGroupRefId: `P${i}-PG` });
  }
  return entries;
}

/** 杭配置一覧（既存 PileConfiguration 型・support 内 pileGroup と一致）。 */
function buildPileConfigurations(): PileConfiguration[] {
  const entries: PileConfiguration[] = [
    { id: "A1-PG", pileType: "bored_pile", diameter: 1.2, length: 12.0, pileCount: 6, spacing: { x: 3.0, y: 3.0 }, rows: 2, cols: 3, edgeX: 1.5, edgeY: 1.5 },
    { id: "A2-PG", pileType: "bored_pile", diameter: 1.2, length: 12.0, pileCount: 6, spacing: { x: 3.0, y: 3.0 }, rows: 2, cols: 3, edgeX: 1.5, edgeY: 1.5 },
  ];
  for (let i = 1; i <= 5; i += 1) {
    entries.push({
      id: `P${i}-PG`,
      pileType: "bored_pile",
      diameter: 1.2,
      length: 15.0,
      pileCount: 4,
      spacing: { x: 3.0, y: 3.0 },
      rows: 2,
      cols: 2,
      edgeX: 1.5,
      edgeY: 1.5,
    });
  }
  return entries;
}

/** 下部工 sample の検証（既存 validator・fail-closed）。 */
export function validateRb001Substructure(doc: SubstructureDocument): readonly { path: string; message: string }[] {
  return validateSubstructureDocument(doc);
}

/** 下部工 sample の概要（テスト・他Lane向け）。 */
export function describeRb001Substructure(): {
  readonly documentId: string;
  readonly supportCount: number;
  readonly supports: readonly { supportId: string; supportType: string; station: number }[];
} {
  const doc = buildRb001Substructure();
  return {
    documentId: doc.documentId,
    supportCount: doc.supports.length,
    supports: doc.supports.map((s) => ({
      supportId: s.supportId,
      supportType: s.supportType,
      station: (s.placement as { station?: number }).station ?? 0,
    })),
  };
}