import type {
  FrameAnalysisResultDiagnostic,
  FrameAnalysisResultKind,
  FrameAnalysisResultResource,
} from "../contracts/frameAnalysisResultResource";
import type { AnalysisResult, TimeHistoryResult } from "../types";
import {
  evaluateIf3ResultGate,
  isRawAnalysisResultCandidate,
  resolveTransientIf3AvailabilityStatus,
  type If3AvailabilityStatus,
  type If3ResultGateInput,
  type If3ResultGateResult,
} from "./if3ResultGate";

/**
 * IF3-E legacy / pre-IF3 compatibility policy.
 *
 * OLD_ANALYSIS_RESULT_POLICY: READ_OLD_WRITE_TARGET
 * - Read old AnalysisResult / legacy time-history as compatibility input only.
 * - Never invent missing identity, binding, checksum, provenance, or payload.
 * - Authoritative export / formal PRINT require a validated IF3 resource.
 */

export const OLD_ANALYSIS_RESULT_POLICY = "READ_OLD_WRITE_TARGET" as const;

export const IF3_COMPATIBILITY_CLASSES = [
  "IF3_COMPATIBLE_CURRENT",
  "LEGACY_SAFELY_CONSUMABLE",
  "LEGACY_INSUFFICIENT_PROVENANCE",
  "MALFORMED_UNSUPPORTED",
  "STALE",
  "MISSING_REQUIRED_MEMBERS",
] as const;

export type If3CompatibilityClass = (typeof IF3_COMPATIBILITY_CLASSES)[number];

export type If3ConsumerKind = "report" | "viewer" | "draft" | "print" | "csv" | "pdf";

export type If3ConsumerCapability = {
  readonly readable: boolean;
  readonly displayable: boolean;
  readonly exportable: boolean;
  readonly formalPrintable: boolean;
  readonly recomputeRecommended: boolean;
  readonly hardBlockAuthoritative: boolean;
};

export type If3WriteTargetEligibility = {
  readonly eligible: boolean;
  readonly policy: typeof OLD_ANALYSIS_RESULT_POLICY;
  readonly missingFields: readonly string[];
  readonly diagnostics: readonly FrameAnalysisResultDiagnostic[];
};

export type If3CompatibilityAssessment = {
  readonly compatibilityClass: If3CompatibilityClass;
  readonly policy: typeof OLD_ANALYSIS_RESULT_POLICY;
  readonly gate: If3ResultGateResult;
  readonly consumerCapabilities: Readonly<Record<If3ConsumerKind, If3ConsumerCapability>>;
  readonly writeTarget: If3WriteTargetEligibility;
  readonly diagnostics: readonly FrameAnalysisResultDiagnostic[];
};

export type If3LegacyCompatibilityInput = If3ResultGateInput & {
  readonly rawResult?: AnalysisResult | null;
  readonly legacyTimeHistory?: TimeHistoryResult | null;
  readonly requiredResultKinds?: readonly FrameAnalysisResultKind[];
  /** Explicit promotion metadata only. Missing values stay unknown; never invented. */
  readonly writeTargetMetadata?: If3WriteTargetMetadata | null;
};

export type If3WriteTargetMetadata = {
  readonly sourceDocumentId?: string;
  readonly sourceDocumentVersion?: number;
  readonly sourceContentChecksumHex?: string;
  readonly analysisSettingsChecksumHex?: string;
  readonly provenanceCreatedAt?: string;
  readonly provenanceActorId?: string;
  readonly provenanceProducerToolId?: string;
  readonly provenanceProducerToolVersion?: string;
  readonly solverName?: string;
  readonly solverVersion?: string;
};

const LINEAR_STATIC_REQUIRED_KINDS: readonly FrameAnalysisResultKind[] = [
  "nodeDisplacement",
  "supportReaction",
  "memberForce",
];

const WRITE_TARGET_REQUIRED_FIELDS = [
  "sourceDocumentId",
  "sourceDocumentVersion",
  "sourceContentChecksumHex",
  "analysisSettingsChecksumHex",
  "provenanceCreatedAt",
  "provenanceActorId",
  "provenanceProducerToolId",
  "provenanceProducerToolVersion",
  "solverName",
  "solverVersion",
] as const;

export function classifyIf3Compatibility(
  input: If3LegacyCompatibilityInput,
): If3CompatibilityAssessment {
  const gate = evaluateIf3ResultGate({
    resource: input.resource,
    availabilityStatus: input.availabilityStatus,
    availabilityDiagnostics: input.availabilityDiagnostics,
    sourceDocument: input.sourceDocument,
  });

  const rawCandidate =
    input.rawResult ??
    (input.resource != null && isRawAnalysisResultCandidate(input.resource)
      ? (input.resource as unknown as AnalysisResult)
      : null);

  if (rawCandidate != null && input.resource == null) {
    return assessLegacyRaw(rawCandidate, gate, input.writeTargetMetadata ?? null);
  }

  if (input.resource != null && isRawAnalysisResultCandidate(input.resource)) {
    return assessLegacyRaw(
      input.resource as unknown as AnalysisResult,
      gate,
      input.writeTargetMetadata ?? null,
    );
  }

  if (input.resource == null) {
    if (input.legacyTimeHistory != null) {
      return assessLegacyTimeHistory(input.legacyTimeHistory, gate, input.writeTargetMetadata ?? null);
    }
    return finalizeAssessment({
      compatibilityClass: "MALFORMED_UNSUPPORTED",
      gate,
      writeTarget: blockedWriteTarget([
        diagnostic(
          "MISSING_RESULT_ID",
          "No FrameAnalysisResultResource or legacy compatibility input is available.",
        ),
      ]),
      extraDiagnostics: [
        diagnostic(
          "MISSING_RESULT_ID",
          "No FrameAnalysisResultResource or legacy compatibility input is available.",
        ),
      ],
    });
  }

  const availability =
    input.availabilityStatus ?? resolveTransientIf3AvailabilityStatus(input.resource);

  if (availability === "STALE" || input.resource.status === "STALE" || gate.state === "STALE") {
    return finalizeAssessment({
      compatibilityClass: "STALE",
      gate,
      writeTarget: blockedWriteTarget([
        diagnostic("STALE_RESULT", "Stale IF3 resources must not be rewritten as authoritative."),
      ]),
      extraDiagnostics: [diagnostic("STALE_RESULT", "Result is stale relative to the current source.")],
    });
  }

  if (
    availability === "UNSUPPORTED" ||
    input.resource.status === "UNSUPPORTED" ||
    gate.state === "UNSUPPORTED" ||
    availability === "INVALID" ||
    input.resource.status === "INVALID" ||
    gate.state === "INVALID"
  ) {
    return finalizeAssessment({
      compatibilityClass: "MALFORMED_UNSUPPORTED",
      gate,
      writeTarget: blockedWriteTarget([
        diagnostic(
          "UNSUPPORTED_RESULT_VERSION",
          "Malformed or unsupported IF3 resources cannot be promoted.",
        ),
      ]),
      extraDiagnostics: [
        diagnostic(
          "UNSUPPORTED_RESULT_VERSION",
          "Resource is malformed, invalid, or unsupported for authoritative consumption.",
        ),
      ],
    });
  }

  const requiredKinds = input.requiredResultKinds ?? LINEAR_STATIC_REQUIRED_KINDS;
  const missingKinds = findMissingRequiredKinds(input.resource, requiredKinds);
  if (missingKinds.length > 0) {
    return finalizeAssessment({
      compatibilityClass: "MISSING_REQUIRED_MEMBERS",
      gate: {
        ...gate,
        authoritativeOutputAllowed: false,
      },
      writeTarget: blockedWriteTarget([
        diagnostic(
          "UNSUPPORTED_RESULT_KIND",
          `Required result members are missing: ${missingKinds.join(", ")}.`,
        ),
      ]),
      extraDiagnostics: [
        diagnostic(
          "UNSUPPORTED_RESULT_KIND",
          `Required result members are missing: ${missingKinds.join(", ")}.`,
        ),
      ],
    });
  }

  if (!hasUsableProvenance(input.resource)) {
    return finalizeAssessment({
      compatibilityClass: "LEGACY_INSUFFICIENT_PROVENANCE",
      gate: {
        ...gate,
        authoritativeOutputAllowed: false,
        diagnostics: sortDiagnostics([
          ...gate.diagnostics,
          diagnostic("MISSING_PROVENANCE", "Result provenance is missing or incomplete."),
        ]),
      },
      writeTarget: blockedWriteTarget([
        diagnostic(
          "MISSING_PROVENANCE",
          "WRITE_TARGET is blocked because provenance is missing; values are not invented.",
        ),
      ]),
      extraDiagnostics: [
        diagnostic("MISSING_PROVENANCE", "Result provenance is missing or incomplete."),
      ],
    });
  }

  if (gate.authoritativeOutputAllowed && gate.state === "VALID") {
    return finalizeAssessment({
      compatibilityClass: "IF3_COMPATIBLE_CURRENT",
      gate,
      writeTarget: {
        eligible: false,
        policy: OLD_ANALYSIS_RESULT_POLICY,
        missingFields: [],
        diagnostics: [
          diagnostic(
            "IF3_ALREADY_TARGET",
            "Resource is already an IF3 target; no legacy WRITE_TARGET promotion is required.",
            "info",
          ),
        ],
      },
      extraDiagnostics: [],
    });
  }

  return finalizeAssessment({
    compatibilityClass: "LEGACY_INSUFFICIENT_PROVENANCE",
    gate: {
      ...gate,
      authoritativeOutputAllowed: false,
    },
    writeTarget: evaluateWriteTargetEligibility(input.writeTargetMetadata ?? null),
    extraDiagnostics: [
      diagnostic(
        "LEGACY_QUARANTINED",
        "Candidate is not authoritative IF3-compatible; quarantine for authoritative consumers.",
      ),
    ],
  });
}

export function evaluateWriteTargetEligibility(
  metadata: If3WriteTargetMetadata | null | undefined,
): If3WriteTargetEligibility {
  const missingFields = WRITE_TARGET_REQUIRED_FIELDS.filter((field) => {
    const value = metadata?.[field];
    if (typeof value === "number") {
      return !Number.isFinite(value) || value <= 0;
    }
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missingFields.length > 0) {
    return blockedWriteTarget(
      [
        diagnostic(
          "WRITE_TARGET_METADATA_INCOMPLETE",
          `WRITE_TARGET blocked; unknown/unavailable fields: ${missingFields.join(", ")}. Provenance is not invented.`,
        ),
      ],
      missingFields,
    );
  }

  return {
    eligible: true,
    policy: OLD_ANALYSIS_RESULT_POLICY,
    missingFields: [],
    diagnostics: [
      diagnostic(
        "WRITE_TARGET_METADATA_COMPLETE",
        "Explicit WRITE_TARGET metadata is complete. Promotion may proceed only through the IF3 normalizer.",
        "info",
      ),
    ],
  };
}

export function consumerCapabilitiesForClass(
  compatibilityClass: If3CompatibilityClass,
): Readonly<Record<If3ConsumerKind, If3ConsumerCapability>> {
  switch (compatibilityClass) {
    case "IF3_COMPATIBLE_CURRENT":
      return matrix({
        readable: true,
        displayable: true,
        exportable: true,
        formalPrintable: true,
        recomputeRecommended: false,
        hardBlockAuthoritative: false,
      });
    case "STALE":
      return {
        report: capability(true, true, false, false, true, true),
        viewer: capability(true, true, false, false, true, false),
        draft: capability(true, false, false, false, true, true),
        print: capability(true, false, false, false, true, true),
        csv: capability(true, false, false, false, true, true),
        pdf: capability(true, false, false, false, true, true),
      };
    case "LEGACY_SAFELY_CONSUMABLE":
      return {
        report: capability(true, false, false, false, true, true),
        viewer: capability(true, true, false, false, true, false),
        draft: capability(true, false, false, false, true, true),
        print: capability(true, false, false, false, true, true),
        csv: capability(true, false, false, false, true, true),
        pdf: capability(true, false, false, false, true, true),
      };
    case "LEGACY_INSUFFICIENT_PROVENANCE":
      return {
        report: capability(true, false, false, false, true, true),
        viewer: capability(true, true, false, false, true, true),
        draft: capability(true, false, false, false, true, true),
        print: capability(true, false, false, false, true, true),
        csv: capability(true, false, false, false, true, true),
        pdf: capability(true, false, false, false, true, true),
      };
    case "MISSING_REQUIRED_MEMBERS":
      return {
        report: capability(true, false, false, false, true, true),
        viewer: capability(true, true, false, false, true, true),
        draft: capability(true, false, false, false, true, true),
        print: capability(true, false, false, false, true, true),
        csv: capability(true, false, false, false, true, true),
        pdf: capability(true, false, false, false, true, true),
      };
    case "MALFORMED_UNSUPPORTED":
    default:
      return matrix({
        readable: false,
        displayable: false,
        exportable: false,
        formalPrintable: false,
        recomputeRecommended: true,
        hardBlockAuthoritative: true,
      });
  }
}

function assessLegacyRaw(
  raw: AnalysisResult,
  gate: If3ResultGateResult,
  metadata: If3WriteTargetMetadata | null,
): If3CompatibilityAssessment {
  const writeTarget = evaluateWriteTargetEligibility(metadata);
  const shapeOk = isReadableLegacyAnalysisResult(raw);
  if (!shapeOk) {
    return finalizeAssessment({
      compatibilityClass: "MALFORMED_UNSUPPORTED",
      gate: {
        ...gate,
        authoritativeOutputAllowed: false,
        state: "INVALID",
        resultRef: null,
      },
      writeTarget: blockedWriteTarget([
        diagnostic("RAW_ANALYSIS_RESULT_REJECTED", "Legacy AnalysisResult shape is malformed."),
      ]),
      extraDiagnostics: [
        diagnostic("RAW_ANALYSIS_RESULT_REJECTED", "Legacy AnalysisResult shape is malformed."),
      ],
    });
  }

  if (writeTarget.eligible) {
    return finalizeAssessment({
      compatibilityClass: "LEGACY_SAFELY_CONSUMABLE",
      gate: {
        ...gate,
        authoritativeOutputAllowed: false,
        state: "INVALID",
        resultRef: null,
        diagnostics: sortDiagnostics([
          ...gate.diagnostics,
          diagnostic(
            "RAW_ANALYSIS_RESULT_REJECTED",
            "Raw AnalysisResult is compatibility input only until normalized and registered as IF3.",
          ),
        ]),
      },
      writeTarget,
      extraDiagnostics: [
        diagnostic(
          "LEGACY_COMPATIBILITY_INPUT",
          "Legacy AnalysisResult is readable as compatibility input. Authoritative export remains blocked until WRITE_TARGET normalization.",
          "info",
        ),
      ],
    });
  }

  return finalizeAssessment({
    compatibilityClass: "LEGACY_INSUFFICIENT_PROVENANCE",
    gate: {
      ...gate,
      authoritativeOutputAllowed: false,
      state: "INVALID",
      resultRef: null,
      diagnostics: sortDiagnostics([
        ...gate.diagnostics,
        diagnostic(
          "RAW_ANALYSIS_RESULT_REJECTED",
          "Raw AnalysisResult cannot be used as an authoritative IF3 consumer input.",
        ),
        diagnostic(
          "MISSING_PROVENANCE",
          "Legacy result lacks explicit WRITE_TARGET provenance/binding metadata; values are not invented.",
        ),
      ]),
    },
    writeTarget,
    extraDiagnostics: [
      diagnostic(
        "LEGACY_QUARANTINED",
        "Legacy result is quarantined for authoritative consumers due to insufficient provenance/binding.",
      ),
    ],
  });
}

function assessLegacyTimeHistory(
  legacy: TimeHistoryResult,
  gate: If3ResultGateResult,
  metadata: If3WriteTargetMetadata | null,
): If3CompatibilityAssessment {
  const readable =
    legacy != null &&
    typeof legacy === "object" &&
    legacy.meta != null &&
    Array.isArray(legacy.time);
  const writeTarget = evaluateWriteTargetEligibility(metadata);

  if (!readable) {
    return finalizeAssessment({
      compatibilityClass: "MALFORMED_UNSUPPORTED",
      gate: {
        ...gate,
        authoritativeOutputAllowed: false,
        state: "INVALID",
        resultRef: null,
      },
      writeTarget: blockedWriteTarget([
        diagnostic(
          "UNSUPPORTED_RESULT_KIND",
          "Legacy timeHistory payload is malformed.",
        ),
      ]),
      extraDiagnostics: [
        diagnostic("UNSUPPORTED_RESULT_KIND", "Legacy timeHistory payload is malformed."),
      ],
    });
  }

  return finalizeAssessment({
    compatibilityClass: writeTarget.eligible
      ? "LEGACY_SAFELY_CONSUMABLE"
      : "LEGACY_INSUFFICIENT_PROVENANCE",
    gate: {
      ...gate,
      authoritativeOutputAllowed: false,
      state: writeTarget.eligible ? gate.state : "INVALID",
      resultRef: null,
      diagnostics: sortDiagnostics([
        ...gate.diagnostics,
        diagnostic(
          "LEGACY_TIME_HISTORY_COMPATIBILITY",
          "Legacy analysisResults.timeHistory is compatibility input only; not an authoritative IF3 Frame PRINT/CSV source.",
          "info",
        ),
        ...(writeTarget.eligible
          ? []
          : [
              diagnostic(
                "MISSING_PROVENANCE",
                "Legacy timeHistory lacks explicit WRITE_TARGET provenance/binding metadata; values are not invented.",
              ),
            ]),
      ]),
    },
    writeTarget,
    extraDiagnostics: writeTarget.eligible
      ? [
          diagnostic(
            "LEGACY_COMPATIBILITY_INPUT",
            "Legacy timeHistory may be displayed as compatibility input. WRITE_TARGET requires normalizer registration.",
            "info",
          ),
        ]
      : [
          diagnostic(
            "LEGACY_QUARANTINED",
            "Legacy timeHistory is quarantined for authoritative Frame consumers.",
          ),
        ],
  });
}

function findMissingRequiredKinds(
  resource: FrameAnalysisResultResource,
  requiredKinds: readonly FrameAnalysisResultKind[],
): FrameAnalysisResultKind[] {
  const declared = new Set(resource.resultKinds ?? Object.keys(resource.payload));
  return requiredKinds.filter((kind) => {
    if (!declared.has(kind)) {
      return true;
    }
    const entry = resource.payload[kind];
    return entry == null || !Array.isArray(entry.rows);
  });
}

function hasUsableProvenance(resource: FrameAnalysisResultResource): boolean {
  const provenance = resource.provenance;
  if (provenance == null) {
    return false;
  }
  return (
    typeof provenance.createdAt === "string" &&
    provenance.createdAt.trim().length > 0 &&
    provenance.createdBy != null &&
    typeof provenance.createdBy.actorId === "string" &&
    provenance.createdBy.actorId.trim().length > 0 &&
    provenance.producer != null &&
    typeof provenance.producer.toolId === "string" &&
    provenance.producer.toolId.trim().length > 0 &&
    typeof provenance.producer.toolVersion === "string" &&
    provenance.producer.toolVersion.trim().length > 0
  );
}

function isReadableLegacyAnalysisResult(value: AnalysisResult): boolean {
  return (
    typeof value.projectId === "string" &&
    Array.isArray(value.displacements) &&
    Array.isArray(value.reactions) &&
    Array.isArray(value.memberEndForces)
  );
}

function finalizeAssessment(input: {
  compatibilityClass: If3CompatibilityClass;
  gate: If3ResultGateResult;
  writeTarget: If3WriteTargetEligibility;
  extraDiagnostics: readonly FrameAnalysisResultDiagnostic[];
}): If3CompatibilityAssessment {
  const diagnostics = sortDiagnostics([
    ...input.gate.diagnostics,
    ...input.writeTarget.diagnostics,
    ...input.extraDiagnostics,
  ]);
  return {
    compatibilityClass: input.compatibilityClass,
    policy: OLD_ANALYSIS_RESULT_POLICY,
    gate: {
      ...input.gate,
      diagnostics,
      authoritativeOutputAllowed:
        input.compatibilityClass === "IF3_COMPATIBLE_CURRENT"
          ? input.gate.authoritativeOutputAllowed
          : false,
    },
    consumerCapabilities: consumerCapabilitiesForClass(input.compatibilityClass),
    writeTarget: input.writeTarget,
    diagnostics,
  };
}

function blockedWriteTarget(
  diagnostics: readonly FrameAnalysisResultDiagnostic[],
  missingFields: readonly string[] = [],
): If3WriteTargetEligibility {
  return {
    eligible: false,
    policy: OLD_ANALYSIS_RESULT_POLICY,
    missingFields,
    diagnostics,
  };
}

function matrix(
  shared: If3ConsumerCapability,
): Readonly<Record<If3ConsumerKind, If3ConsumerCapability>> {
  return {
    report: shared,
    viewer: shared,
    draft: shared,
    print: shared,
    csv: shared,
    pdf: shared,
  };
}

function capability(
  readable: boolean,
  displayable: boolean,
  exportable: boolean,
  formalPrintable: boolean,
  recomputeRecommended: boolean,
  hardBlockAuthoritative: boolean,
): If3ConsumerCapability {
  return {
    readable,
    displayable,
    exportable,
    formalPrintable,
    recomputeRecommended,
    hardBlockAuthoritative,
  };
}

function diagnostic(
  code: string,
  message: string,
  severity: FrameAnalysisResultDiagnostic["severity"] = "error",
): FrameAnalysisResultDiagnostic {
  return {
    code,
    severity,
    producer: "if3-e.legacy-compatibility",
    message,
  };
}

function sortDiagnostics(
  diagnostics: readonly FrameAnalysisResultDiagnostic[],
): FrameAnalysisResultDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const leftKey = `${left.code}\u0000${left.severity}\u0000${left.producer}\u0000${left.message}\u0000${left.path ?? ""}`;
    const rightKey = `${right.code}\u0000${right.severity}\u0000${right.producer}\u0000${right.message}\u0000${right.path ?? ""}`;
    return leftKey.localeCompare(rightKey);
  });
}
