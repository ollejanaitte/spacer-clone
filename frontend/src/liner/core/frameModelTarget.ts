/**
 * Phase 3.9 helper for frame-model target lines.
 *
 * Cross-section offset lines and measured-grid lines can opt out of SPACER
 * frame-model generation with `frameModelEnabled === false`. The line remains
 * available for preview and measured-grid storage; only nodes, members, and
 * supports are excluded from the generated frame model.
 */

const FRAME_MODEL_DISABLED_LABELS = new Set(["HCL", "CL", "ECL"]);

function normalizeLabel(label: string | undefined): string {
  return (label ?? "").trim().toUpperCase();
}

/** Resolve the label-based default: HCL/CL/ECL are reference lines and default to false. */
export function defaultFrameModelEnabled(label: string | undefined): boolean {
  return !FRAME_MODEL_DISABLED_LABELS.has(normalizeLabel(label));
}

/** Resolve an individual line flag, falling back to the label default when undefined. */
export function resolveFrameModelEnabled(
  explicit: boolean | undefined,
  label: string | undefined,
): boolean {
  if (explicit === undefined) {
    return defaultFrameModelEnabled(label);
  }
  return explicit;
}

/** Label set for non-structural reference lines used by UI/docs. */
export const NON_FRAME_MODEL_LINE_LABELS: ReadonlySet<string> =
  FRAME_MODEL_DISABLED_LABELS;
