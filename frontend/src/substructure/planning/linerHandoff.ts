// Phase C1 (M2-09C) LINER 支点 → 下部工 handoff アダプタ（純粋ロジック）
// LINER PierDraft の構造的最小入力を受け、下部工 placement 用の支点リストへ変換する。
// 既存 Placement 契約（station/offset/Z/skew）を壊さない。

export interface LinerPierHandoffInput {
  id: string;
  physicalDistance: number;
  kind: "abutment" | "pier" | "virtual_pier" | string;
  skewAngleRad?: number;
}

export interface LinerSupportHandoff {
  id: string;
  station: number;
  skewRad?: number;
  kind?: string;
}

/** LINER 橋梁配置の PierDraft[] → 下部工 liner 配置用支点リスト。 */
export function linerPiersToSupportHandoff(
  piers: readonly LinerPierHandoffInput[],
): LinerSupportHandoff[] {
  if (!Array.isArray(piers)) return [];
  return piers
    .filter((p) => p && (p.kind === "abutment" || p.kind === "pier"))
    .map((p) => ({
      id: p.id,
      station: p.physicalDistance,
      skewRad: p.skewAngleRad ?? 0,
      kind: p.kind,
    }));
}

/** 重複 supportId の検出（LINER 支点の ID 重複を防ぐ）。 */
export function findDuplicateHandoffIds(supports: readonly LinerSupportHandoff[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const s of supports) {
    if (seen.has(s.id)) dups.add(s.id);
    seen.add(s.id);
  }
  return [...dups];
}

/** alignment id を安全に解決する（未定義なら空文字）。 */
export function resolveHandoffAlignmentId(
  alignment: { id?: string; linerModelId?: string } | null | undefined,
  activeAlignmentId?: string | null,
): string {
  return activeAlignmentId || alignment?.id || "";
}
