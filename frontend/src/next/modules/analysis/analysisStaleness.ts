/**
 * Analysis result staleness evaluation (Phase 7-01 D FROZEN / Phase 7-02 WP-I).
 *
 * Three-gate evaluation (FROZEN persistence §4.2b / Sol review #1/#14):
 *   Gate1 upstream freshness: current upstream fingerprints must equal
 *         AnalysisDocument.sourceReferences.
 *   Gate2 AnalysisDocument freshness: current modelChecksum must equal the
 *         result binding sourceContentChecksum.
 *   Gate3 IF3 gate: resource integrity / staleness / availability.
 *
 * Any STALE/INVALID gate -> the result is displayed as STALE and never
 * exported as authoritative.
 */

import { analysisNeedsRegeneration } from "./analysisDocument";
import type { AnalysisDocument, AnalysisSourceReferences } from "./analysisDocumentTypes";

export type AnalysisResultStatus =
  | "VALID"
  | "STALE"
  | "INVALID"
  | "UNSUPPORTED"
  | "MISSING"
  | "NOT_AVAILABLE";

export interface StalenessEvaluation {
  readonly status: AnalysisResultStatus;
  readonly gate1: "PASS" | "STALE" | "NOT_APPLICABLE";
  readonly gate2: "PASS" | "STALE" | "NOT_APPLICABLE";
  readonly gate3: "PASS" | "STALE" | "INVALID" | "UNSUPPORTED" | "NOT_APPLICABLE";
  readonly reasons: readonly string[];
}

export interface CurrentUpstreamContext {
  readonly sourceReferences: AnalysisSourceReferences;
  readonly analysisDocument: AnalysisDocument;
  readonly resultBindingChecksum: string | null;
  readonly if3Status: "VALID" | "STALE" | "INVALID" | "UNSUPPORTED" | "MISSING" | null;
}

function checksumHexEquals(expected: string | null | undefined, actual: string | null | undefined): boolean {
  if (typeof expected !== "string" || typeof actual !== "string") {
    return false;
  }
  if (expected.length !== actual.length) {
    return false;
  }
  return expected === actual;
}

/**
 * Evaluate result staleness through the frozen three gates.
 */
export function evaluateAnalysisResultStaleness(
  context: CurrentUpstreamContext,
): StalenessEvaluation {
  const reasons: string[] = [];

  // Gate 1: upstream freshness.
  const upstreamChanged = analysisNeedsRegeneration(
    context.analysisDocument,
    context.sourceReferences,
  );
  const gate1: StalenessEvaluation["gate1"] = upstreamChanged ? "STALE" : "PASS";
  if (upstreamChanged) {
    reasons.push("Gate1: upstream fingerprints changed; AnalysisDocument must be regenerated.");
  }

  // Gate 2: AnalysisDocument freshness vs result binding.
  let gate2: StalenessEvaluation["gate2"] = "NOT_APPLICABLE";
  if (context.resultBindingChecksum !== null) {
    const bindingMatches = checksumHexEquals(
      context.resultBindingChecksum,
      context.analysisDocument.modelChecksum,
    );
    gate2 = bindingMatches ? "PASS" : "STALE";
    if (!bindingMatches) {
      reasons.push("Gate2: result binding checksum does not match current modelChecksum.");
    }
  }

  // Gate 3: IF3 status.
  let gate3: StalenessEvaluation["gate3"] = "NOT_APPLICABLE";
  if (context.if3Status !== null) {
    switch (context.if3Status) {
      case "VALID":
        gate3 = "PASS";
        break;
      case "STALE":
        gate3 = "STALE";
        reasons.push("Gate3: IF3 resource is STALE.");
        break;
      case "INVALID":
        gate3 = "INVALID";
        reasons.push("Gate3: IF3 resource is INVALID.");
        break;
      case "UNSUPPORTED":
        gate3 = "UNSUPPORTED";
        reasons.push("Gate3: IF3 resource is UNSUPPORTED.");
        break;
      case "MISSING":
        gate3 = "NOT_APPLICABLE";
        break;
    }
  }

  let status: AnalysisResultStatus = "VALID";
  if (gate1 === "STALE" || gate2 === "STALE" || gate3 === "STALE") {
    status = "STALE";
  } else if (gate3 === "INVALID") {
    status = "INVALID";
  } else if (gate3 === "UNSUPPORTED") {
    status = "UNSUPPORTED";
  } else if (context.if3Status === null && context.resultBindingChecksum === null) {
    status = "NOT_AVAILABLE";
  }

  return { status, gate1, gate2, gate3, reasons };
}

/**
 * Determine the AnalysisDocument-level status (STALE when regeneration needed).
 */
export function analysisDocumentStatus(
  document: AnalysisDocument,
  current: AnalysisSourceReferences,
): "VALIDATED" | "STALE" {
  return analysisNeedsRegeneration(document, current) ? "STALE" : "VALIDATED";
}
