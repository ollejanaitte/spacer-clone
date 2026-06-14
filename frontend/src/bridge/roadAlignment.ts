/**
 * Step1 道路中心線形モジュール。
 *
 * 役割:
 *  - CSV テンプレート生成 / パース
 *  - 既定 (simple) モード用の直線中心線生成
 *  - 既存 BridgeProject に roadAlignment がないとき後方互換で補完
 *  - 中心線長・点数・始点/終点サマリ
 *  - 中心線上の距離 s (station) からの 3D 座標補間
 *
 * 注: モデル座標自体 (project.lines / project.spans) は変更しない。
 *     読み込んだ中心線形は project.roadAlignment に保持するだけで、
 *     解析ロジック側で simple モード分岐に使う。
 */
import type {
  BridgeProject,
  RoadAlignment,
  RoadAlignmentInputMode,
  RoadAlignmentPoint,
} from "./types";

export const ROAD_ALIGNMENT_TEMPLATE_HEADER = "station,x,y,z";

export function roadAlignmentTemplateCsv(): string {
  return [
    ROAD_ALIGNMENT_TEMPLATE_HEADER,
    "0,0,0,0",
    "10,10,0,0",
    "20,20,1,0",
    "30,30,2,0",
  ].join("\n") + "\n";
}

export class RoadAlignmentCsvError extends Error {
  constructor(message: string, public readonly lineNumber?: number) {
    super(lineNumber == null ? message : `line ${lineNumber}: ${message}`);
    this.name = "RoadAlignmentCsvError";
  }
}

function parseNumber(value: string, key: string, lineNumber: number): number {
  const v = Number(value);
  if (!Number.isFinite(v)) {
    throw new RoadAlignmentCsvError(`${key} is not a number (got '${value}')`, lineNumber);
  }
  return v;
}

/**
 * CSV 文字列をパースして RoadAlignmentPoint[] を返す。
 * - 空行 / 先頭の "#" で始まる行はスキップ
 * - station 列が空欄なら累加距離から自動計算
 * - バリデーション失敗時は例外
 */
export function parseRoadAlignmentCsv(text: string): RoadAlignmentPoint[] {
  const lines = text.split(/\r?\n/);
  const out: RoadAlignmentPoint[] = [];
  let lastX = 0;
  let lastY = 0;
  let lastZ = 0;
  let lastStation: number | null = null;
  let firstHeaderSeen = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("#")) continue;

    const cols = trimmed.split(",").map((c) => c.trim());
    if (!firstHeaderSeen) {
      const c0 = cols[0]?.toLowerCase();
      if (c0 === "station" || c0 === "x") {
        firstHeaderSeen = true;
        continue;
      }
    }
    const lineNumber = i + 1;
    if (cols.length < 3) {
      throw new RoadAlignmentCsvError("expected at least 3 columns (x,y,z) or 4 columns (station,x,y,z)", lineNumber);
    }
    let station: number;
    let x: number;
    let y: number;
    let z: number;
    if (cols.length >= 4 && cols[0] !== "") {
      station = parseNumber(cols[0], "station", lineNumber);
      x = parseNumber(cols[1], "x", lineNumber);
      y = parseNumber(cols[2], "y", lineNumber);
      z = parseNumber(cols[3], "z", lineNumber);
    } else {
      x = parseNumber(cols[0], "x", lineNumber);
      y = parseNumber(cols[1], "y", lineNumber);
      z = cols.length >= 3 ? parseNumber(cols[2], "z", lineNumber) : 0;
      // 累加距離
      const dx = x - lastX;
      const dy = y - lastY;
      const dz = z - lastZ;
      const seg = Math.sqrt(dx * dx + dy * dy + dz * dz);
      station = (lastStation == null ? 0 : lastStation) + (out.length === 0 ? 0 : seg);
    }
    out.push({ station, x, y, z });
    lastX = x;
    lastY = y;
    lastZ = z;
    lastStation = station;
  }

  if (out.length < 2) {
    throw new RoadAlignmentCsvError("at least 2 points are required");
  }
  // 推奨: station 昇順。降順でも致命的ではないが、警告的に並び替え。
  const ascending = [...out].sort((a, b) => a.station - b.station);
  return ascending;
}

export function ensureRoadAlignment(project: BridgeProject): RoadAlignment {
  if (project.roadAlignment) return project.roadAlignment;
  const total = project.spans.reduce((acc, s) => acc + (s.length || 0), 0);
  return defaultStraightRoadAlignment(Math.max(1, total));
}

export function defaultStraightRoadAlignment(bridgeLength: number): RoadAlignment {
  const safe = Math.max(1, Number.isFinite(bridgeLength) ? bridgeLength : 1);
  return {
    inputMode: "simple",
    bridgeLength: safe,
    points: [
      { station: 0, x: 0, y: 0, z: 0 },
      { station: safe, x: safe, y: 0, z: 0 },
    ],
  };
}

export function setRoadAlignment(
  project: BridgeProject,
  alignment: RoadAlignment,
): BridgeProject {
  return { ...project, roadAlignment: alignment };
}

export function totalAlignmentLength(alignment: RoadAlignment): number {
  if (alignment.points.length < 2) return 0;
  return alignment.points[alignment.points.length - 1].station - alignment.points[0].station;
}

export function alignmentStart(alignment: RoadAlignment): RoadAlignmentPoint | null {
  return alignment.points[0] ?? null;
}

export function alignmentEnd(alignment: RoadAlignment): RoadAlignmentPoint | null {
  if (alignment.points.length === 0) return null;
  return alignment.points[alignment.points.length - 1];
}

/**
 * 中心線長 (累加距離) を返す。station が空だった場合のフォールバックとして
 * 3D ユークリッド距離でも算出可能。
 */
export function polylineLength(points: RoadAlignmentPoint[]): number {
  if (points.length < 2) return 0;
  let acc = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    acc += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return acc;
}

/**
 * 中心線上の station s に対する 3D 座標を線形補間で返す。
 * 範囲外は端点を返す。
 */
export function pointAtStation(
  alignment: RoadAlignment,
  s: number,
): RoadAlignmentPoint | null {
  const pts = alignment.points;
  if (pts.length === 0) return null;
  if (pts.length === 1) return pts[0];
  if (s <= pts[0].station) return pts[0];
  if (s >= pts[pts.length - 1].station) return pts[pts.length - 1];
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    if (s >= a.station && s <= b.station) {
      const span = b.station - a.station;
      const t = span <= 0 ? 0 : (s - a.station) / span;
      return {
        station: s,
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
      };
    }
  }
  return pts[pts.length - 1];
}

/**
 * CSV 文字列をパースして RoadAlignment 全体を返す。
 * 既存データが simple モードなら bridgeLength から直線を維持。
 */
export function importRoadAlignmentCsv(
  text: string,
  inputMode: RoadAlignmentInputMode = "csv",
): RoadAlignment {
  const points = parseRoadAlignmentCsv(text);
  const total = totalAlignmentLength({ inputMode, bridgeLength: 0, points });
  return { inputMode, bridgeLength: total, points };
}
