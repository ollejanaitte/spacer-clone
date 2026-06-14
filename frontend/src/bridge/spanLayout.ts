/**
 * Step2 支点・橋脚位置モジュール。
 *
 * 役割:
 *  - 既定 (simple) モード: 支間長から A1 / P1.. / A2 を自動生成
 *  - station モード: CSV/手動で指定した支点列を補間/正規化
 *  - 既存 BridgeProject に spanLayout がない場合、spans から後方互換で補完
 *  - 中心線形 roadAlignment に対する station 範囲外チェック
 */
import type {
  BridgeProject,
  Span,
  SpanLayout,
  SpanLayoutInputMode,
  SpanLayoutSegment,
  SupportPoint,
  SupportPointKind,
  RoadAlignment,
} from "./types";
import { totalAlignmentLength } from "./roadAlignment";

export class SpanLayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpanLayoutError";
  }
}

export const SUPPORT_KIND_LABELS: Record<SupportPointKind, string> = {
  abutment: "橋台",
  pier: "橋脚",
};

const SUPPORT_KINDS: SupportPointKind[] = ["abutment", "pier"];

function isKind(value: string): value is SupportPointKind {
  return (SUPPORT_KINDS as string[]).includes(value);
}

function isName(v: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_-]{0,15}$/.test(v);
}

export function spanLayoutTemplateCsv(): string {
  return [
    "name,type,station",
    "A1,abutment,0",
    "P1,pier,10",
    "P2,pier,20",
    "A2,abutment,30",
  ].join("\n") + "\n";
}

export class SpanLayoutCsvError extends Error {
  constructor(message: string, public readonly lineNumber?: number) {
    super(lineNumber == null ? message : `line ${lineNumber}: ${message}`);
    this.name = "SpanLayoutCsvError";
  }
}

export function parseSpanLayoutCsv(
  text: string,
  alignment: RoadAlignment | null,
): SupportPoint[] {
  const lines = text.split(/\r?\n/);
  const out: SupportPoint[] = [];
  let firstHeaderSeen = false;

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("#")) continue;
    const cols = trimmed.split(",").map((c) => c.trim());
    const lineNumber = i + 1;
    if (!firstHeaderSeen && cols[0]?.toLowerCase() === "name") {
      firstHeaderSeen = true;
      continue;
    }
    if (cols.length < 3) {
      throw new SpanLayoutCsvError(
        "expected 3 columns (name,type,station)",
        lineNumber,
      );
    }
    const name = cols[0];
    if (!isName(name)) {
      throw new SpanLayoutCsvError(`invalid support name: '${name}'`, lineNumber);
    }
    const type = cols[1].toLowerCase();
    if (!isKind(type)) {
      throw new SpanLayoutCsvError(`type must be abutment|pier (got '${cols[1]}')`, lineNumber);
    }
    const station = Number(cols[2]);
    if (!Number.isFinite(station) || station < 0) {
      throw new SpanLayoutCsvError(
        `station must be a non-negative number (got '${cols[2]}')`,
        lineNumber,
      );
    }
    out.push({ name, type, station });
  }
  if (out.length < 2) {
    throw new SpanLayoutCsvError("at least 2 support points are required");
  }
  // 端点は橋台でなければならない
  if (out[0].type !== "abutment" || out[out.length - 1].type !== "abutment") {
    throw new SpanLayoutCsvError("first and last support must be abutment");
  }
  // station 昇順
  out.sort((a, b) => a.station - b.station);
  // station 重複禁止
  for (let i = 1; i < out.length; i += 1) {
    if (out[i].station === out[i - 1].station) {
      throw new SpanLayoutCsvError(
        `duplicate station ${out[i].station} for '${out[i].name}' and '${out[i - 1].name}'`,
      );
    }
  }
  // 中心線形に対する範囲チェック
  if (alignment) {
    const total = totalAlignmentLength(alignment);
    for (const sp of out) {
      if (sp.station < -1e-6 || sp.station > total + 1e-6) {
        throw new SpanLayoutCsvError(
          `support '${sp.name}' station ${sp.station} is outside alignment range 0..${total.toFixed(3)}`,
        );
      }
    }
  }
  return out;
}

export function buildSpansFromSupports(supports: SupportPoint[]): SpanLayoutSegment[] {
  if (supports.length < 2) return [];
  const out: SpanLayoutSegment[] = [];
  for (let i = 1; i < supports.length; i += 1) {
    const a = supports[i - 1];
    const b = supports[i];
    out.push({
      from: a.name,
      to: b.name,
      length: Math.max(0, b.station - a.station),
    });
  }
  return out;
}

/**
 * 既存 BridgeProject.spans から A1, P1, ..., A2 を自動生成。
 * 最初の支点を A1、最後を A2、間は P1..Pn。
 */
export function defaultSpanLayoutFromSpans(
  spans: Span[],
  inputMode: SpanLayoutInputMode = "simple",
): SpanLayout {
  const supports: SupportPoint[] = [];
  let cursor = 0;
  // 1 支間: A1(0) と A2(length) のみ
  if (spans.length === 1) {
    supports.push({ name: "A1", type: "abutment", station: 0 });
    supports.push({ name: "A2", type: "abutment", station: spans[0].length });
    return {
      inputMode,
      supports,
      spans: buildSpansFromSupports(supports),
    };
  }
  // 2 支間以上: A1(0) + P1..(中間) + A2(累積合計)
  for (let i = 0; i < spans.length; i += 1) {
    const isFirst = i === 0;
    const isLast = i === spans.length - 1;
    const type: SupportPointKind = isFirst || isLast ? "abutment" : "pier";
    const name = isFirst ? "A1" : isLast ? "A2" : `P${i}`;
    const station = isFirst ? 0 : (isLast ? cursor + spans[i].length : cursor);
    supports.push({ name, type, station });
    cursor += spans[i].length;
  }
  return {
    inputMode,
    supports,
    spans: buildSpansFromSupports(supports),
  };
}

export function ensureSpanLayout(project: BridgeProject): SpanLayout {
  if (project.spanLayout) return project.spanLayout;
  return defaultSpanLayoutFromSpans(project.spans, "simple");
}

export function setSpanLayout(project: BridgeProject, layout: SpanLayout): BridgeProject {
  return { ...project, spanLayout: layout };
}

/**
 * 中心線形 + spanLayout を BridgeProject.spans 形式 (Span[]) に同期する。
 * 既存解析 API の互換のため、新しい Step2 データも旧形式に変換して保持する。
 */
export function syncProjectSpansFromLayout(
  project: BridgeProject,
  layout: SpanLayout,
): BridgeProject {
  const spans: Span[] = layout.spans.map((seg, i) => ({
    index: i + 1,
    length: seg.length,
    offset: 0,
  }));
  return { ...project, spans };
}

export function addSupport(layout: SpanLayout, point: SupportPoint): SpanLayout {
  const supports = [...layout.supports, point].sort((a, b) => a.station - b.station);
  return { ...layout, supports, spans: buildSpansFromSupports(supports) };
}

export function updateSupport(
  layout: SpanLayout,
  name: string,
  patch: Partial<SupportPoint>,
): SpanLayout {
  const supports = layout.supports.map((s) => (s.name === name ? { ...s, ...patch } : s));
  supports.sort((a, b) => a.station - b.station);
  return { ...layout, supports, spans: buildSpansFromSupports(supports) };
}

export function removeSupport(layout: SpanLayout, name: string): SpanLayout {
  if (layout.supports.length <= 2) {
    throw new SpanLayoutError("橋台は最低 2 つ必要です");
  }
  const supports = layout.supports.filter((s) => s.name !== name);
  return { ...layout, supports, spans: buildSpansFromSupports(supports) };
}
