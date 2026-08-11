export interface TerrainPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface TerrainImportResult {
  readonly ok: boolean;
  readonly points: readonly TerrainPoint[];
  readonly pointCount: number;
  readonly bounds: { minX: number; minY: number; maxX: number; maxY: number; minZ: number; maxZ: number };
  readonly issues: readonly string[];
}

export interface ParseTerrainOptions {
  readonly maxPoints?: number;
  readonly delimiter?: string;
}

const DEFAULT_MAX_POINTS = 1_000_000;

function computeBounds(points: readonly TerrainPoint[]): TerrainImportResult["bounds"] {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    minZ = Math.min(minZ, p.z);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX, minY, maxX, maxY, minZ, maxZ };
}

function parseNumber(token: string): number | null {
  const trimmed = token.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseLineTokens(line: string, delimiter: string): TerrainPoint | "malformed" {
  const tokens = line.trim().split(delimiter);
  const nums = tokens.map(parseNumber);
  // allow x,y,z or x,y,z,extra columns
  if (nums.length < 3 || nums[0] === null || nums[1] === null || nums[2] === null) {
    return "malformed";
  }
  return { x: nums[0], y: nums[1], z: nums[2] };
}

export function parseTerrainText(
  text: string,
  options: ParseTerrainOptions = {},
): TerrainImportResult {
  const issues: string[] = [];
  const delimiter = options.delimiter ?? ",";
  const maxPoints = options.maxPoints ?? DEFAULT_MAX_POINTS;

  const lines = text.split(/\r?\n/);
  let dataStart = 0;
  // skip header lines (first line if it contains non-numeric tokens)
  const first = lines[0]?.trim();
  if (first !== undefined && first.length > 0) {
    const firstTokens = first.split(delimiter).map(parseNumber);
    if (firstTokens.some((t) => t === null)) {
      dataStart = 1;
    }
  }

  const points: TerrainPoint[] = [];
  let malformedCount = 0;

  for (let i = dataStart; i < lines.length; i += 1) {
    const line = lines[i]?.trim();
    if (line === undefined || line.length === 0) continue;
    const parsed = parseLineTokens(line, delimiter);
    if (parsed === "malformed") {
      malformedCount += 1;
      if (malformedCount <= 5) {
        issues.push(`malformed row at line ${i + 1}`);
      }
      continue;
    }
    points.push(parsed);
    if (points.length >= maxPoints) {
      issues.push(`exceeded max point count (${maxPoints})`);
      break;
    }
  }

  if (malformedCount > 5) {
    issues.push(`and ${malformedCount - 5} more malformed rows`);
  }

  if (points.length === 0) {
    issues.push("empty terrain data");
    return {
      ok: false,
      points: [],
      pointCount: 0,
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, minZ: 0, maxZ: 0 },
      issues,
    };
  }

  return {
    ok: issues.length === 0,
    points,
    pointCount: points.length,
    bounds: computeBounds(points),
    issues,
  };
}

export function detectDelimiter(text: string): string {
  const sample = text.slice(0, 2000);
  if (sample.includes("\t")) return "\t";
  if (sample.includes(";")) return ";";
  return ",";
}

export function parseTerrainAuto(text: string, options: ParseTerrainOptions = {}): TerrainImportResult {
  return parseTerrainText(text, { ...options, delimiter: detectDelimiter(text) });
}
