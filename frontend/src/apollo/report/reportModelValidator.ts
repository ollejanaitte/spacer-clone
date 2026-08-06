/**
 * STEP 9 / Phase 4-D: Report Model validator (VR-01..VR-26, fail-closed, non-mutating).
 *
 * Reads the frozen `ContinuousReportModel` only; never mutates, never repairs.
 * Rule table: docs/apollo/step9/phase3_continuous_report_model_spec/
 *   12_report_model_validation_rules.md (§2, frozen VR-01..26).
 * Spec obligations: `13_phase4_acceptance_criteria.md` AC-11 ("validator implements
 * VR-01..26; build red on FAIL"), `11_summary_detail_projection_contract.md` §6 R-9.
 *
 * Severity mapping per spec §3: FAIL → error; WARN → warning (browser); CI-FAIL →
 * error only under CI. Browser dev build has no COMMIT_SHA, so VR-19 (commitSha)
 * is WARN-only here.
 *
 * UNVERIFIED DEVELOPMENT OUTPUT — NOT FOR DESIGN OR CONSTRUCTION
 * NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
 */

import {
  EMITTED_CHAPTER_IDS,
  FORBIDDEN_CHAPTER_IDS,
  type AuthorizationStatus,
  type CanonicalReportChapter,
  type CanonicalReportRow,
  type ContinuousReportModel,
  type ReportStatusCode,
  type ValidationReport,
} from "./reportModelTypes";

/* Runtime code sets mirror `status_code_matrix.csv` / `06` §3. */
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

/* VR-08: authorization statuses that would constitute an ADOPTED numeric breach. */
const ADOPTED_AUTH_STATUSES: ReadonlySet<string> = new Set<string>([
  "ADOPTED",
  "APPROVED",
  "AUTHORIZED",
  "GRANTED",
]);

/* VR-03: canonical chapter set = CP-{01..25, 30..34}. */
const ALLOWED_CHAPTER_IDS: ReadonlySet<string> = new Set<string>([
  ...EMITTED_CHAPTER_IDS,
  ...FORBIDDEN_CHAPTER_IDS,
]);

/** Per §6 Principle 4: detail uses the same value as summary for the same source. */
const NUMERIC_RELEVANT_STATUSES: ReadonlySet<string> = new Set<string>([
  "AVAILABLE",
  "STALE",
  "PARTIALLY_AVAILABLE",
]);

const ISO_8601_RX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function isNumericValue(v: string): boolean {
  if (v === "NOT_AVAILABLE" || v === "NOT_IMPLEMENTED" || v === "") return false;
  return /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v);
}

function collect(model: ContinuousReportModel): {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const e = (code: string, msg: string) => errors.push(`${code}: ${msg}`);
  const w = (code: string, msg: string) => warnings.push(`${code}: ${msg}`);

  // --- Metadata (VR-01, VR-13, VR-23..26 report-level fields) ---
  // VR-01: required metadata present.
  if (!model.schemaVersion) e("VR-01", "schemaVersion required");
  if (!model.reportId) e("VR-01", "reportId required");
  else if (!model.reportId.startsWith("rpt-")) e("VR-01", "reportId must start with rpt-");
  if (!model.projectId) e("VR-01", "projectId required");
  if (!model.generatedAt) e("VR-01", "generatedAt required");
  if (!model.inputChecksum) e("VR-01", "inputChecksum required");
  if (!model.resultChecksum) e("VR-01", "resultChecksum required");
  if (!model.quantityChecksum) e("VR-01", "quantityChecksum required");

  // VR-13: legacy report missing schemaVersion but claimed current -> FAIL.
  if (!model.metadata?.schemaVersion && !model.legacy?.legacy) {
    e("VR-13", "schemaVersion missing on non-legacy report");
  }

  // VR-17: schemaVersion must appear in audit.schemaVersions[].
  if (model.schemaVersion && !(model.audit?.schemaVersions ?? []).includes(model.schemaVersion)) {
    e("VR-17", "schemaVersion not listed in audit.schemaVersions");
  }

  // VR-23: designOrConstructionUse === PROHIBITED.
  if (model.designOrConstructionUse !== "PROHIBITED") e("VR-23", "designOrConstructionUse must be PROHIBITED");

  // VR-24: report-level authorizationStatus === NOT_GRANTED.
  if (model.authorizationStatus !== "NOT_GRANTED") e("VR-24", "authorizationStatus must be NOT_GRANTED");

  // VR-25: developmentLabel === UNVERIFIED_DEVELOPMENT_ONLY.
  if (model.developmentLabel !== "UNVERIFIED_DEVELOPMENT_ONLY") e("VR-25", "developmentLabel must be UNVERIFIED_DEVELOPMENT_ONLY");

  // VR-26: formalOkNgEmitted === false.
  if (model.audit?.formalOkNgEmitted !== false) e("VR-26", "formalOkNgEmitted must be false");

  // --- Chapter structure (VR-02, VR-03, VR-04, VR-09, VR-10) ---
  const seen = new Set<string>();
  for (const c of model.chapters) {
    // VR-02: no duplicate chapter id.
    if (seen.has(c.id)) e("VR-02", `duplicate chapter ${c.id}`);
    seen.add(c.id);

    // VR-03: chapter_id ∈ CP-{01..25,30..34} (CP-* canonical).
    if (!ALLOWED_CHAPTER_IDS.has(c.id)) e("VR-03", `non-canonical chapter id ${c.id}`);

    // VR-04: no CH-* in output (deprecated alias is internal only).
    if (c.id.startsWith("CH-")) e("VR-04", "CH-* is non-canonical and must not appear in output");

    // VR-09 + VR-10: forbidden chapters (CP-08/15/30..34) must not emit data values.
    const isForbidden = FORBIDDEN_CHAPTER_IDS.includes(c.id as (typeof FORBIDDEN_CHAPTER_IDS)[number]);
    if (isForbidden) {
      for (const r of c.summary) if (r.value !== "NOT_AVAILABLE") e("VR-10", `forbidden chapter ${c.id} emitted a data value`);
      for (const r of c.detail ?? []) if (r.value !== "NOT_AVAILABLE") e("VR-10", `forbidden chapter ${c.id} detail emitted a data value`);
    }
  }

  // --- Per-row checks (VR-05, VR-06, VR-07, VR-08, VR-09 value, VR-22) ---
  const rowsOf = (c: CanonicalReportChapter): CanonicalReportRow[] => [
    ...c.summary,
    ...(c.detail ?? []),
  ];
  for (const c of model.chapters) {
    for (const r of rowsOf(c)) {
      // VR-05: every value has an allowed status code.
      if (!STATUS_CODES.has(r.status)) e("VR-05", `unknown status '${r.status}' in ${c.id}`);
      // VR-05: value-level authorizationStatus must be allowed.
      if (!AUTH_STATUSES.has(r.authorizationStatus)) e("VR-05", `unknown authorizationStatus '${r.authorizationStatus}' in ${c.id}`);

      // VR-09: PROHIBITED value present in payload.
      if (r.value === "PROHIBITED" || r.missingReason === "PROHIBITED") {
        e("VR-09", `PROHIBITED value present in ${c.id}`);
      }

      // VR-06: numeric value without a unit is only allowed for counts (unit "count").
      if (isNumericValue(r.value) && r.unit === "" && r.status !== "NOT_AVAILABLE" && r.missingReason === null) {
        e("VR-06", `numeric value '${r.value}' missing unit in ${c.id} (counts must use 'count')`);
      }

      // VR-07: numeric/boolean value missing source.path/symbol.
      if (r.source === "") e("VR-07", `row missing source.path/symbol in ${c.id}`);

      // VR-08: numeric design value shown AVAILABLE/ADOPTED -> authorization breach.
      if (
        isNumericValue(r.value) &&
        r.missingReason === null &&
        NUMERIC_RELEVANT_STATUSES.has(r.status) &&
        ADOPTED_AUTH_STATUSES.has(r.authorizationStatus)
      ) {
        e("VR-08", `numeric value '${r.value}' shown ${r.status} with adopted authorization '${r.authorizationStatus}' in ${c.id}`);
      }

      // VR-22: zero-fill — structural-dimensional numeric "0" for a (structurally absent) input.
      if (
        r.value === "0" &&
        r.unit !== "count" &&
        r.unit !== "" &&
        r.missingReason === null &&
        NUMERIC_RELEVANT_STATUSES.has(r.status)
      ) {
        e("VR-22", `suspected zero-fill '${r.value}' in ${c.id} (missing input must be NOT_AVAILABLE, not '0')`);
      }
    }
  }

  // --- Continuous-system invariants (VR-12) ---
  // VR-12: CP-13 CONTINUOUS must NOT emit section values (U-03 verdict B).
  if (model.bridge?.bridgeSystem === "CONTINUOUS") {
    const cp13 = model.chapters.find((c) => c.id === "CP-13");
    if (!cp13) e("VR-12", "CP-13 required for CONTINUOUS");
    else {
      const first = cp13.summary[0];
      if (!first || first.value !== "NOT_AVAILABLE" || first.missingReason !== "NOT_AVAILABLE") {
        e("VR-12", "CP-13 must be NOT_AVAILABLE for CONTINUOUS (U-03 verdict B)");
      }
    }
  }

  // --- Legacy compatibility (VR-14) ---
  // VR-14: legacyStatus inconsistent with legacy flag.
  const legacyStatus = model.legacy?.legacyStatus;
  if (model.legacy?.legacy && legacyStatus != null && legacyStatus !== "LEGACY_DATA" && legacyStatus !== "UNKNOWN") {
    e("VR-14", `legacy flag set but legacyStatus '${legacyStatus}' is inconsistent`);
  }

  // --- STALE propagation (VR-11) ---
  // VR-11: a STALE report must not carry fresh-value status (stale:false) on rows
  // that bear present values.
  if (model.stale) {
    for (const c of model.chapters) {
      for (const r of [...c.summary, ...(c.detail ?? [])]) {
        if (NUMERIC_RELEVANT_STATUSES.has(r.status) && !r.stale && r.missingReason === null) {
          e("VR-11", `STALE report carries fresh status for source '${r.source}' in ${c.id}`);
        }
      }
    }
  }

  // --- Summary/detail projection parity (VR-15, VR-16) ---
  // VR-15: for any shared source, summary status must equal detail status.
  for (const c of model.chapters) {
    if (!c.detail) continue;
    const detailBySource = new Map<string, string>();
    for (const r of c.detail) detailBySource.set(r.source, r.status);
    for (const r of c.summary) {
      const detailStatus = detailBySource.get(r.source);
      if (detailStatus !== undefined && detailStatus !== r.status) {
        e("VR-15", `summary/detail status mismatch for source '${r.source}' in ${c.id}`);
      }
    }
  }

  // VR-16: evidence checksums must match metadata checksums (prefix/detail consistency).
  if (model.metadata) {
    if (model.metadata.resultChecksum !== model.evidence?.resultChecksum) {
      e("VR-16", "resultChecksum mismatch: metadata vs evidence");
    }
    if (model.metadata.inputChecksum !== model.evidence?.inputChecksum) {
      e("VR-16", "inputChecksum mismatch: metadata vs evidence");
    }
    if (model.metadata.quantityChecksum !== model.evidence?.quantityChecksum) {
      e("VR-16", "quantityChecksum mismatch: metadata vs evidence");
    }
  }

  // VR-18: generatedAt must be valid ISO-8601 and not in the future.
  if (model.generatedAt) {
    if (!ISO_8601_RX.test(model.generatedAt) || Number.isNaN(Date.parse(model.generatedAt))) {
      e("VR-18", "generatedAt is not a valid ISO-8601 timestamp");
    } else if (Date.parse(model.generatedAt) > Date.now()) {
      e("VR-18", "generatedAt is in the future");
    }
  }

  // VR-19: commitSha form (WARN in browser; CI-only when COMMIT_SHA present).
  const appCommit = model.evidence?.appCommitSha;
  if (appCommit != null && appCommit !== "NOT_CAPTURED_IN_BROWSER" && !/^[0-9a-f]{40}$/i.test(appCommit)) {
    w("VR-19", "appCommitSha is not a 40-char hex SHA (CI will fail)");
  }

  // VR-20: non-empty report with required core chapters.
  if (model.chapters.length === 0) e("VR-20", "report has no chapters");
  if (!model.chapters.some((c) => c.id === "CP-03")) e("VR-20", "CP-03 (metadata) must be present");

  return { valid: errors.length === 0, errors, warnings };
}

/** Fail-closed validator (non-mutating). See `12_report_model_validation_rules.md` §4. */
export function validateReportModel(model: ContinuousReportModel): ValidationReport {
  return collect(model);
}

/** Convenience assertion — throws when the model is invalid (export gate). */
export function assertReportModelValid(model: ContinuousReportModel): void {
  const result = validateReportModel(model);
  if (!result.valid) {
    throw new Error(`ReportModel validation failed: ${result.errors.join("; ")}`);
  }
}
