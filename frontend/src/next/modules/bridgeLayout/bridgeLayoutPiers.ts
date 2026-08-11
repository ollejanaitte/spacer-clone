import type { BridgeLayoutDocument, BridgeLayoutIssue, PierPlacement, SkewSource } from "./bridgeLayoutTypes";
import { BRIDGE_LAYOUT_SCHEMA_VERSION } from "./bridgeLayoutTypes";

/**
 * Phase 4-03「橋脚配置」domain logic（Step A: Pier Domain / P1..Pn配置）.
 *
 * - P1..Pn は BridgeLayoutDocument.piers に正式保存する（唯一正本）。
 * - 0本 / 1本 / 複数本を扱える。
 * - pierId（supportId）必須・重複禁止・finite station・
 *   A1 < P1 < P2 < ... < Pn < A2 順序・Bridge Range内を validation。
 * - pier station 変更時は placement / span / Terrain / Existing 参照を再計算
 *   （再計算自体は placement / span モジュールが担当。本モジュールは構造操作）。
 */

export interface OrderedSupport {
  readonly supportId: string;
  readonly label: string;
  readonly kind: "abutment" | "pier";
  readonly station: number;
}

/** A1, P1..Pn, A2 を station 順に並べた support 一覧を返す（span生成・UI表示用）。 */
export function listOrderedSupports(document: BridgeLayoutDocument): readonly OrderedSupport[] {
  const supports: OrderedSupport[] = [
    { supportId: document.abutments.A1.supportId, label: "A1", kind: "abutment", station: document.abutments.A1.station },
  ];
  for (const pier of document.piers) {
    supports.push({
      supportId: pier.supportId,
      label: pier.label ?? pier.supportId,
      kind: "pier",
      station: pier.station,
    });
  }
  supports.push({
    supportId: document.abutments.A2.supportId,
    label: "A2",
    kind: "abutment",
    station: document.abutments.A2.station,
  });
  return [...supports].sort((a, b) => a.station - b.station);
}

/** 次に採番する Pier ID（P1, P2, ...）を返す。 */
export function nextPierId(document: BridgeLayoutDocument): string {
  let max = 0;
  for (const pier of document.piers) {
    const match = /^P(\d+)$/.exec(pier.supportId);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `P${max + 1}`;
}

export interface AddPierInput {
  readonly supportId?: string;
  readonly label?: string;
  readonly station: number;
  readonly skewAngleRad?: number | null;
  readonly skewSource?: SkewSource;
}

/** P1..Pn を追加する（span・validation再計算は呼び出し側が generateSpans で実施）。 */
export function addPier(document: BridgeLayoutDocument, input: AddPierInput): BridgeLayoutDocument {
  const supportId = input.supportId ?? nextPierId(document);
  const now = new Date().toISOString();
  const pier: PierPlacement = {
    supportId,
    label: input.label ?? supportId,
    station: input.station,
    skewAngleRad: input.skewAngleRad ?? null,
    skewSource: input.skewSource,
    metadata: undefined,
  };
  return {
    ...document,
    piers: [...document.piers, pier],
    metadata: { ...document.metadata, updatedAt: now },
    validation: {
      schemaVersion: BRIDGE_LAYOUT_SCHEMA_VERSION,
      validatedAt: now,
      ok: false,
      issues: [],
    },
  };
}

/** P1..Pn を削除する（supportId が A1/A2 の場合は削除しない）。 */
export function removePier(document: BridgeLayoutDocument, supportId: string): BridgeLayoutDocument {
  const now = new Date().toISOString();
  return {
    ...document,
    piers: document.piers.filter((p) => p.supportId !== supportId),
    metadata: { ...document.metadata, updatedAt: now },
    validation: {
      schemaVersion: BRIDGE_LAYOUT_SCHEMA_VERSION,
      validatedAt: now,
      ok: false,
      issues: [],
    },
  };
}

/** Pier station を変更する（span・placement再計算は呼び出し側）。 */
export function updatePierStation(document: BridgeLayoutDocument, supportId: string, station: number): BridgeLayoutDocument {
  const now = new Date().toISOString();
  return {
    ...document,
    piers: document.piers.map((p) => (p.supportId === supportId ? { ...p, station } : p)),
    metadata: { ...document.metadata, updatedAt: now },
    validation: {
      schemaVersion: BRIDGE_LAYOUT_SCHEMA_VERSION,
      validatedAt: now,
      ok: false,
      issues: [],
    },
  };
}

/** Pier skew を設定する（反時計回り正・counterclockwise-positive が正規約）。 */
export function updatePierSkew(
  document: BridgeLayoutDocument,
  supportId: string,
  skewAngleRad: number | null,
  skewSource?: SkewSource,
): BridgeLayoutDocument {
  const now = new Date().toISOString();
  return {
    ...document,
    piers: document.piers.map((p) => (p.supportId === supportId
      ? { ...p, skewAngleRad, skewSource: skewSource ?? (skewAngleRad === null ? undefined : "user") }
      : p)),
    metadata: { ...document.metadata, updatedAt: now },
    validation: {
      schemaVersion: BRIDGE_LAYOUT_SCHEMA_VERSION,
      validatedAt: now,
      ok: false,
      issues: [],
    },
  };
}

export interface ValidatePierConfigurationInput {
  readonly document: BridgeLayoutDocument;
}

/**
 * Pier 配置の構造validation（document検証と重複するが、UIの即時表示用に
 * 軽量な ordering / range チェックを提供）。
 */
export function validatePierConfiguration(input: ValidatePierConfigurationInput): readonly BridgeLayoutIssue[] {
  const { document } = input;
  const issues: BridgeLayoutIssue[] = [];
  const path = "bridgeLayoutDocument.piers";

  const seen = new Set<string>();
  const stations = new Set<number>();
  for (const [i, pier] of document.piers.entries()) {
    if (typeof pier.supportId !== "string" || pier.supportId.length === 0) {
      issues.push({ path: `${path}[${i}].supportId`, message: "pier supportId is required" });
    } else if (seen.has(pier.supportId)) {
      issues.push({ path: `${path}[${i}].supportId`, message: `duplicate pier supportId: ${pier.supportId}` });
    } else {
      seen.add(pier.supportId);
    }
    if (typeof pier.station !== "number" || !Number.isFinite(pier.station)) {
      issues.push({ path: `${path}[${i}].station`, message: "pier station must be a finite number" });
      continue;
    }
    if (stations.has(pier.station)) {
      issues.push({ path: `${path}[${i}].station`, message: `duplicate pier station: ${pier.station}` });
    }
    stations.add(pier.station);
  }

  const a1 = document.abutments.A1.station;
  const a2 = document.abutments.A2.station;
  if (Number.isFinite(a1) && Number.isFinite(a2)) {
    for (const [i, pier] of document.piers.entries()) {
      if (!Number.isFinite(pier.station)) continue;
      if (pier.station <= a1 || pier.station >= a2) {
        issues.push({ path: `${path}[${i}].station`, message: `pier station ${pier.station} is outside the bridge range (A1=${a1}, A2=${a2})` });
      }
    }
  }

  // 配列順（保存順）での station ordering を検証: A1 < P1..Pn(配列順) < A2
  const inOrder: OrderedSupport[] = [
    { supportId: document.abutments.A1.supportId, label: "A1", kind: "abutment", station: document.abutments.A1.station },
  ];
  for (const pier of document.piers) {
    inOrder.push({ supportId: pier.supportId, label: pier.label ?? pier.supportId, kind: "pier", station: pier.station });
  }
  inOrder.push({
    supportId: document.abutments.A2.supportId,
    label: "A2",
    kind: "abutment",
    station: document.abutments.A2.station,
  });
  for (let i = 1; i < inOrder.length; i += 1) {
    if (inOrder[i].station <= inOrder[i - 1].station) {
      issues.push({
        path: `${path}`,
        message: `station order violation: ${inOrder[i - 1].label}@${inOrder[i - 1].station} >= ${inOrder[i].label}@${inOrder[i].station}`,
      });
    }
  }

  return issues;
}
