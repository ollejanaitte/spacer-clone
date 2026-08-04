/**
 * Step 5-R R3: editable cross-frame / sway attachment topology (ER-001).
 * Depths are measured downward from girder top-flange upper face [m].
 * ENGINEERING_AUTHORIZATION remains PENDING_HUMAN_ENGINEERING_REVIEW.
 */

export type CrossFramePattern = "V" | "INVERTED_V" | "X";

export type ApolloCrossFrameAttachmentDraft = {
  readonly pattern: CrossFramePattern;
  /** Depth from girder top flange upper face down to upper attachment [m]. */
  readonly upperAttachmentDepthFromGirderTop: number | null;
  /** Depth from girder top flange upper face down to lower/center attachment [m]. */
  readonly lowerAttachmentDepthFromGirderTop: number | null;
  /**
   * Optional center node depth for V pattern; null → use lowerAttachmentDepth.
   */
  readonly centerNodeDepthFromGirderTop: number | null;
  readonly provenance: "UNVERIFIED_SAMPLE_PLACEHOLDER" | "USER_PROVIDED_UNVERIFIED" | "UNVERIFIED_MIGRATED_DEVELOPMENT";
  readonly status: "DEVELOPMENT";
};

/** Defaults match prior mid-flange V topology (development placeholder). */
export function createDefaultCrossFrameAttachment(
  girderDepth: number | null = 2.0,
  topFlangeThickness: number | null = 0.025,
  bottomFlangeThickness: number | null = 0.03,
): ApolloCrossFrameAttachmentDraft {
  const depth = girderDepth ?? 2.0;
  const topT = topFlangeThickness ?? 0.025;
  const bottomT = bottomFlangeThickness ?? 0.03;
  return {
    pattern: "V",
    upperAttachmentDepthFromGirderTop: topT / 2,
    lowerAttachmentDepthFromGirderTop: depth - bottomT / 2,
    centerNodeDepthFromGirderTop: null,
    provenance: "UNVERIFIED_SAMPLE_PLACEHOLDER",
    status: "DEVELOPMENT",
  };
}

export function validateCrossFrameAttachment(
  config: ApolloCrossFrameAttachmentDraft,
  girderDepth: number | null,
): readonly string[] {
  const errors: string[] = [];
  if (config.pattern !== "V") {
    errors.push(`pattern ${config.pattern} is PLANNED/UNAVAILABLE in Step 5-R (only V implemented)`);
  }
  const upper = config.upperAttachmentDepthFromGirderTop;
  const lower = config.lowerAttachmentDepthFromGirderTop;
  const center = config.centerNodeDepthFromGirderTop;
  if (upper === null || !Number.isFinite(upper) || upper < 0) {
    errors.push("upperAttachmentDepthFromGirderTop must be >= 0");
  }
  if (lower === null || !Number.isFinite(lower) || lower < 0) {
    errors.push("lowerAttachmentDepthFromGirderTop must be >= 0");
  }
  if (girderDepth !== null && Number.isFinite(girderDepth)) {
    if (upper !== null && upper > girderDepth) errors.push("upper depth exceeds girderDepth");
    if (lower !== null && lower > girderDepth) errors.push("lower depth exceeds girderDepth");
    if (center !== null && center > girderDepth) errors.push("center depth exceeds girderDepth");
  }
  if (upper !== null && lower !== null && !(upper < lower)) {
    errors.push("upperAttachmentDepth must be less than lowerAttachmentDepth");
  }
  if (center !== null && (!Number.isFinite(center) || center < 0)) {
    errors.push("centerNodeDepthFromGirderTop must be >= 0 when provided");
  }
  return errors;
}

/**
 * Convert depth-from-top to absolute Z using girder top flange upper face.
 * girderCenterZ is mid-depth of girder (existing convention).
 */
export function attachmentDepthToZ(
  girderCenterZ: number,
  girderDepth: number,
  depthFromTop: number,
): number {
  const topFlangeUpperZ = girderCenterZ + girderDepth / 2;
  return topFlangeUpperZ - depthFromTop;
}
