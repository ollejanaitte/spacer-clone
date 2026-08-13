/**
 * Road -> downstream STALE / INVALID (Phase 7.2 FROZEN D-10 / Phase 7.3 WP-J).
 *
 * Road edits invalidate downstream products (Bridge Layout / Superstructure /
 * Substructure / Analysis / Road CIM). The rule uses the canonical roadData
 * contentChecksum as a fingerprint: downstream products bind to the checksum
 * they were generated from; when the current roadData checksum differs, the
 * downstream product is STALE (recompute required) or INVALID (a referenced
 * alignment/line no longer exists).
 *
 * This is consistent with the Phase 7 Analysis stale contract (fingerprint
 * comparison in the 3-gate evaluation).
 */

import type { CanonicalRoadData } from "./roadDataSchema";
import { editorDraftChecksum } from "./roadEditorDraft";
import type { BuildIntermediateInput } from "../../../liner/core/pipeline/pipeline";

export type RoadChangeImpact =
  | "no_impact"
  | "recompute"
  | "stale"
  | "invalid";

export interface DownstreamBinding {
  /** Checksum of the roadData this downstream product was generated from. */
  readonly roadChecksum: string;
  /** Alignment/line ids referenced by the downstream product. */
  readonly referencedLineIds: readonly string[];
}

export interface RoadChangeContext {
  /** Current canonical roadData (after the change). */
  readonly current: CanonicalRoadData;
  /** The downstream product binding recorded at generation time. */
  readonly binding: DownstreamBinding;
}

/**
 * Evaluate the impact of a road change on a downstream product.
 * - no_impact: the roadData checksum is unchanged.
 * - stale: the checksum changed but all referenced lines still exist.
 * - invalid: a referenced line no longer exists (fail-closed).
 */
export function evaluateRoadChangeImpact(context: RoadChangeContext): RoadChangeImpact {
  const currentChecksum = context.current.contentChecksum;
  if (currentChecksum === context.binding.roadChecksum) {
    return "no_impact";
  }
  // Check referenced line existence against the current canonical alignments.
  const currentLineIds = new Set<string>();
  for (const bundle of context.current.domainDraft.alignments ?? []) {
    if (bundle && typeof bundle === "object") {
      const lines = (bundle as { lines?: readonly { id: string }[] }).lines;
      for (const line of lines ?? []) {
        currentLineIds.add(line.id);
      }
    }
  }
  const missing = context.binding.referencedLineIds.some((id) => !currentLineIds.has(id));
  return missing ? "invalid" : "stale";
}

/**
 * Compute the editor-draft checksum used as the downstream binding fingerprint.
 * (Convenience wrapper over the editor bridge for UI-level binding.)
 */
export function roadBindingChecksumForDraft(draft: BuildIntermediateInput): string {
  return editorDraftChecksum(draft);
}
