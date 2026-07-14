/**
 * 測点表示フォーマッタ / パーサー。
 *
 * Phase 4.0-1a で導入。純粋関数のみ。
 * 内部の station 値は number m として扱い、表示・入力を No.XX+YY 形式に対応させる。
 *
 * 例（interval = 100）:
 *   formatStationNoPlus(2535)       -> "No.25+35"
 *   formatStationNoPlus(2535.123, { precision: 3 }) -> "No.25+35.123"
 *   parseStationNoPlus("No.25+35")  -> 2535
 *   parseStationInput("2535")       -> { ok: true, value: 2535 }
 *   parseStationInput("No.25+35")   -> { ok: true, value: 2535 }
 *   parseStationInput("abc")        -> { ok: false, reason: ... }
 */

export type NoInterval = 20 | 50 | 100 | 200;

export interface StationFormatOptions {
  /** No 間隔（デフォルト 100m）。20/50/100/200 のいずれか。 */
  interval: NoInterval;
  /** 小数点以下桁数（デフォルト 3）。0 以上の整数。 */
  precision: number;
  /** No. プレフィックス（デフォルト "No."）。 */
  prefix: string;
}

export const DEFAULT_STATION_FORMAT_OPTIONS: StationFormatOptions = {
  interval: 100,
  precision: 3,
  prefix: "No.",
};

/**
 * m 値を No.XX+YY.YYY 形式へ変換する。
 * 負値は "-" プレフィックス付き。
 * 非有限値（NaN, Infinity）は null を返す。
 */
export function formatStationNoPlus(
  meters: number,
  options?: Partial<StationFormatOptions>,
): string | null {
  if (!Number.isFinite(meters)) return null;
  const opts = { ...DEFAULT_STATION_FORMAT_OPTIONS, ...options };
  const negative = meters < 0;
  const abs = Math.abs(meters);
  const noNumber = Math.floor(abs / opts.interval);
  const remainder = abs - noNumber * opts.interval;
  const remainderStr = opts.precision > 0
    ? remainder.toFixed(opts.precision)
    : Math.round(remainder).toString();
  const sign = negative ? "-" : "";
  return `${sign}${opts.prefix}${noNumber}+${remainderStr}`;
}

/**
 * No.XX+YY.YYY 形式の文字列を m 値へ変換する。
 * 空白は無視。プレフィックスの有無は許容（"25+35" も受ける）。
 * パース失敗時は null。
 */
export function parseStationNoPlus(
  text: string,
  options?: Partial<StationFormatOptions>,
): number | null {
  if (typeof text !== "string") return null;
  const opts = { ...DEFAULT_STATION_FORMAT_OPTIONS, ...options };
  const trimmed = text.trim().replace(/\s+/g, "");
  if (trimmed.length === 0) return null;

  // 負符号
  let negative = false;
  let body = trimmed;
  if (body.startsWith("-")) {
    negative = true;
    body = body.slice(1);
  }

  // プレフィックス除去（大文字小文字区別なし、任意）
  const prefixLower = opts.prefix.toLowerCase();
  if (body.toLowerCase().startsWith(prefixLower)) {
    body = body.slice(opts.prefix.length);
  }

  // XX+YY 形式
  const plusIdx = body.indexOf("+");
  if (plusIdx < 0) return null;
  const noPart = body.slice(0, plusIdx);
  const remPart = body.slice(plusIdx + 1);
  if (noPart.length === 0 || remPart.length === 0) return null;
  if (!/^\d+$/.test(noPart)) return null;
  if (!/^\d+(\.\d+)?$/.test(remPart)) return null;

  const no = Number(noPart);
  const rem = Number(remPart);
  if (!Number.isFinite(no) || !Number.isFinite(rem)) return null;

  const value = no * opts.interval + rem;
  return negative ? -value : value;
}

/**
 * 統合入力パーサー。No.XX+YY 形式と単純な m 数値の両方を受ける。
 * 空文字は失敗。
 */
export type StationParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: "empty" | "invalid_format" | "not_finite" };

export function parseStationInput(
  text: string,
  options?: Partial<StationFormatOptions>,
): StationParseResult {
  if (typeof text !== "string") return { ok: false, reason: "invalid_format" };
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, reason: "empty" };

  // No.XX+YY 形式優先
  if (trimmed.includes("+")) {
    const parsed = parseStationNoPlus(trimmed, options);
    if (parsed === null) return { ok: false, reason: "invalid_format" };
    if (!Number.isFinite(parsed)) return { ok: false, reason: "not_finite" };
    return { ok: true, value: parsed };
  }

  // 単純 m 数値 fallback
  const num = Number(trimmed);
  if (Number.isNaN(num)) return { ok: false, reason: "invalid_format" };
  if (!Number.isFinite(num)) return { ok: false, reason: "not_finite" };
  return { ok: true, value: num };
}

/**
 * UI 表示用の標準測点フォーマッタ。
 * Phase 4.0-1b では No 間隔 100m 固定のデフォルト設定を使う。
 */
export function formatStationDisplay(meters: number): string {
  return formatStationNoPlus(meters) ?? "";
}

/**
 * Japanese plan-drawing station notation.
 * Examples (majorInterval=100): 0→No.0, 20→No.0+20, 100→No.1, 140→No.1+40
 */
export function formatStationPlanNotation(
  meters: number,
  majorInterval = 100,
): string {
  if (!Number.isFinite(meters)) {
    return "";
  }
  const negative = meters < 0;
  const abs = Math.abs(meters);
  const noNumber = Math.floor(abs / majorInterval + 1e-9);
  const remainder = abs - noNumber * majorInterval;
  const sign = negative ? "-" : "";
  if (Math.abs(remainder) < 1e-6) {
    return `${sign}No.${noNumber}`;
  }
  if (Math.abs(remainder - Math.round(remainder)) < 1e-6) {
    return `${sign}No.${noNumber}+${Math.round(remainder)}`;
  }
  return `${sign}No.${noNumber}+${remainder.toFixed(3)}`;
}

export function isMajorStationDistance(meters: number, majorInterval = 100): boolean {
  if (!Number.isFinite(meters)) {
    return false;
  }
  const rem = Math.abs(meters) % majorInterval;
  return rem < 1e-6 || majorInterval - rem < 1e-6;
}
