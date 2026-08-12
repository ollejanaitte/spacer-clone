import type { ProjectManager } from "../../project/projectManager";
import type { BridgeLayoutDocument, BridgeLayoutIssue, RoadReference } from "./bridgeLayoutTypes";
import { generateSpans } from "./bridgeLayoutSpans";
import { readRoadAlignmentContext } from "./bridgeLayoutDomain";
import { resolveBridgeLayoutReferences } from "./bridgeLayoutReferences";

/**
 * Phase 4-04 Span Handoff Contract（Phase 5上部工へ渡す正式支間情報）.
 *
 * BridgeLayoutDocument が唯一正本。spans は Supports（A1/P1..Pn/A2）から
 * 導出される derived data であり、本Handoffも derived snapshot。
 * ユーザーがSpan長をBridge側で直接正本編集する構造にしない。
 * 上部工設計情報（主桁・床版・横桁・支承・FEM等）は含めない。
 *
 * validation:
 * - chainが切れていない / A1からA2まで連続 / support順序と一致
 * - spanLength > 0 / ΣspanLength = bridgeLength
 * - duplicate spanIdなし / missing support reject / malformed fail-closed
 * - derived一致: 保存済み spans と再生成 spans の一致（正本編集検出）
 */
export const SPAN_HANDOFF_SCHEMA_VERSION = "1.0.0" as const;

export interface SpanHandoffItem {
  readonly spanId: string;
  readonly index: number;
  readonly startSupportId: string;
  readonly endSupportId: string;
  readonly startStation: number;
  readonly endStation: number;
  readonly spanLength: number;
  readonly startSupportSkew: number | null;
  readonly endSupportSkew: number | null;
}

export interface SpanHandoff {
  readonly handoffKind: "span-handoff";
  readonly schemaVersion: string;
  readonly handoffId: string;
  readonly bridgeId: string;
  /** 正本参照（複製しない） */
  readonly documentReference: string;
  readonly generatedAt: string;
  readonly roadReference: RoadReference;
  readonly coordinateContext: {
    readonly coordinatePolicyId: string | null;
    readonly axisConvention: "x-along/y-transverse/z-up";
    readonly unitSystem: "metric";
  };
  readonly skewConvention: "counterclockwise-positive";
  readonly spans: readonly SpanHandoffItem[];
  readonly validation: { readonly ok: boolean; readonly issues: readonly BridgeLayoutIssue[] };
}

export type SpanHandoffResult =
  | { ok: true; handoff: SpanHandoff }
  | { ok: false; issues: readonly BridgeLayoutIssue[] };

/** supportId → skewAngleRad を document から引く。 */
function skewOf(document: BridgeLayoutDocument, supportId: string): number | null {
  if (supportId === "A1") return document.abutments.A1.skewAngleRad ?? null;
  if (supportId === "A2") return document.abutments.A2.skewAngleRad ?? null;
  const pier = document.piers.find((p) => p.supportId === supportId);
  return pier ? (pier.skewAngleRad ?? null) : null;
}

function spansEqual(
  a: { spanId: string; startSupportId: string; endSupportId: string; startStation: number; endStation: number },
  b: { spanId: string; startSupportId: string; endSupportId: string; startStation: number; endStation: number },
): boolean {
  return a.spanId === b.spanId
    && a.startSupportId === b.startSupportId
    && a.endSupportId === b.endSupportId
    && Math.abs(a.startStation - b.startStation) < 1e-6
    && Math.abs(a.endStation - b.endStation) < 1e-6;
}

/** A1-P1-…-Pn-A2 の Span Handoff を生成する（derived・chain完全性検証）。 */
export function buildSpanHandoff(
  manager: ProjectManager,
  projectId: string,
  document: BridgeLayoutDocument,
): SpanHandoffResult {
  const issues: BridgeLayoutIssue[] = [];
  const road = readRoadAlignmentContext(manager, projectId);
  const references = resolveBridgeLayoutReferences(manager, projectId, document);
  if (!references.ok) issues.push(...references.issues);
  if (!road.ok) issues.push(...road.issues.map((i) => ({ path: i.path, message: i.message })));

  const regenerated = generateSpans(document);
  const knownSupportIds = new Set<string>(["A1", "A2", ...document.piers.map((p) => p.supportId)]);

  // 1) derived一致: 保存済み spans と再生成 spans が一致しない場合は正本編集検出（fail-closed）
  if (Array.isArray(document.spans) && document.spans.length > 0) {
    if (document.spans.length !== regenerated.length) {
      issues.push({ path: "spanHandoff.spans", message: `derived inconsistency: stored spans count ${document.spans.length} != regenerated ${regenerated.length}` });
    } else {
      for (let i = 0; i < document.spans.length; i += 1) {
        if (!spansEqual(document.spans[i], regenerated[i])) {
          issues.push({ path: `spanHandoff.spans[${document.spans[i].spanId}]`, message: "derived inconsistency: stored span does not match regenerated span (user direct edit detected)" });
          break;
        }
      }
    }
  }

  // 2) 再生成 spans の完全性検証
  const items: SpanHandoffItem[] = [];
  const seenSpanIds = new Set<string>();
  let previousEndSupport: string | null = null;
  let expectedStation = Number.NaN;
  let total = 0;

  for (const span of regenerated) {
    if (seenSpanIds.has(span.spanId)) {
      issues.push({ path: `spanHandoff.spans`, message: `duplicate spanId: ${span.spanId}` });
    }
    seenSpanIds.add(span.spanId);

    if (!knownSupportIds.has(span.startSupportId)) {
      issues.push({ path: `spanHandoff.spans[${span.spanId}].startSupportId`, message: `missing support: ${span.startSupportId}` });
    }
    if (!knownSupportIds.has(span.endSupportId)) {
      issues.push({ path: `spanHandoff.spans[${span.spanId}].endSupportId`, message: `missing support: ${span.endSupportId}` });
    }

    if (previousEndSupport !== null && span.startSupportId !== previousEndSupport) {
      issues.push({ path: `spanHandoff.spans[${span.spanId}]`, message: `span chain broken: expected start at ${previousEndSupport} but got ${span.startSupportId}` });
    }
    previousEndSupport = span.endSupportId;

    if (Number.isFinite(expectedStation) && Math.abs(span.startStation - expectedStation) > 1e-6) {
      issues.push({ path: `spanHandoff.spans[${span.spanId}]`, message: `station continuity broken: expected ${expectedStation} but got ${span.startStation}` });
    }
    expectedStation = span.endStation;

    if (!Number.isFinite(span.startStation) || !Number.isFinite(span.endStation)) {
      issues.push({ path: `spanHandoff.spans[${span.spanId}]`, message: "span stations must be finite numbers" });
      continue;
    }
    if (span.endStation <= span.startStation) {
      issues.push({ path: `spanHandoff.spans[${span.spanId}]`, message: `span ${span.spanId} must have positive length` });
    }
    const length = span.endStation - span.startStation;
    if (length <= 0) {
      issues.push({ path: `spanHandoff.spans[${span.spanId}].spanLength`, message: "spanLength must be greater than 0" });
    }
    total += length;

    items.push({
      spanId: span.spanId,
      index: span.index,
      startSupportId: span.startSupportId,
      endSupportId: span.endSupportId,
      startStation: span.startStation,
      endStation: span.endStation,
      spanLength: length,
      startSupportSkew: skewOf(document, span.startSupportId),
      endSupportSkew: skewOf(document, span.endSupportId),
    });
  }

  if (items.length > 0 && (items[0].startSupportId !== "A1" || items[items.length - 1].endSupportId !== "A2")) {
    issues.push({ path: "spanHandoff.spans", message: "spans must be continuous from A1 to A2" });
  }

  const a1 = document.abutments.A1.station;
  const a2 = document.abutments.A2.station;
  if (Number.isFinite(a1) && Number.isFinite(a2)) {
    const bridgeLength = a2 - a1;
    if (Math.abs(total - bridgeLength) > 1e-6) {
      issues.push({ path: "spanHandoff.spans", message: `ΣspanLength ${total.toFixed(3)} must equal bridgeLength ${bridgeLength.toFixed(3)}` });
    }
  }

  const handoff: SpanHandoff = {
    handoffKind: "span-handoff",
    schemaVersion: SPAN_HANDOFF_SCHEMA_VERSION,
    handoffId: `SPH-${document.bridgeId}`,
    bridgeId: document.bridgeId,
    documentReference: document.bridgeId,
    generatedAt: new Date().toISOString(),
    roadReference: document.roadReference,
    coordinateContext: {
      coordinatePolicyId: road.coordinatePolicyId,
      axisConvention: "x-along/y-transverse/z-up",
      unitSystem: "metric",
    },
    skewConvention: "counterclockwise-positive",
    spans: items,
    validation: { ok: issues.length === 0, issues },
  };

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, handoff };
}
