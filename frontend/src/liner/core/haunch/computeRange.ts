import type { HaunchDefinitionDraft } from "../../schema/types";
import type { HaunchComputeContext } from "./computeContext";

type RangeDefinition = Extract<HaunchDefinitionDraft, { family: "range" }>;

/** Range modifiers update scope only — no numeric rows emitted. */
export function computeRange(
  _definition: RangeDefinition,
  _ctx: HaunchComputeContext,
): void {
  // Scope application is handled by resolveHaunchScope; validation covers bounds.
}
