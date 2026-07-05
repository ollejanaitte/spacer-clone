import type { SpanDraft } from "../../../schema/types";
import type { Bridge } from "../../types";
import type { NormalizationContext } from "./normalizationContext";

export function normalizeSpans(bridge: Bridge, ctx: NormalizationContext): SpanDraft[] {
  return bridge.spans.map((span, index) => {
    const startPhysicalDistance = ctx.toNormalized(
      span.startStation ?? 0,
      `spans[${index}].startStation`,
    );
    const endPhysicalDistance = ctx.toNormalized(
      span.endStation ?? 0,
      `spans[${index}].endStation`,
    );
    return {
      id: span.id,
      startPhysicalDistance,
      endPhysicalDistance,
    };
  });
}
