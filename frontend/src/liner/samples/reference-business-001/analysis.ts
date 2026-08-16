/**
 * Reference Business 001 — Analysis Sample (Lane S / S-7).
 *
 * RB001-ANL-1: RB001-BRIDGE-1（郡上市八幡 長良川橋・6径間×50m・連続桁）の
 * 解析入力 sample。既存解析系（next/modules/analysis）へ接続する。
 * 上部工（S-5 RB001-SUPER-1）・下部工（S-6 RB001-SUB-1）・支承・支間割と整合を取り、
 * 既存 geometry engine + analysis model を再利用する。架空の解析結果を作らない。
 *
 * 数値の根拠:
 * - nodes/members/bearings/supports は既存 superstructureAnalysisAdapter /
 *   substructureAdapter / bearingSpring の出力（BuildAnalysisModel）。
 * - GeometrySnapshot は既存 DefaultGeometryEngine（superstructureGeometry の
 *   generateSuperstructureSnapshot）で生成。
 * - loads / boundary conditions は既存 loadModel / analysisModel の契約範囲のみ。
 *   解析実行 (RUN) は行わない（analysisStatus=NOT_RUN を維持）。
 */

import { buildAnalysisModel } from "../../../next/modules/analysis/analysisModel";
import type { AnalysisDocument } from "../../../next/modules/analysis/analysisDocumentTypes";
import {
  generateSuperstructureSnapshot,
  buildLinerIntermediateFromRoad,
} from "../../../next/modules/superstructure/superstructureGeometry";
import { buildRb001Superstructure } from "./superstructure";
import { buildRb001Substructure } from "./substructure";
import {
  buildRb001HorizontalAlignment,
  buildRb001Vertical,
  buildRb001CrossSection,
  REF_BUSINESS_001_ROAD_ID,
} from "./roadAlignment";
import { RB001_BRIDGE_ID } from "./bridgeArrangement";
import { buildGujoSampleProject } from "../../../terrain";
import { computeAnalysisSha256Hex } from "../../../next/modules/analysis/analysisChecksum";

export const RB001_ANALYSIS_DOCUMENT_ID = "RB001-ANL-1";

export interface Rb001AnalysisSampleResult {
  readonly ok: boolean;
  readonly document: AnalysisDocument;
  readonly issues: readonly { path: string; message: string }[];
}

/**
 * RB001 の解析入力 sample を構築する。
 * 上部工 + 下部工 + GeometrySnapshot を既存 buildAnalysisModel へ渡す。
 * 解析実行は行わない（NOT_RUN）。
 */
export function buildRb001Analysis(): Rb001AnalysisSampleResult {
  const superstructure = buildRb001Superstructure();
  const substructure = buildRb001Substructure();
  const gujo = buildGujoSampleProject();

  const intermediate = buildLinerIntermediateFromRoad({
    horizontal: buildRb001HorizontalAlignment(),
    vertical: buildRb001Vertical(),
    crossSections: [buildRb001CrossSection()],
  });
  if (intermediate === undefined) {
    return {
      ok: false,
      document: null as never,
      issues: [{ path: "road", message: "failed to build Liner intermediate from RB001 road" }],
    };
  }
  const snapshotResult = generateSuperstructureSnapshot(intermediate, superstructure);
  if (!snapshotResult.ok) {
    return {
      ok: false,
      document: null as never,
      issues: snapshotResult.issues,
    };
  }
  const { snapshot } = snapshotResult;

  const result = buildAnalysisModel({
    projectId: gujo.projectId,
    createdBy: "reference-business-001",
    superstructure,
    substructure,
    snapshot,
    sourceReferences: {
      bridgeLayout: {
        bridgeId: RB001_BRIDGE_ID,
        documentVersion: superstructure.bridgeLayoutReference?.documentVersion ?? "1",
        layoutFingerprint: superstructure.bridgeLayoutReference?.layoutFingerprint ?? "",
      },
      superstructure: {
        superstructureDocumentId: superstructure.documentId,
        documentVersion: String(superstructure.revisionId),
        dataFingerprint: computeAnalysisSha256Hex(superstructure),
        geometrySnapshotFingerprint: snapshot.fingerprint,
      },
      substructure: {
        substructureDocumentId: substructure.documentId,
        documentVersion: String(substructure.revisionId),
        dataFingerprint: computeAnalysisSha256Hex(substructure),
      },
      loadFingerprint: computeAnalysisSha256Hex("RB001-loads"),
      solverSettingsFingerprint: computeAnalysisSha256Hex("RB001-solver"),
    },
  });

  return {
    ok: result.ok,
    document: result.document,
    issues: result.issues,
  };
}

/** RB001 解析 sample の概要（テスト・他Lane向け）。 */
export function describeRb001Analysis(): {
  readonly documentId: string;
  readonly analysisStatus: string;
  readonly nodeCount: number;
  readonly memberCount: number;
  readonly supportCount: number;
  readonly bearingCount: number;
  readonly validationOk: boolean;
} {
  const { ok, document, issues } = buildRb001Analysis();
  return {
    documentId: document.documentId ?? RB001_ANALYSIS_DOCUMENT_ID,
    analysisStatus: document.analysisStatus,
    nodeCount: document.nodes.length,
    memberCount: document.members.length,
    supportCount: document.supports.length,
    bearingCount: document.bearings.length,
    validationOk: ok && issues.length === 0,
  };
}

export { REF_BUSINESS_001_ROAD_ID };