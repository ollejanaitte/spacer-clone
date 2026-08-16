// 03章§10-1 Canonical Serialization（Freeze・実装可能な粒度）
// 移植元: site-context-prototype packages/core/src/util/canonicalize.ts
// canonicalize: 決定性ハッシュ用の正規化文字列化
// 仕様（site-context docs/design/03 §10-1）:
//   - object: キーUTF-16辞書順ソート・再帰
//   - array: 要素順維持
//   - number: -1e12〜1e12・12桁丸め・-0→0・Number#toString
//   - string/boolean/null: そのまま
//   - undefined: objectではキー除去・arrayではnull
//   - NaN/Infinity: エラー

function round12(x: number): number {
  return Math.round((x + Number.EPSILON) * 1e12) / 1e12;
}

function normalizeNumber(x: number): string {
  if (!Number.isFinite(x)) throw new Error('CANON-NON-FINITE');
  if (x < -1e12 || x > 1e12) throw new Error(`CANON-OUT-OF-RANGE: ${x}`);
  const r = round12(x);
  if (Object.is(r, -0)) return '0';
  return String(r);
}

function canonicalizeValue(v: unknown, inArray: boolean): string {
  if (v === undefined) {
    if (inArray) return 'null';
    throw new Error('CANON-UNDEFINED-IN-OBJECT');
  }
  if (v === null) return 'null';
  const t = typeof v;
  if (t === 'number') return normalizeNumber(v as number);
  if (t === 'boolean') return String(v);
  if (t === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) {
    return '[' + v.map((x) => canonicalizeValue(x, true)).join(',') + ']';
  }
  if (t === 'object') {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const parts: string[] = [];
    for (const k of keys) {
      const val = obj[k];
      if (val === undefined) continue; // object内undefinedはキーごと除去
      parts.push(JSON.stringify(k) + ':' + canonicalizeValue(val, false));
    }
    return '{' + parts.join(',') + '}';
  }
  throw new Error(`CANON-UNSUPPORTED-TYPE: ${t}`);
}

/** 決定性正規化文字列（数値は数値token・再帰ソート済み） */
export function canonicalize(obj: unknown): string {
  return canonicalizeValue(obj, false);
}

/** ブラウザセーフ sha256（crypto.subtle）。Node環境ではnode:cryptoを利用。 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Node（vitest・Electron main）
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(data).digest('hex');
}

/** バイト列の sha256（ブラウザ crypto.subtle / Node node:crypto の両対応） */
export async function sha256BytesHex(bytes: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Node（vitest・Electron main）
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(bytes).digest('hex');
}

/** canonicalize + sha256（決定性ハッシュ） */
export async function canonicalHash(obj: unknown): Promise<string> {
  return sha256Hex(canonicalize(obj));
}