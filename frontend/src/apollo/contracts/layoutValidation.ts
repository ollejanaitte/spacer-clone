import {
  BridgeSystem,
  CONTINUOUS_SPAN_COUNT_MAX,
  CONTINUOUS_SPAN_COUNT_MIN,
  SupportLayoutRole,
  type BridgeLayoutSpan,
  type BridgeLayoutSupport,
} from "./layoutTypes";

export const LAYOUT_STATION_TOLERANCE = 1e-9;

export function resolveBridgeSystem(raw: unknown): BridgeSystem {
  if (raw === BridgeSystem.CONTINUOUS) {
    return BridgeSystem.CONTINUOUS;
  }
  if (raw === BridgeSystem.SIMPLE_MULTIPLE) {
    return BridgeSystem.SIMPLE_MULTIPLE;
  }
  return BridgeSystem.SIMPLE_SINGLE;
}

export function sumSpanLengths(spans: readonly BridgeLayoutSpan[]): number {
  return spans.reduce((total, span) => total + span.length, 0);
}

export function buildSupportsFromSpans(spans: readonly BridgeLayoutSpan[]): BridgeLayoutSupport[] {
  const supports: BridgeLayoutSupport[] = [];
  let station = 0;
  for (let index = 0; index <= spans.length; index += 1) {
    const role =
      index === 0 || index === spans.length
        ? SupportLayoutRole.ABUTMENT
        : SupportLayoutRole.PIER;
    supports.push({
      id: `support-${index}`,
      station,
      role,
    });
    if (index < spans.length) {
      station += spans[index]!.length;
    }
  }
  return supports;
}

export function buildSimpleSingleLayout(spanLength: number): {
  readonly spans: readonly BridgeLayoutSpan[];
  readonly supports: readonly BridgeLayoutSupport[];
} {
  return {
    spans: [{ id: "span-0", length: spanLength }],
    supports: buildSupportsFromSpans([{ id: "span-0", length: spanLength }]),
  };
}

export function buildContinuousLayout(spanLengths: readonly number[]): {
  readonly spans: readonly BridgeLayoutSpan[];
  readonly supports: readonly BridgeLayoutSupport[];
} {
  const spans = spanLengths.map((length, index) => ({
    id: `span-${index}`,
    length,
  }));
  return {
    spans,
    supports: buildSupportsFromSpans(spans),
  };
}

function validateUniqueIds(ids: readonly string[], label: string, diagnostics: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      diagnostics.push(`${label} の ID が重複しています: ${id}`);
      return;
    }
    seen.add(id);
  }
}

function validateSpanEntries(
  spans: readonly BridgeLayoutSpan[],
  diagnostics: string[],
): void {
  for (const [index, span] of spans.entries()) {
    if (typeof span.id !== "string" || span.id.length === 0) {
      diagnostics.push(`spans[${index}].id は空でない文字列である必要があります。`);
    }
    if (typeof span.length !== "number" || !Number.isFinite(span.length) || span.length <= 0) {
      diagnostics.push(`spans[${index}].length は 0 より大きい数値である必要があります。`);
    }
  }
  validateUniqueIds(
    spans.map((span) => span.id),
    "spans",
    diagnostics,
  );
}

function validateSupportEntries(
  supports: readonly BridgeLayoutSupport[],
  expectedCount: number,
  diagnostics: string[],
): void {
  if (supports.length !== expectedCount) {
    diagnostics.push(`支点数は支間数 + 1（${expectedCount}）である必要があります。`);
    return;
  }

  for (const [index, support] of supports.entries()) {
    if (typeof support.id !== "string" || support.id.length === 0) {
      diagnostics.push(`supports[${index}].id は空でない文字列である必要があります。`);
    }
    if (typeof support.station !== "number" || !Number.isFinite(support.station) || support.station < 0) {
      diagnostics.push(`supports[${index}].station は 0 以上の数値である必要があります。`);
    }
    if (
      support.role !== SupportLayoutRole.ABUTMENT &&
      support.role !== SupportLayoutRole.PIER
    ) {
      diagnostics.push(`supports[${index}].role は ABUTMENT または PIER である必要があります。`);
    }
  }

  validateUniqueIds(
    supports.map((support) => support.id),
    "supports",
    diagnostics,
  );

  for (let index = 1; index < supports.length; index += 1) {
    const previous = supports[index - 1]!;
    const current = supports[index]!;
    if (current.station <= previous.station) {
      diagnostics.push("支点 station は単調増加である必要があります。");
      break;
    }
  }

  if (supports.length > 0) {
    const first = supports[0]!;
    const last = supports[supports.length - 1]!;
    if (first.role !== SupportLayoutRole.ABUTMENT) {
      diagnostics.push("先端支点は ABUTMENT である必要があります。");
    }
    if (last.role !== SupportLayoutRole.ABUTMENT) {
      diagnostics.push("末端支点は ABUTMENT である必要があります。");
    }
    for (const support of supports.slice(1, -1)) {
      if (support.role !== SupportLayoutRole.PIER) {
        diagnostics.push("中間支点は PIER である必要があります。");
        break;
      }
    }
  }
}

function validateStationsMatchSpans(
  spans: readonly BridgeLayoutSpan[],
  supports: readonly BridgeLayoutSupport[],
  diagnostics: string[],
): void {
  if (supports.length !== spans.length + 1) {
    return;
  }

  let expectedStation = 0;
  if (Math.abs(supports[0]!.station - expectedStation) > LAYOUT_STATION_TOLERANCE) {
    diagnostics.push("先端支点 station は 0 である必要があります。");
  }

  for (let index = 0; index < spans.length; index += 1) {
    expectedStation += spans[index]!.length;
    const support = supports[index + 1]!;
    if (Math.abs(support.station - expectedStation) > LAYOUT_STATION_TOLERANCE) {
      diagnostics.push(
        `supports[${index + 1}].station は累積支間長（${expectedStation}）と一致する必要があります。`,
      );
      break;
    }
  }
}

export function validateBridgeLayoutContract(input: {
  readonly bridgeSystem: BridgeSystem;
  readonly bridgeLength: number | null;
  readonly spanLength: number | null;
  readonly spans: readonly BridgeLayoutSpan[];
  readonly supports: readonly BridgeLayoutSupport[];
}): readonly string[] {
  const diagnostics: string[] = [];

  if (input.bridgeSystem === BridgeSystem.SIMPLE_MULTIPLE) {
    diagnostics.push("SIMPLE_MULTIPLE は未対応のため拒否されました。");
    return diagnostics;
  }

  if (input.bridgeSystem === BridgeSystem.SIMPLE_SINGLE) {
    if (input.spanLength === null || input.bridgeLength === null) {
      return diagnostics;
    }
    if (input.spanLength <= 0) {
      diagnostics.push("支間長は 0 より大きい値を入力してください。");
    }
    if (input.bridgeLength <= 0) {
      diagnostics.push("構造モデル長は 0 より大きい値を入力してください。");
    }
    if (
      input.spanLength > 0 &&
      input.bridgeLength > 0 &&
      Math.abs(input.bridgeLength - input.spanLength) > LAYOUT_STATION_TOLERANCE
    ) {
      diagnostics.push("SIMPLE_SINGLE では構造モデル長と支間長は一致する必要があります。");
    }

    const layout = buildSimpleSingleLayout(input.spanLength);
    if (input.spans.length > 0) {
      validateSpanEntries(input.spans, diagnostics);
      if (input.spans.length !== 1) {
        diagnostics.push("SIMPLE_SINGLE では支間は 1 件のみ許可されます。");
      } else if (
        Math.abs(input.spans[0]!.length - input.spanLength) > LAYOUT_STATION_TOLERANCE
      ) {
        diagnostics.push("SIMPLE_SINGLE の spans[0].length は支間長と一致する必要があります。");
      }
    }
    if (input.supports.length > 0) {
      validateSupportEntries(input.supports, 2, diagnostics);
      validateStationsMatchSpans(layout.spans, input.supports, diagnostics);
    }
    return diagnostics;
  }

  if (input.bridgeSystem === BridgeSystem.CONTINUOUS) {
    if (input.spans.length < CONTINUOUS_SPAN_COUNT_MIN || input.spans.length > CONTINUOUS_SPAN_COUNT_MAX) {
      diagnostics.push(
        `CONTINUOUS では支間数は ${CONTINUOUS_SPAN_COUNT_MIN}〜${CONTINUOUS_SPAN_COUNT_MAX} である必要があります。`,
      );
    }

    validateSpanEntries(input.spans, diagnostics);
    validateSupportEntries(input.supports, input.spans.length + 1, diagnostics);
    validateStationsMatchSpans(input.spans, input.supports, diagnostics);

    if (input.bridgeLength !== null) {
      const total = sumSpanLengths(input.spans);
      if (input.spans.length > 0 && Math.abs(input.bridgeLength - total) > LAYOUT_STATION_TOLERANCE) {
        diagnostics.push("構造モデル長は spans の合計と一致する必要があります。");
      }
    }
  }

  return diagnostics;
}

export function resolveEffectiveLayout(input: {
  readonly bridgeSystem: BridgeSystem;
  readonly spanLength: number | null;
  readonly spans: readonly BridgeLayoutSpan[];
  readonly supports: readonly BridgeLayoutSupport[];
}): {
  readonly spans: readonly BridgeLayoutSpan[];
  readonly supports: readonly BridgeLayoutSupport[];
} | null {
  if (input.bridgeSystem === BridgeSystem.SIMPLE_SINGLE) {
    if (input.spanLength === null || input.spanLength <= 0) {
      return null;
    }
    if (input.spans.length > 0 && input.supports.length > 0) {
      return { spans: input.spans, supports: input.supports };
    }
    return buildSimpleSingleLayout(input.spanLength);
  }

  if (input.bridgeSystem === BridgeSystem.CONTINUOUS) {
    if (input.spans.length === 0) {
      return null;
    }
    if (input.supports.length > 0) {
      return { spans: input.spans, supports: input.supports };
    }
    return {
      spans: input.spans,
      supports: buildSupportsFromSpans(input.spans),
    };
  }

  return null;
}
