import {
  createDefaultCrossFrameAttachment,
  type ApolloCrossFrameAttachmentDraft,
  type CrossFramePattern,
} from "./crossFrameAttachmentTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const PATTERNS: readonly CrossFramePattern[] = ["V", "INVERTED_V", "X"];

export function parseCrossFrameAttachment(raw: unknown): ApolloCrossFrameAttachmentDraft | null {
  if (raw === undefined || raw === null) {
    return createDefaultCrossFrameAttachment();
  }
  if (!isRecord(raw)) return null;
  const pattern = raw.pattern;
  if (typeof pattern !== "string" || !(PATTERNS as readonly string[]).includes(pattern)) {
    return null;
  }
  const upper = raw.upperAttachmentDepthFromGirderTop;
  const lower = raw.lowerAttachmentDepthFromGirderTop;
  const center = raw.centerNodeDepthFromGirderTop;
  if (upper !== null && (typeof upper !== "number" || !Number.isFinite(upper))) return null;
  if (lower !== null && (typeof lower !== "number" || !Number.isFinite(lower))) return null;
  if (center !== null && center !== undefined && (typeof center !== "number" || !Number.isFinite(center))) {
    return null;
  }
  const provenance = raw.provenance;
  return {
    pattern: pattern as CrossFramePattern,
    upperAttachmentDepthFromGirderTop: upper === undefined ? null : upper,
    lowerAttachmentDepthFromGirderTop: lower === undefined ? null : lower,
    centerNodeDepthFromGirderTop: center === undefined ? null : center,
    provenance:
      provenance === "USER_PROVIDED_UNVERIFIED" || provenance === "UNVERIFIED_MIGRATED_DEVELOPMENT"
        ? provenance
        : "UNVERIFIED_SAMPLE_PLACEHOLDER",
    status: "DEVELOPMENT",
  };
}

export function validateCrossFrameAttachmentPersistence(raw: unknown): readonly string[] {
  if (raw === undefined || raw === null) return [];
  if (parseCrossFrameAttachment(raw) === null) {
    return ["apolloBridgeStructureInput.crossFrameAttachment is invalid."];
  }
  return [];
}

export { createDefaultCrossFrameAttachment };
