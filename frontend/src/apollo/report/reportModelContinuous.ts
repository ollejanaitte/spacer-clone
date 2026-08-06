/**
 * STEP 9 / Phase 4-C: canonical continuous-girder Report Model transformer.
 *
 * Read-only: ProjectModel -> ContinuousReportModel (CP-* canonical chapters).
 * Strictly additive — the Step 2-B CH-* scaffold in `reportModel.ts` is retained
 * for the legacy dev-preview export path (HTML/PDF gate, formal rejected).
 *
 * Spec: docs/apollo/step9/phase3_continuous_report_model_spec/
 *   chapter_payload_matrix.csv (CP-01..CP-34), report_entity_matrix.csv (R-*),
 *   status_code_matrix.csv (13 codes), 07_validation_and_missing_data_contract.md.
 *
 * CONTINUOUS rules:
 *   - CP-06 emits BridgeSystem.CONTINUOUS (non-numeric).
 *   - CP-07 spanLength value is NOT_AVAILABLE for CONTINUOUS (per-span lengths retained in detail).
 *   - CP-13 section NOT_AVAILABLE for CONTINUOUS (U-03 verdict B).
 *   - CP-12: no ADOPTED numerics.
 *   - CP-30..CP-34 and CP-08/CP-15 are forbidden -> NOT emitted.
 *   - watermark + UNVERIFIED DEVELOPMENT OUTPUT warnings emitted (CP-20).
 *   - formalOkNgEmitted=false; authorizationStatus=NOT_GRANTED; designOrConstructionUse=PROHIBITED.
 *   - No analysis / STL / 3D generation invoked; CP-18 is manifest/summary only.
 *
 * UNVERIFIED DEVELOPMENT OUTPUT — NOT FOR DESIGN OR CONSTRUCTION
 * NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
 */

import { REPORT_MODEL_SCHEMA_VERSION } from "./reportModel";
import type {
  AuthorizationStatus,
  CanonicalChapterId,
  CanonicalReportChapter,
  CanonicalReportRow,
  ContinuousReportModel,
  LegacyStatus,
  MissingReason,
  ReportStatusCode,
} from "./reportModelTypes";
import { EMITTED_CHAPTER_IDS, CH_TO_CP } from "./reportModelTypes";
import type { ProjectModel } from "../../types";
import { computeContentChecksum } from "../../contracts/legacy/checksum";
import { buildInputChecksum, buildInputRevision, buildQuantityModel } from "../quantity/quantityModel";
import {
  computeGirderSectionProperties,
  type GirderSectionProperties,
} from "../bridgeStructure/sectionProperties";
import { getBridgeStructureInputDraft, isBridgeStructureGenerationCurrent } from "../bridgeStructure/generateBsdd";
import { resolveEffectiveLayout, validateBridgeLayoutContract, BridgeSystem } from "../contracts";
import { getBridgeStructureUnitWeightAdoption } from "../bridgeStructure/adoption";
import { assertReportModelValid, validateReportModel } from "./reportModelValidator";

export interface ContinuousReportOptions {
  readonly generatedAt?: string;
  readonly appCommitSha?: string | null;
}

interface RowProps {
  readonly authorizationStatus: AuthorizationStatus;
  readonly stale: boolean;
  readonly legacyStatus: LegacyStatus;
}

const DATA_ROW_AUTH: AuthorizationStatus = "NOT_AUTHORIZED";
const PROVENANCE_AUTH: AuthorizationStatus = "NOT_GRANTED";

function rowProps(stale: boolean, legacyStatus: LegacyStatus, auth: AuthorizationStatus): RowProps {
  return { authorizationStatus: auth, stale, legacyStatus };
}

function notAvailable(
  unit: string,
  source: string,
  props: RowProps,
  missing: MissingReason = "NOT_AVAILABLE",
  note?: string,
): CanonicalReportRow {
  return {
    value: "NOT_AVAILABLE",
    display: "NOT_AVAILABLE",
    unit,
    status: "NOT_AVAILABLE",
    source,
    authorizationStatus: props.authorizationStatus,
    stale: props.stale,
    missingReason: missing,
    legacyStatus: props.legacyStatus,
    ...(note != null ? { note } : {}),
  };
}

function numRow(
  value: number | null | undefined,
  unit: string,
  source: string,
  props: RowProps,
  missing: MissingReason = "NOT_AVAILABLE",
): CanonicalReportRow {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return notAvailable(unit, source, props, missing, "NOT_AVAILABLE");
  }
  return {
    value: String(value),
    display: formatNumber(value),
    unit,
    status: props.stale ? "STALE" : "AVAILABLE",
    source,
    authorizationStatus: props.authorizationStatus,
    stale: props.stale,
    missingReason: null,
    legacyStatus: props.legacyStatus,
  };
}

function strRow(
  value: string | null | undefined,
  unit: string,
  source: string,
  props: RowProps,
  missing: MissingReason = "NOT_AVAILABLE",
): CanonicalReportRow {
  if (value === null || value === undefined || value === "") {
    return notAvailable(unit, source, props, missing, "NOT_AVAILABLE");
  }
  return {
    value,
    display: value,
    unit,
    status: props.stale ? "STALE" : "AVAILABLE",
    source,
    authorizationStatus: props.authorizationStatus,
    stale: props.stale,
    missingReason: null,
    legacyStatus: props.legacyStatus,
  };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
}

function row(
  value: string,
  unit: string,
  status: ReportStatusCode,
  source: string,
  props: RowProps,
  auth: AuthorizationStatus = DATA_ROW_AUTH,
): CanonicalReportRow {
  return {
    value,
    display: value,
    unit,
    status,
    source,
    authorizationStatus: auth,
    stale: props.stale,
    missingReason: null,
    legacyStatus: props.legacyStatus,
  };
}

function chapter(
  id: CanonicalChapterId,
  summary: CanonicalReportRow[],
  detail?: CanonicalReportRow[],
): CanonicalReportChapter {
  return detail !== undefined ? { id, summary, detail } : { id, summary };
}

const GAP_LIST: readonly string[] = ["U-01", "U-02", "U-03", "U-04", "U-05", "U-06"];
const RESOLVED_H_ITEMS: readonly string[] = ["H-01", "H-02", "H-03"];

export function buildContinuousReportModel(
  project: ProjectModel,
  options?: ContinuousReportOptions,
): ContinuousReportModel {
  const draft = getBridgeStructureInputDraft(project);
  const stale = !isBridgeStructureGenerationCurrent(project);
  const inputChecksum = buildInputChecksum(draft);
  const inputRevision = buildInputRevision(draft);
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const quantity = buildQuantityModel(project, { generatedAt });
  const quantityChecksum = computeContentChecksum(quantity).hexDigest;
  const bridgeSystem: string = draft.bridgeSystem;
  const isContinuous = draft.bridgeSystem === BridgeSystem.CONTINUOUS;
  const isSimple = draft.bridgeSystem === BridgeSystem.SIMPLE_SINGLE;
  const spanSystem = isContinuous ? "continuous" : "simple";
  const legacyStatus: LegacyStatus = project.apolloBsdd == null ? "LEGACY_DATA" : "current";
  const dataProps = rowProps(stale, legacyStatus, DATA_ROW_AUTH);
  const provenance = rowProps(stale, legacyStatus, PROVENANCE_AUTH);

  const layout = resolveEffectiveLayout({
    bridgeSystem: draft.bridgeSystem,
    spanLength: draft.spanLength,
    spans: draft.spans,
    supports: draft.supports,
  });
  const layoutDiagnostics = validateBridgeLayoutContract({
    bridgeSystem: draft.bridgeSystem,
    bridgeLength: draft.bridgeLength,
    spanLength: draft.spanLength,
    spans: draft.spans,
    supports: draft.supports,
  });
  const spanCount = layout?.spans.length ?? 0;
  const supportCount = layout?.supports.length ?? 0;
  const crossBeamCount =
    draft.bridgeLength != null && draft.crossBeamSpacing != null && draft.crossBeamSpacing > 0
      ? Math.floor(draft.bridgeLength / draft.crossBeamSpacing) + 1
      : 0;

  const sectionDimsComplete = [
    draft.spanLength, draft.bridgeLength, draft.width, draft.girderCount, draft.girderSpacing,
    draft.girderDepth, draft.topFlangeWidth, draft.topFlangeThickness,
    draft.bottomFlangeWidth, draft.bottomFlangeThickness, draft.webThickness,
    draft.deckThickness, draft.crossBeamSpacing,
  ].every((v) => v !== null);
  const sectionProps: GirderSectionProperties | null =
    isContinuous || !sectionDimsComplete || !isSimple
      ? null
      : computeGirderSectionProperties({
          spanLength: draft.spanLength!,
          bridgeLength: draft.bridgeLength!,
          width: draft.width!,
          girderCount: draft.girderCount!,
          girderSpacing: draft.girderSpacing!,
          girderDepth: draft.girderDepth!,
          topFlangeWidth: draft.topFlangeWidth!,
          topFlangeThickness: draft.topFlangeThickness!,
          bottomFlangeWidth: draft.bottomFlangeWidth!,
          bottomFlangeThickness: draft.bottomFlangeThickness!,
          webThickness: draft.webThickness!,
          deckThickness: draft.deckThickness!,
          crossBeamSpacing: draft.crossBeamSpacing!,
        });

  const girders =
    draft.girderCount != null && draft.girderCount > 0
      ? Array.from({ length: draft.girderCount }, (_, i) => ({
          girderId: `girder-${i}`,
          offset: draft.girderSpacing != null ? i * draft.girderSpacing : null,
          count: 1,
          depth: draft.girderDepth,
          spacing: draft.girderSpacing,
          segments: (layout?.spans ?? []).map((s) => s.length),
        }))
      : [];
  const girderCountValue: number | null = girders.length > 0 ? girders.length : draft.girderCount;

  const warnings = [
    "UNVERIFIED DEVELOPMENT OUTPUT",
    "NOT FOR DESIGN OR CONSTRUCTION",
    "USER REVIEW REQUIRED",
    "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
    ...(stale ? ["STALE: regenerate before export"] : []),
  ];

  const resultPayload = {
    chapters: EMITTED_CHAPTER_IDS,
    inputChecksum,
    quantityChecksum,
  };
  const resultChecksum = computeContentChecksum(resultPayload).hexDigest;
  const reportId = `rpt-${project.project.id}-${inputChecksum.slice(0, 12)}`;
  const quantityChecksumFinal = quantityChecksum;

  const chapters: CanonicalReportChapter[] = [
    chapter("CP-01", [
      row(project.project.id, "", "AVAILABLE", "project.project.id", provenance),
      row(reportId, "", "AVAILABLE", "derived reportId", provenance),
      row("DEVELOPMENT", "", "AVAILABLE", "ReportMode", provenance),
      row("NOT_GRANTED", "", "NOT_AUTHORIZED", "authorizationStatus", provenance, PROVENANCE_AUTH),
    ]),
    chapter("CP-02", [
      row("continuous-girder confirmation report (development)", "", "AVAILABLE", "02_report_purpose_and_classification.md", dataProps),
      row("in-scope: non-numeric geometry / STL manifest / summary", "", "AVAILABLE", "scope", dataProps),
    ]),
    chapter("CP-03", [
      row(REPORT_MODEL_SCHEMA_VERSION, "", "AVAILABLE", "REPORT_MODEL_SCHEMA_VERSION", provenance),
      row(inputRevision, "", "AVAILABLE", "draft.generatedAt", provenance),
      row(inputChecksum, "", "AVAILABLE", "buildInputChecksum(draft)", provenance),
      row(quantity.schemaVersion, "", "AVAILABLE", "QUANTITY_MODEL_SCHEMA_VERSION", provenance),
    ]),
    chapter("CP-04", [
      strRow(project.project.id, "", "project.project.id", provenance),
      strRow(project.project.name, "", "project.project.name", provenance),
      notAvailable("", "project.project.number", provenance, "NOT_AVAILABLE", "NOT_AVAILABLE"),
      strRow(project.project.createdAt ?? null, "", "project.project.createdAt", provenance),
    ]),
    chapter("CP-05", [
      strRow(draft.bridgeSystem, "", "draft.bridgeSystem", dataProps),
      strRow(spanSystem, "", "derived spanSystem", dataProps),
      numRow(draft.bridgeLength, "m", "draft.bridgeLength", dataProps),
      numRow(draft.width, "m", "draft.width", dataProps),
      numRow(draft.girderCount, "count", "draft.girderCount", dataProps),
      numRow(draft.girderDepth, "m", "draft.girderDepth", dataProps),
      numRow(spanCount, "count", "draft.spans", dataProps),
      numRow(supportCount, "count", "draft.supports", dataProps),
    ]),
    chapter("CP-06", [
      strRow(draft.bridgeSystem, "", "draft.bridgeSystem", dataProps),
      strRow(spanSystem, "", "derived spanSystem", dataProps),
    ]),
    chapter(
      "CP-07",
      [
        numRow(spanCount, "count", "draft.spans.length", dataProps),
        numRow(supportCount, "count", "draft.supports.length", dataProps),
        isContinuous
          ? notAvailable("m", "draft.spanLength", dataProps, "NOT_AVAILABLE", "CONTINUOUS: use per-span lengths")
          : numRow(draft.spanLength, "m", "draft.spanLength", dataProps),
      ],
      layout ? layout.spans.map((s) => strRow(String(s.length), "m", `draft.spans[${s.id}]`, dataProps)) : [],
    ),
    chapter("CP-09",
      girders.length
        ? [
            numRow(girders.length, "count", "draft.girderCount", dataProps),
            numRow(draft.girderSpacing, "m", "draft.girderSpacing", dataProps),
            numRow(draft.girderDepth, "m", "draft.girderDepth", dataProps),
          ]
        : [numRow(draft.girderCount, "count", "draft.girderCount", dataProps)],
      girders.flatMap((g, i) =>
        i % 1 ? [] : [row(g.girderId, "", "AVAILABLE", `girder-${i}`, dataProps)],
      ),
    ),
    chapter("CP-10",
      [numRow(supportCount, "count", "draft.supports.length", dataProps)],
      layout
        ? layout.supports.map((s) =>
            strRow(
              s.role === "ABUTMENT" ? "abutment" : isContinuous ? "pier" : "bearing",
              "",
              `draft.supports[${s.id}].role`,
              dataProps,
            ),
          )
        : [],
    ),
    chapter("CP-11", [
      numRow(crossBeamCount, "count", "derived (bridgeLength/crossBeamSpacing)", dataProps),
      numRow(draft.crossBeamSpacing, "m", "draft.crossBeamSpacing", dataProps),
    ]),
    chapter("CP-12", [
      numRow(
        draft.steelUnitWeight,
        "kN/m3",
        "draft.steelUnitWeight",
        rowProps(stale, legacyStatus, draft.steelUnitWeight != null ? "USER_PROVIDED_UNVERIFIED" : "NOT_AUTHORIZED"),
      ),
      numRow(
        draft.rcUnitWeight,
        "kN/m3",
        "draft.rcUnitWeight",
        rowProps(stale, legacyStatus, draft.rcUnitWeight != null ? "USER_PROVIDED_UNVERIFIED" : "NOT_AUTHORIZED"),
      ),
      strRow(getBridgeStructureUnitWeightAdoption(project, "steel"), "", "getBridgeStructureUnitWeightAdoption(CP-12)", dataProps),
    ]),
    chapter(
      "CP-13",
      isContinuous
        ? [notAvailable("m/m2/m3/m4", "computeGirderSectionProperties", dataProps, "NOT_AVAILABLE", "CONTINUOUS: U-03 verdict B")]
        : [numRow(sectionProps ? sectionProps.webHeight : null, "m", "webHeight", dataProps)],
      sectionProps
        ? [
            numRow(sectionProps.totalArea, "m2", "totalArea", dataProps),
            numRow(sectionProps.centroidFromBottom, "m", "centroidFromBottom", dataProps),
            numRow(sectionProps.secondMomentOfArea, "m4", "secondMomentOfArea", dataProps),
            numRow(sectionProps.sectionModulusTop, "m3", "sectionModulusTop", dataProps),
            numRow(sectionProps.sectionModulusBottom, "m3", "sectionModulusBottom", dataProps),
            numRow(sectionProps.steelVolumePerGirder, "m3", "steelVolumePerGirder", dataProps),
          ]
        : [],
    ),
    chapter("CP-14", [
      numRow(project.loadCases?.length ?? 0, "count", "project.loadCases.length", dataProps),
    ]),
    chapter("CP-16", [
      row("linear_static", "", "AVAILABLE", "simple-span idealized dev note", dataProps),
      row("NOT_GRANTED", "", "NOT_AUTHORIZED", "formalAuthorization", provenance, PROVENANCE_AUTH),
    ]),
    chapter("CP-17", [
      numRow(girderCountValue ?? 0, "count", "girderCount", dataProps),
      numRow(spanCount, "count", "spans", dataProps),
      numRow(supportCount, "count", "supports", dataProps),
    ]),
    chapter("CP-18", [
      strRow(project.apolloBsdd != null ? "true" : "false", "", "apolloBsdd present (summary only)", dataProps),
      notAvailable("", "apolloStlExport", dataProps, "NOT_AVAILABLE", "STL generation not invoked; manifest only"),
    ]),
    chapter("CP-19", [
      row(layoutDiagnostics.length === 0 ? "true" : "false", "", layoutDiagnostics.length === 0 ? "AVAILABLE" : "INVALID", "validateBridgeLayoutContract", dataProps),
      numRow(layoutDiagnostics.length, "count", "layoutDiagnostics", dataProps),
    ]),
    chapter("CP-20", [
      row(String(warnings.length), "count", "AVAILABLE", "warning count", dataProps),
      row("UNVERIFIED_DEVELOPMENT_ONLY", "", "AVAILABLE", "developmentLabel", dataProps),
      row(String(RESOLVED_H_ITEMS.length), "count", "AVAILABLE", "resolved H-01..H-03", dataProps),
    ]),
    chapter("CP-21", [
      strRow(inputRevision, "", "draft.generatedAt", dataProps),
      strRow(stale ? "true" : "false", "", "isBridgeStructureGenerationCurrent", dataProps),
    ]),
    chapter("CP-22", [
      row("NOT_GRANTED", "", "NOT_AUTHORIZED", "numericAuthorityGuard", provenance, PROVENANCE_AUTH),
    ]),
    chapter("CP-23", [
      row("CONTINUOUS_FEM_MODEL", "", "NOT_IMPLEMENTED", "gap U-01", dataProps),
      row("FORMAL_OK_NG", "", "NOT_IMPLEMENTED", "gap U-02", dataProps),
      row("REACTIONS/SHEAR/MOMENT/DEFLECTION", "", "NOT_IMPLEMENTED", "gap U-03..U-04", dataProps),
      row("LOAD_COMBOS", "", "NOT_IMPLEMENTED", "gap U-05", dataProps),
      row("ALIGNMENT_CURVE_SKEW", "", "NOT_IMPLEMENTED", "gap U-06", dataProps),
    ]),
    chapter("CP-25", [
      strRow(inputChecksum, "", "buildInputChecksum", provenance),
      strRow(resultChecksum, "", "resultChecksum (CP-chapters+checksums)", provenance),
      strRow(quantityChecksumFinal, "", "quantityChecksum", provenance),
      strRow(quantity.schemaVersion, "", "QUANTITY_MODEL_SCHEMA_VERSION", provenance),
      strRow(generatedAt, "iso8601", "generatedAt", provenance),
      strRow(options?.appCommitSha ?? "NOT_CAPTURED_IN_BROWSER", "", "options.appCommitSha", provenance),
    ]),
  ];

  return {
    schemaVersion: REPORT_MODEL_SCHEMA_VERSION,
    reportId,
    projectId: project.project.id,
    generatedAt,
    inputRevision,
    inputChecksum,
    resultChecksum,
    quantityChecksum: quantityChecksumFinal,
    mode: "DEVELOPMENT",
    authorizationStatus: "NOT_GRANTED",
    designOrConstructionUse: "PROHIBITED",
    developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY",
    stale,
    warnings,
    identity: { reportId, projectId: project.project.id, mode: "DEVELOPMENT" },
    metadata: {
      schemaVersion: REPORT_MODEL_SCHEMA_VERSION,
      reportId,
      projectId: project.project.id,
      generatedAt,
      inputRevision,
      inputChecksum,
      resultChecksum,
      quantityChecksum: quantityChecksumFinal,
    },
    project: {
      projectId: project.project.id,
      projectName: project.project.name,
      projectNumber: null,
      createdAt: project.project.createdAt ?? null,
    },
    bridge: {
      bridgeSystem,
      spanSystem,
      bridgeLength: draft.bridgeLength,
      width: draft.width,
      girderCount: draft.girderCount,
      girderDepth: draft.girderDepth,
      spanCount,
      supportCount,
      adoptionStatus: getBridgeStructureUnitWeightAdoption(project, "steel"),
    },
    spans: (layout?.spans ?? []).map((s) => ({
      spanId: s.id,
      spanLength: isContinuous ? null : s.length,
      length: s.length,
    })),
    supports: (layout?.supports ?? []).map((s) => ({
      supportId: s.id,
      station: s.station,
      role: s.role === "ABUTMENT" ? "abutment" : isContinuous ? "pier" : "bearing",
      fixity: "NOT_IMPLEMENTED",
    })),
    girders,
    crossMembers: { count: crossBeamCount, spacing: draft.crossBeamSpacing, station: null },
    section: {
      spanLength: draft.spanLength,
      bridgeLength: draft.bridgeLength,
      width: draft.width,
      girderCount: draft.girderCount,
      girderSpacing: draft.girderSpacing,
      girderDepth: draft.girderDepth,
      topFlangeWidth: draft.topFlangeWidth,
      topFlangeThickness: draft.topFlangeThickness,
      bottomFlangeWidth: draft.bottomFlangeWidth,
      bottomFlangeThickness: draft.bottomFlangeThickness,
      webThickness: draft.webThickness,
      deckThickness: draft.deckThickness,
      crossBeamSpacing: draft.crossBeamSpacing,
      properties: sectionProps,
    },
    materials: { steelUnitWeight: draft.steelUnitWeight, rcUnitWeight: draft.rcUnitWeight },
    adoption: { adoptionStatus: getBridgeStructureUnitWeightAdoption(project, "steel") },
    loads: { loadCaseCount: project.loadCases?.length ?? 0, detailAvailable: false },
    geometry: { solidsPresent: project.apolloBsdd != null, stlManifest: null },
    validation: { valid: layoutDiagnostics.length === 0 && !stale, issueCount: layoutDiagnostics.length },
    persistence: { inputRevision, stale, sidecarKeys: project.apolloBsdd != null ? ["apolloBridgeStructureInput"] : [] },
    authorization: { numericAuthorization: "NOT_GRANTED" as const, gate: "DS-09" },
    warningsChapter: {
      watermark: warnings,
      warnings,
      states: ["UNVERIFIED"],
      humanConfirmationItems: [...RESOLVED_H_ITEMS],
    },
    legacy: { legacy: project.apolloBsdd == null, legacyStatus },
    gaps: { ids: [...GAP_LIST] },
    evidence: {
      inputChecksum,
      resultChecksum,
      quantityChecksum: quantityChecksumFinal,
      inputRevision,
      generatedAt,
      dataSources: ["draft.bridgeSystem", "draft.spans", "draft.supports", "project.loadCases", "apolloBsdd.structuralDesignModel"],
      calculationReferenceIds: ["GOLD-SP-001", "GOLD-AN-001", "GOLD-QTY-001"],
      appCommitSha: options?.appCommitSha ?? null,
    },
    chapters,
    deprecatedAliases: CH_TO_CP as unknown as ContinuousReportModel["deprecatedAliases"],
    audit: {
      schemaVersions: [REPORT_MODEL_SCHEMA_VERSION, quantity.schemaVersion],
      calcRefs: ["GOLD-SP-001", "GOLD-AN-001", "GOLD-QTY-001"],
      formalOkNgEmitted: false,
    },
  };
}

export function continuousReportModelToJson(model: ContinuousReportModel): string {
  return `${JSON.stringify(model, null, 2)}\n`;
}

/**
 * Read/export gate for the canonical continuous-girder report model.
 * Fail-closed: rejects any model that fails Phase 4-D validation (VR-01..VR-26)
 * or that carries a non-development authorization posture. Mirrors the legacy
 * `assertDevelopmentReportExportable` gate applied to the legacy ReportModel.
 */
export function assertContinuousReportExportable(model: ContinuousReportModel): void {
  if (model.authorizationStatus !== "NOT_GRANTED") {
    throw new Error("continuous report export rejected: authorizationStatus (NUMERIC_DESIGN_AUTHORIZATION)");
  }
  if (model.designOrConstructionUse !== "PROHIBITED") {
    throw new Error("continuous report export rejected: designOrConstructionUse");
  }
  if (model.audit.formalOkNgEmitted !== false) {
    throw new Error("continuous report export rejected: formalOkNgEmitted must be false");
  }
  assertReportModelValid(model);
}
