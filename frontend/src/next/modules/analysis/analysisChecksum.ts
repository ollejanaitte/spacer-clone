/**
 * AnalysisDocument checksums (Phase 7-01 A §4b FROZEN / Sol review #1/#2).
 *
 * contentChecksum / modelChecksum scope:
 *   sourceReferences (fingerprints) + coordinateContext + unitContext +
 *   FEM model (nodes/members/materials/sections/supports/releases/rigidLinks/mpc/
 *   bearings/springs/foundationSprings) + loads + combinations + analysisSettings
 *
 * Excluded fields (so adding a result reference never self-stales the binding):
 *   documentId, revisionId, timestamps, status, analysisStatus,
 *   resultReferences, resultDigest, validation, extensions
 */

import { createHash } from "node:crypto";
import type { AnalysisDocument } from "./analysisDocumentTypes";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Deterministic canonical JSON (codepoint-sorted keys; rejects non-finite numbers). */
export function canonicalJsonForAnalysis(value: unknown): string {
  if (value === null) {
    return "null";
  }
  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") {
    return JSON.stringify(value);
  }
  if (valueType === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonicalJsonForAnalysis rejects non-finite numbers.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJsonForAnalysis(entry)).join(",")}]`;
  }
  if (!isPlainObject(value)) {
    throw new Error("canonicalJsonForAnalysis rejects non-JSON values.");
  }
  // Codepoint (byte) order to match JSON.stringify / Python json sort_keys semantics.
  const entries = Object.keys(value)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    .map((key) => `${JSON.stringify(key)}:${canonicalJsonForAnalysis(value[key])}`);
  return `{${entries.join(",")}}`;
}

/** Returns the checksum-scoped canonical value (excluded fields dropped). */
export function analysisChecksumPayload(document: AnalysisDocument): Record<string, unknown> {
  return {
    sourceReferences: document.sourceReferences,
    coordinateContext: document.coordinateContext,
    unitContext: document.unitContext,
    nodes: document.nodes,
    members: document.members,
    materials: document.materials,
    sections: document.sections,
    supports: document.supports,
    releases: document.releases,
    rigidLinks: document.rigidLinks,
    mpc: document.mpc,
    bearings: document.bearings,
    springs: document.springs,
    foundationSprings: document.foundationSprings,
    loadCases: document.loadCases,
    nodalLoads: document.nodalLoads,
    memberLoads: document.memberLoads,
    loadCombinations: document.loadCombinations,
    analysisSettings: document.analysisSettings,
  };
}

export function computeAnalysisSha256Hex(value: unknown): string {
  return createHash("sha256").update(canonicalJsonForAnalysis(value), "utf8").digest("hex");
}

/** modelChecksum = IF3 binding source of truth (scope above). */
export function computeAnalysisModelChecksum(document: AnalysisDocument): string {
  return computeAnalysisSha256Hex(analysisChecksumPayload(document));
}

/** contentChecksum = same scope as modelChecksum (Phase 7-01 A §4b). */
export function computeAnalysisContentChecksum(document: AnalysisDocument): string {
  return computeAnalysisSha256Hex(analysisChecksumPayload(document));
}
