import type { BridgeFrameAnalysisDocument } from "../contracts/bridgeFrameAnalysisDocument";
import type { FrameAnalysisResultDiagnostic } from "../contracts/frameAnalysisResultResource";
import {
  evaluateIf3ResultGate,
  type If3AvailabilityStatus,
  type If3ConsumerState,
  type If3ResultGateInput,
  type If3ResultGateResult,
} from "../results/if3ResultGate";

export const SP1_NEUTRAL_FRAME_DRAWING_PATH_NOT_VERIFIED =
  "SP1_NEUTRAL_FRAME_DRAWING_PATH_NOT_VERIFIED" as const;

export type FrameDraftSheetKind =
  | "structureLayout"
  | "supportLoadLayout"
  | "resultDiagram"
  | "influenceLine"
  | "movingLoad";

export type FrameDraftSheetEligibility = {
  readonly sheetKind: FrameDraftSheetKind;
  readonly eligible: boolean;
  readonly authoritativeOutputAllowed: boolean;
  readonly state: If3ConsumerState;
  readonly diagnostics: readonly FrameAnalysisResultDiagnostic[];
};

export type DraftSheetEligibilityInput = {
  readonly frameDocument?: Pick<
    BridgeFrameAnalysisDocument,
    "documentId" | "structuralModel" | "loadDefinitions"
  > | null;
  readonly resource?: If3ResultGateInput["resource"];
  readonly availabilityStatus?: If3AvailabilityStatus | null;
  readonly availabilityDiagnostics?: readonly FrameAnalysisResultDiagnostic[];
  readonly sourceDocument?: If3ResultGateInput["sourceDocument"];
};

export type DraftSheetEligibilityResult = {
  readonly sheets: readonly FrameDraftSheetEligibility[];
  readonly sp1RemainingBlocker: typeof SP1_NEUTRAL_FRAME_DRAWING_PATH_NOT_VERIFIED;
  readonly gate: If3ResultGateResult;
};

const RESULT_BOUND_SHEETS = new Set<FrameDraftSheetKind>([
  "resultDiagram",
  "influenceLine",
  "movingLoad",
]);

export function evaluateDraftSheetEligibility(
  input: DraftSheetEligibilityInput,
): DraftSheetEligibilityResult {
  const gate = evaluateIf3ResultGate({
    resource: input.resource,
    availabilityStatus: input.availabilityStatus,
    availabilityDiagnostics: input.availabilityDiagnostics,
    sourceDocument: input.sourceDocument,
  });
  const frameReady = hasFrameDocumentGeometryOrLoads(input.frameDocument);
  const sheetKinds: FrameDraftSheetKind[] = [
    "structureLayout",
    "supportLoadLayout",
    "resultDiagram",
    "influenceLine",
    "movingLoad",
  ];

  const sheets = sheetKinds.map((sheetKind) =>
    evaluateSheetEligibility(sheetKind, gate, frameReady),
  );

  return {
    sheets,
    sp1RemainingBlocker: SP1_NEUTRAL_FRAME_DRAWING_PATH_NOT_VERIFIED,
    gate,
  };
}

function evaluateSheetEligibility(
  sheetKind: FrameDraftSheetKind,
  gate: If3ResultGateResult,
  frameReady: boolean,
): FrameDraftSheetEligibility {
  const sp1Diagnostic = sp1BlockerDiagnostic();
  if (RESULT_BOUND_SHEETS.has(sheetKind)) {
    const eligible = gate.authoritativeOutputAllowed;
    return {
      sheetKind,
      eligible,
      authoritativeOutputAllowed: false,
      state: gate.state,
      diagnostics: eligible
        ? sortDiagnostics([...gate.diagnostics, sp1Diagnostic])
        : sortDiagnostics([
            ...gate.diagnostics,
            consumerDiagnostic(
              "DRAFT_RESULT_SHEET_BLOCKED",
              `${sheetKind} requires a VALID IF3-bound result resource.`,
            ),
            sp1Diagnostic,
          ]),
    };
  }

  return {
    sheetKind,
    eligible: frameReady,
    authoritativeOutputAllowed: false,
    state: frameReady ? gate.state : "MISSING",
    diagnostics: sortDiagnostics(
      frameReady
        ? [
            ...gate.diagnostics,
            sp1Diagnostic,
          ]
        : [
            consumerDiagnostic(
              "FRAME_SOURCE_MISSING",
              `${sheetKind} requires frame source geometry or load definitions.`,
            ),
            sp1Diagnostic,
          ],
    ),
  };
}

function hasFrameDocumentGeometryOrLoads(
  frameDocument: DraftSheetEligibilityInput["frameDocument"],
): boolean {
  if (frameDocument == null) {
    return false;
  }
  const hasNodes = (frameDocument.structuralModel?.nodes?.length ?? 0) > 0;
  const hasSupports = (frameDocument.structuralModel?.supports?.length ?? 0) > 0;
  const hasLoads = (frameDocument.loadDefinitions?.length ?? 0) > 0;
  return hasNodes || hasSupports || hasLoads;
}

function sp1BlockerDiagnostic(): FrameAnalysisResultDiagnostic {
  return {
    code: SP1_NEUTRAL_FRAME_DRAWING_PATH_NOT_VERIFIED,
    severity: "error",
    producer: "if3-d.draft-eligibility",
    message: "SP1 neutral Frame drawing path is not verified; authoritative DRAFT output remains blocked.",
  };
}

function consumerDiagnostic(code: string, message: string): FrameAnalysisResultDiagnostic {
  return {
    code,
    severity: "error",
    producer: "if3-d.draft-eligibility",
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
