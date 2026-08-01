import { computeSha256Hex } from "../../contracts/legacy/checksum";
import type { UuidString } from "../../contracts/uuid";

const VVS01_STABLE_ID_NAMESPACE = "apollo-vvs01";

/** Deterministic UUID derived from a stable seed (regeneration preserves entity IDs). */
export function stableUuidFromSeed(seed: string): UuidString {
  const hex = computeSha256Hex(`${VVS01_STABLE_ID_NAMESPACE}:${seed}`);
  const part1 = hex.slice(0, 8);
  const part2 = hex.slice(8, 12);
  const part3 = `4${hex.slice(13, 16)}`;
  const variantNibble = ((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, "0");
  const part4 = `${variantNibble}${hex.slice(18, 20)}`;
  const part5 = hex.slice(20, 32);
  return `${part1}-${part2}-${part3}-${part4}-${part5}` as UuidString;
}

export function stableEntitySeed(projectScopeId: string, entityKind: string, key: string): string {
  return `${projectScopeId}:${entityKind}:${key}`;
}
