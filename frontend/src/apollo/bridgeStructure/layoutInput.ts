import type { ProjectModel } from "../../types";
import {
  BridgeSystem,
  CONTINUOUS_SPAN_COUNT_MAX,
  CONTINUOUS_SPAN_COUNT_MIN,
  buildContinuousLayout,
  buildSupportsFromSpans,
  sumSpanLengths,
  type BridgeLayoutSpan,
} from "../contracts";
import { withBridgeStructureInputDraft } from "./generateBsdd";

export const BRIDGE_SYSTEM_LABELS = {
  [BridgeSystem.SIMPLE_SINGLE]: "単径間単純桁（現在対応）",
  [BridgeSystem.CONTINUOUS]: "連続桁（試験対応）",
} as const;

export type SelectableBridgeSystem = keyof typeof BRIDGE_SYSTEM_LABELS;

export function withBridgeStructureSystem(
  project: ProjectModel,
  bridgeSystem: SelectableBridgeSystem,
): ProjectModel {
  return withBridgeStructureInputDraft(project, (draft) => {
    if (draft.bridgeSystem === bridgeSystem) {
      return draft;
    }

    if (bridgeSystem === BridgeSystem.CONTINUOUS) {
      let spanLengths: number[];
      if (draft.spans.length >= CONTINUOUS_SPAN_COUNT_MIN) {
        spanLengths = draft.spans.map((span) => span.length);
      } else if (draft.spanLength !== null) {
        spanLengths = [draft.spanLength, draft.spanLength];
      } else {
        spanLengths = [30, 30];
      }
      const layout = buildContinuousLayout(spanLengths);
      return {
        ...draft,
        bridgeSystem,
        spanLength: null,
        bridgeLength: sumSpanLengths(layout.spans),
        spans: layout.spans,
        supports: layout.supports,
        generatedAt: null,
      };
    }

    const totalLength =
      draft.bridgeLength ??
      (draft.spans.length > 0 ? sumSpanLengths(draft.spans) : null);
    return {
      ...draft,
      bridgeSystem: BridgeSystem.SIMPLE_SINGLE,
      spanLength: draft.spanLength ?? totalLength,
      bridgeLength: totalLength ?? draft.bridgeLength,
      spans: [],
      supports: [],
      generatedAt: null,
    };
  });
}

function rebuildContinuousLayout(spans: readonly BridgeLayoutSpan[]): {
  readonly spans: BridgeLayoutSpan[];
  readonly supports: ReturnType<typeof buildSupportsFromSpans>;
  readonly bridgeLength: number;
} {
  const normalized = spans.map((span, index) => ({
    id: `span-${index}`,
    length: span.length,
  }));
  return {
    spans: normalized,
    supports: buildSupportsFromSpans(normalized),
    bridgeLength: sumSpanLengths(normalized),
  };
}

export function withContinuousSpanCount(project: ProjectModel, count: number): ProjectModel {
  const targetCount = Math.max(
    CONTINUOUS_SPAN_COUNT_MIN,
    Math.min(CONTINUOUS_SPAN_COUNT_MAX, count),
  );
  return withBridgeStructureInputDraft(project, (draft) => {
    if (draft.bridgeSystem !== BridgeSystem.CONTINUOUS) {
      return draft;
    }

    let spans = [...draft.spans];
    while (spans.length < targetCount) {
      const lastLength = spans[spans.length - 1]?.length ?? 30;
      spans.push({ id: `span-${spans.length}`, length: lastLength });
    }
    while (spans.length > targetCount) {
      spans = spans.slice(0, -1);
    }

    const layout = rebuildContinuousLayout(spans);
    return {
      ...draft,
      spans: layout.spans,
      supports: layout.supports,
      bridgeLength: layout.bridgeLength,
      generatedAt: null,
    };
  });
}

export function addContinuousSpan(project: ProjectModel): ProjectModel {
  const draft = project.apolloBridgeStructureInput;
  const currentCount = draft?.spans.length ?? CONTINUOUS_SPAN_COUNT_MIN;
  return withContinuousSpanCount(project, currentCount + 1);
}

export function removeContinuousSpan(project: ProjectModel): ProjectModel {
  const draft = project.apolloBridgeStructureInput;
  const currentCount = draft?.spans.length ?? CONTINUOUS_SPAN_COUNT_MIN;
  return withContinuousSpanCount(project, currentCount - 1);
}

export function withContinuousSpanLength(
  project: ProjectModel,
  index: number,
  length: number,
): ProjectModel {
  return withBridgeStructureInputDraft(project, (draft) => {
    if (draft.bridgeSystem !== BridgeSystem.CONTINUOUS) {
      return draft;
    }
    if (index < 0 || index >= draft.spans.length) {
      return draft;
    }

    const spans = draft.spans.map((span, spanIndex) =>
      spanIndex === index ? { ...span, length } : span,
    );
    const layout = rebuildContinuousLayout(spans);
    return {
      ...draft,
      spans: layout.spans,
      supports: layout.supports,
      bridgeLength: layout.bridgeLength,
      generatedAt: null,
    };
  });
}
