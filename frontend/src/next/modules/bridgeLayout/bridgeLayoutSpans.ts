import { listOrderedSupports } from "./bridgeLayoutPiers";
import type { BridgeLayoutDocument, BridgeLayoutIssue, BridgeSpan } from "./bridgeLayoutTypes";

/**
 * Phase 4-03「支間割 / Span自動生成」（Step B）.
 *
 * Supports（A1, P1..Pn, A2）を station 順に並べ、
 * A1-P1 / P1-P2 / ... / Pn-A2 の spans を自動生成する。
 *
 * - span length = endStation - startStation
 * - 全spanの合計 = bridgeLength を検証
 * - derived span はユーザーが直接正本編集しない設計
 *   （spans は常に generateSpans から再生成される）
 */

/** A1-P1-…-Pn-A2 の span を自動生成する。 */
export function generateSpans(document: BridgeLayoutDocument): readonly BridgeSpan[] {
  const supports = listOrderedSupports(document);
  const spans: BridgeSpan[] = [];
  for (let i = 0; i < supports.length - 1; i += 1) {
    const from = supports[i];
    const to = supports[i + 1];
    spans.push({
      spanId: `S${i + 1}`,
      index: i + 1,
      startSupportId: from.supportId,
      endSupportId: to.supportId,
      startStation: from.station,
      endStation: to.station,
      length: to.station - from.station,
    });
  }
  return spans;
}

export interface ValidateSpanConfigurationInput {
  readonly document: BridgeLayoutDocument;
}

/**
 * span configuration 検証:
 * - length > 0
 * - supports 順序と一致（chain: span[i].end == span[i+1].start）
 * - 全spanの合計 = bridgeLength
 */
export function validateSpanConfiguration(input: ValidateSpanConfigurationInput): readonly BridgeLayoutIssue[] {
  const { document } = input;
  const issues: BridgeLayoutIssue[] = [];
  const path = "bridgeLayoutDocument.spans";

  const supports = listOrderedSupports(document);
  const expectedCount = supports.length - 1;
  if (document.spans.length !== expectedCount) {
    issues.push({ path, message: `span count mismatch: expected ${expectedCount} spans but document has ${document.spans.length}` });
  }

  let total = 0;
  for (const [i, span] of document.spans.entries()) {
    if (!Number.isFinite(span.startStation) || !Number.isFinite(span.endStation)) {
      issues.push({ path: `${path}[${i}]`, message: "span stations must be finite numbers" });
      continue;
    }
    if (span.startStation >= span.endStation) {
      issues.push({ path: `${path}[${i}]`, message: `span ${span.spanId} startStation must be less than endStation` });
    }
    if (!Number.isFinite(span.length) || span.length <= 0) {
      issues.push({ path: `${path}[${i}].length`, message: `span ${span.spanId} length must be greater than 0` });
    } else if (Math.abs(span.length - (span.endStation - span.startStation)) > 1e-6) {
      issues.push({ path: `${path}[${i}].length`, message: `span ${span.spanId} length must equal endStation - startStation` });
    }
    if (Number.isFinite(span.length)) total += span.length;
    if (i > 0) {
      const prev = document.spans[i - 1];
      if (prev.endSupportId !== span.startSupportId) {
        issues.push({ path: `${path}[${i}]`, message: `span chain broken: ${prev.spanId} ends at ${prev.endSupportId} but ${span.spanId} starts at ${span.startSupportId}` });
      }
    }
  }

  const a1 = document.abutments.A1.station;
  const a2 = document.abutments.A2.station;
  if (Number.isFinite(a1) && Number.isFinite(a2)) {
    const bridgeLength = a2 - a1;
    if (Math.abs(total - bridgeLength) > 1e-6) {
      issues.push({ path, message: `span length total ${total.toFixed(3)} must equal bridgeLength ${bridgeLength.toFixed(3)}` });
    }
  }

  return issues;
}

/** span 一覧（spanId, from→to, length）を分かりやすく返す。 */
export function describeSpans(document: BridgeLayoutDocument): readonly { spanId: string; from: string; to: string; length: number }[] {
  return document.spans.map((span) => ({
    spanId: span.spanId,
    from: span.startSupportId,
    to: span.endSupportId,
    length: span.length,
  }));
}
