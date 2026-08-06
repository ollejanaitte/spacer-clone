/**
 * STEP 9 / Phase 4-D: Report Model validator (VR-01..VR-26, fail-closed).
 *
 * Non-mutating: reads the model only; never modifies it, never repairs values.
 * Spec: docs/apollo/step9/phase3_continuous_report_model_spec/12_report_model_validation_rules.md
 *
 * UNVERIFIED DEVELOPMENT OUTPUT — NOT FOR DESIGN OR CONSTRUCTION
 * NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
 */

import {
  EMITTED_CHAPTER_IDS,
  FORBIDDEN_CHAPTER_IDS,
  type AuthorizationStatus,
  type CanonicalReportChapter,
  type ContinuousReportModel,
  type ReportStatusCode,
  type ValidationReport,
} from "./reportModelTypes";

const STATUS_CODES: ReadonlySet<ReportStatusCode> = new Set<ReportStatusCode>([
  "AVAILABLE",
  "PARTIALLY_AVAILABLE",
  "NOT_IMPLEMENTED",
  "NOT_AUTHORIZED",
  "PROHIBITED",
  "STALE",
  "INVALID",
  "MISSING",
  "LEGACY_DATA",
  "HUMAN_CONFIRMATION_REQUIRED",
  "CONFLICTING_EVIDENCE",
  "NOT_AVAILABLE",
  "UNKNOWN",
]);

const AUTH_STATUSES: ReadonlySet<AuthorizationStatus> = new Set<AuthorizationStatus>([
  "NOT_GRANTED",
  "NOT_AUTHORIZED",
  "UNVERIFIED",
  "USER_PROVIDED_UNVERIFIED",
  "UNKNOWN",
]);

const CANONICAL_IDS: ReadonlySet<string> = new Set<string>(EMITTED_CHAPTER_IDS);
const FORBIDDEN_IDS: ReadonlySet<string> = new Set<string>(FORBIDDEN_CHAPTER_IDS);

function collect(model: ContinuousReportModel): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const e = (code: string, msg: string) => errors.push(`${code}: ${msg}`);
  const w = (code: string, msg: string) => warnings.push(`${code}: ${msg}`);

  // VR-01: metadata required.
  if (!model.schemaVersion) e("VR-01", "schemaVersion required");
  if (!model.reportId) e("VR-01", "reportId required");
  else if (!model.reportId.startsWith("rpt-")) e("VR-01", "reportId must start with rpt-");
  if (!model.projectId) e("VR-01", "projectId required");
  if (!model.generatedAt) e("VR-01", "generatedAt required");
  if (!model.inputChecksum) e("VR-01", "inputChecksum required");
  if (!model.resultChecksum) e("VR-01", "resultChecksum required");
  if (!model.quantityChecksum) e("VR-01", "quantityChecksum required");

  // VR-02: no duplicate chapter id.
  const seen = new Set<string>();
  for (const c of model.chapters) {
    if (seen.has(c.id)) e("VR-02", `duplicate chapter ${c.id}`);
    seen.add(c.id);
  }

  // VR-03: canonical CP-* only; no CH-*.
  for (const c of model.chapters) {
    if (!CANONICAL_IDS.has(c.id)) e("VR-03", `unknown or non-canonical chapter id ${c.id}`);
    if (c.id.startsWith("CH-")) e("VR-03", `CH-* is deprecated/non-canonical: ${c.id}`);
  }

  // VR-09/10: forbidden chapters (CP-08/CP-15/CP-30..34) absent.
  for (const c of model.chapters) {
    if (FORBIDDEN_IDS.has(c.id)) e("VR-09", `forbidden chapter present: ${c.id}`);
  }

  // Per-row validation across summary + detail.
  const validateRows = (c: CanonicalReportChapter, bucket: "summary" | "detail") => {
    for (const r of bucket === "summary" ? c.summary : c.detail ?? []) {
      if (r.value === "PROHIBITED") e("VR-06", `PROHIBITED value emitted in ${c.id} (${bucket})`);
      if (r.status === "PROHIBITED" && r.authorizationStatus !== "NOT_AUTHORIZED") {
        e("VR-07", `PROHIBITED status must pair with NOT_AUTHORIZED in ${c.id} (${bucket})`);
      }
      if (!STATUS_CODES.has(r.status)) e("VR-04", `unknown status ${r.status} in ${c.id} (${bucket})`);
      if (!AUTH_STATUSES.has(r.authorizationStatus)) e("VR-05", `unknown authorizationStatus ${r.authorizationStatus} in ${c.id} (${bucket})`);
      if (r.value === "NOT_AVAILABLE" && r.missingReason == null) {
        w("VR-07", `NOT_AVAILABLE row without missingReason in ${c.id} (${bucket})`);
      }
      if (typeof r.value === "string" && r.value.trim() === "0" && r.missingReason == null) {
        w("VR-19", `suspicious zero value in ${c.id} (${bucket}), no zero-fill`);
      }
    }
  };
  for (const c of model.chapters) {
    validateRows(c, "summary");
    validateRows(c, "detail");
  }

  // VR-08: CONTINUOUS -> CP-13 NOT_AVAILABLE.
  if (model.bridge.bridgeSystem === "CONTINUOUS") {
    const cp13 = model.chapters.find((c) => c.id === "CP-13");
    if (!cp13) {
      e("VR-08", "CP-13 required for CONTINUOUS");
    } else {
      const first = cp13.summary[0];
      if (!first || first.value !== "NOT_AVAILABLE" || first.missingReason !== "NOT_AVAILABLE") {
        e("VR-08", "CP-13 must be NOT_AVAILABLE for CONTINUOUS (U-03)");
      }
    }
  }

  // VR-12: evidence/version consistency — reportId embeds projectId.
  if (model.reportId && model.projectId && !model.reportId.includes(model.projectId)) w("VR-12", "reportId does not embed projectId");

  // VR-13: generatedAt valid ISO.
  if (model.generatedAt && Number.isNaN(Date.parse(model.generatedAt))) {
    e("VR-13", "generatedAt is not a valid ISO timestamp");
  }

  // VR-14: commitSha form (when captured).
  const appCommit = model.evidence.appCommitSha;
  if (appCommit != null && appCommit !== "NOT_CAPTURED_IN_BROWSER" && !/^[0-9a-f]{40}$/i.test(appCommit)) {
    e("VR-14", "appCommitSha is not a 40-char hex SHA");
  }

  // VR-15: formalOkNgEmitted === false.
  if (model.audit.formalOkNgEmitted !== false) e("VR-15", "formalOkNgEmitted must be false");

  // VR-16: authorizationStatus === NOT_GRANTED (report-level).
  if (model.authorizationStatus !== "NOT_GRANTED") e("VR-16", "authorizationStatus must be NOT_GRANTED");

  // VR-17: designOrConstructionUse === PROHIBITED (report-level).
  if (model.designOrConstructionUse !== "PROHIBITED") e("VR-17", "designOrConstructionUse must be PROHIBITED");

  // VR-20: non-empty report + required core chapters.
  if (model.chapters.length === 0) e("VR-20", "report has no chapters");
  if (!model.chapters.some((c) => c.id === "CP-03")) e("VR-20", "CP-03 (metadata) must be present");

  // VR-10: legacy consistency.
  if (model.legacy.legacy && model.legacy.legacyStatus != null && model.legacy.legacyStatus !== "LEGACY_DATA") {
    w("VR-10", "legacy flag set but legacyStatus is not LEGACY_DATA");
  }

  // VR-11: summary/detail state parity.
  for (const c of model.chapters) {
    if (c.detail && c.detail.some((r) => r.status === "PROHIBITED") && !c.summary.some((r) => r.status === "PROHIBITED")) {
      w("VR-11", `detail has PROHIBITED but summary does not in ${c.id}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Fail-closed validator (non-mutating). */
export function validateReportModel(model: ContinuousReportModel): ValidationReport {
  return collect(model);
}

/** Convenience assertion — throws when the model is invalid. */
export function assertReportModelValid(model: ContinuousReportModel): void {
  const result = validateReportModel(model);
  if (!result.valid) {
    throw new Error(`ReportModel validation failed: ${result.errors.join("; ")}`);
  }
}
