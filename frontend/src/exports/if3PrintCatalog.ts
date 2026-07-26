import {
  FRAME_ANALYSIS_RESULT_KINDS,
  type FrameAnalysisResultDiagnostic,
  type FrameAnalysisResultKind,
  type FrameAnalysisResultResource,
} from "../contracts/frameAnalysisResultResource";

export const IF3_PRINT_SUPPORTED_RESULT_KINDS = [
  "nodeDisplacement",
  "supportReaction",
  "memberForce",
] as const satisfies readonly FrameAnalysisResultKind[];

export type If3PrintCatalogStatus = "SUPPORTED" | "UNSUPPORTED" | "MISSING";
export type If3PrintConsumer = "report" | "print" | "csv" | "pdf";

export type If3PrintCatalogEntry = {
  readonly resultKind: FrameAnalysisResultKind;
  readonly status: If3PrintCatalogStatus;
  readonly consumers: readonly If3PrintConsumer[];
  readonly diagnostics: readonly FrameAnalysisResultDiagnostic[];
};

export type If3PrintCatalog = {
  readonly entries: readonly If3PrintCatalogEntry[];
  readonly diagnostics: readonly FrameAnalysisResultDiagnostic[];
  readonly ready: boolean;
};

const ALL_PRINT_CONSUMERS = ["report", "print", "csv", "pdf"] as const;
const SUPPORTED_KINDS = new Set<FrameAnalysisResultKind>(
  IF3_PRINT_SUPPORTED_RESULT_KINDS,
);

export function evaluateIf3PrintCatalog(
  resource: FrameAnalysisResultResource,
): If3PrintCatalog {
  const payloadKinds = Object.keys(resource.payload).filter(
    isFrameAnalysisResultKind,
  );
  const declaredKinds = (resource.resultKinds ?? payloadKinds).filter(
    isFrameAnalysisResultKind,
  );
  const catalogKinds = FRAME_ANALYSIS_RESULT_KINDS.filter(
    (kind) =>
      SUPPORTED_KINDS.has(kind) ||
      declaredKinds.includes(kind) ||
      payloadKinds.includes(kind),
  );

  const entries = catalogKinds.map((kind) =>
    buildCatalogEntry(resource, kind, declaredKinds, payloadKinds),
  );
  const diagnostics = entries.flatMap((entry) => entry.diagnostics);

  return {
    entries,
    diagnostics,
    ready:
      diagnostics.every((item) => item.severity !== "error") &&
      IF3_PRINT_SUPPORTED_RESULT_KINDS.every((kind) =>
        entries.some(
          (entry) => entry.resultKind === kind && entry.status === "SUPPORTED",
        ),
      ),
  };
}

function buildCatalogEntry(
  resource: FrameAnalysisResultResource,
  resultKind: FrameAnalysisResultKind,
  declaredKinds: readonly FrameAnalysisResultKind[],
  payloadKinds: readonly FrameAnalysisResultKind[],
): If3PrintCatalogEntry {
  const isPresent =
    declaredKinds.includes(resultKind) &&
    payloadKinds.includes(resultKind) &&
    resource.payload[resultKind] != null;

  if (SUPPORTED_KINDS.has(resultKind) && isPresent) {
    return {
      resultKind,
      status: "SUPPORTED",
      consumers: ALL_PRINT_CONSUMERS,
      diagnostics: [],
    };
  }

  if (SUPPORTED_KINDS.has(resultKind)) {
    return {
      resultKind,
      status: "MISSING",
      consumers: [],
      diagnostics: [
        catalogDiagnostic(
          "PRINT_CATALOG_REQUIRED_RESULT_MISSING",
          `PRINT catalog requires the ${resultKind} payload member.`,
          resultKind,
        ),
      ],
    };
  }

  return {
    resultKind,
    status: "UNSUPPORTED",
    consumers: [],
    diagnostics: [
      catalogDiagnostic(
        "PRINT_CATALOG_RESULT_KIND_UNSUPPORTED",
        `PRINT catalog does not support the declared ${resultKind} result kind.`,
        resultKind,
      ),
    ],
  };
}

function catalogDiagnostic(
  code: string,
  message: string,
  resultKind: FrameAnalysisResultKind,
): FrameAnalysisResultDiagnostic {
  return {
    code,
    severity: "error",
    producer: "pr40.print-catalog",
    message,
    path: `/payload/${resultKind}`,
    resultKind,
  };
}

function isFrameAnalysisResultKind(
  value: string,
): value is FrameAnalysisResultKind {
  return FRAME_ANALYSIS_RESULT_KINDS.includes(
    value as FrameAnalysisResultKind,
  );
}
