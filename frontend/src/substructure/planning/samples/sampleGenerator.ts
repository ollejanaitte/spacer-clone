// Phase C1 (M2-08) サンプル自動生成（純粋ロジック）
// P03 Freeze の 9種サンプル + LINER 支点生成。deterministic な既定パラメータと安定ID。
// 生成値は「参考・サンプル値」であり設計標準値ではないことを UI で明示する。

import type { Support, PierFormType, AbutmentFormType, PileType } from "../../model";

export type SampleKind =
  | "abutment_inverted_t"
  | "abutment_cantilever"
  | "pier_single"
  | "pier_wall"
  | "pier_portal"
  | "foundation_spread"
  | "foundation_bored"
  | "foundation_steel"
  | "combination";

export interface SampleSupportSpec {
  kind: SampleKind;
  supportId: string;
  station: number;
}

export interface SampleComboSpec {
  id: string;
  label: string;
  supports: SampleSupportSpec[];
}

export const SAMPLE_COMBOS: SampleComboSpec[] = [
  {
    id: "combo-standard",
    label: "標準構成 (A1-P1-P2-A2)",
    supports: [
      { kind: "abutment_inverted_t", supportId: "A1", station: 0 },
      { kind: "pier_portal", supportId: "P1", station: 30 },
      { kind: "pier_single", supportId: "P2", station: 60 },
      { kind: "abutment_cantilever", supportId: "A2", station: 90 },
    ],
  },
  {
    id: "combo-abutments",
    label: "橋台のみ (A1-A2)",
    supports: [
      { kind: "abutment_inverted_t", supportId: "A1", station: 0 },
      { kind: "abutment_cantilever", supportId: "A2", station: 40 },
    ],
  },
  {
    id: "combo-piers",
    label: "橋脚のみ (P1-P2-P3)",
    supports: [
      { kind: "pier_single", supportId: "P1", station: 0 },
      { kind: "pier_wall", supportId: "P2", station: 30 },
      { kind: "pier_portal", supportId: "P3", station: 60 },
    ],
  },
];

function pierBase(supportId: string, formType: PierFormType, station: number): Support {
  const base: Support = {
    supportId,
    supportType: "pier",
    skewRad: 0,
    placement: { source: "liner", alignmentId: "sample-aln", station, offset: 0 },
    bearingSeats: [],
    pier: {
      id: supportId,
      formType,
      footing: { id: `${supportId}-FOOTING`, length: 10, width: 7, thickness: 1.8, topElevation: 0 },
    },
  };
  if (formType === "portal_frame") {
    base.pier!.columns = [
      { id: `${supportId}-C1`, width: 1.4, depth: 1.8, height: 8, transverseOffset: -3.5 },
      { id: `${supportId}-C2`, width: 1.4, depth: 1.8, height: 8, transverseOffset: 3.5 },
    ];
    base.pier!.beam = { id: `${supportId}-BEAM`, width: 1.6, depth: 9, height: 1.5 };
  } else {
    base.pier!.column = {
      id: `${supportId}-COLUMN`,
      width: formType === "wall" ? 7 : 1.2,
      depth: 1.6,
      height: 7,
    };
    base.pier!.cap = {
      id: `${supportId}-CAP`,
      width: 1.6,
      depth: formType === "wall" ? 7 : 8,
      height: 1.2,
      overhangL: 0.5,
      overhangR: 0.5,
    };
  }
  return base;
}

function abutmentBase(supportId: string, formType: AbutmentFormType, station: number): Support {
  return {
    supportId,
    supportType: "abutment",
    skewRad: 0,
    placement: { source: "liner", alignmentId: "sample-aln", station, offset: 0 },
    bearingSeats: [],
    abutment: {
      id: supportId,
      formType,
      backwall: {
        id: `${supportId}-BACKWALL`,
        height: 5.5,
        thickness: 0.8,
        width: 11,
        seatElevation: 8,
      },
      wingWallL: { id: `${supportId}-WING-L`, length: 4, height: 5.5, thickness: 0.5 },
      wingWallR: { id: `${supportId}-WING-R`, length: 4, height: 5.5, thickness: 0.5 },
      footing: { id: `${supportId}-FOOTING`, length: 12, width: 8, thickness: 1.5, topElevation: 0 },
    },
  };
}

/** 基礎・杭を設定する（直接基礎 / 場所打ち杭 / 鋼管杭）。 */
function withFoundation(support: Support, kind: "spread" | "bored" | "steel"): Support {
  const sub = support.pier ?? support.abutment;
  if (!sub) return support;
  if (kind === "spread") {
    sub.pileGroup = null;
    return support;
  }
  const pileType: PileType = kind === "bored" ? "bored_pile" : "steel_pipe";
  sub.pileGroup = {
    id: `${support.supportId}-PILES`,
    pileType,
    diameter: pileType === "bored_pile" ? 1.2 : 0.8,
    length: pileType === "bored_pile" ? 18 : 22,
    pileCount: pileType === "bored_pile" ? 6 : 9,
    spacing: { x: pileType === "bored_pile" ? 3.6 : 2.8, y: pileType === "bored_pile" ? 3.6 : 2.8 },
  };
  return support;
}

/** 単一サンプル種別を生成（安定ID・deterministic）。 */
export function generateSample(kind: SampleKind, supportId: string, station: number): Support {
  switch (kind) {
    case "abutment_inverted_t":
      return abutmentBase(supportId, "inverted_t", station);
    case "abutment_cantilever":
      return abutmentBase(supportId, "cantilever_frame", station);
    case "pier_single":
      return pierBase(supportId, "single_column_rect", station);
    case "pier_wall":
      return pierBase(supportId, "wall", station);
    case "pier_portal":
      return pierBase(supportId, "portal_frame", station);
    case "foundation_spread":
      return withFoundation(pierBase(supportId, "single_column_rect", station), "spread");
    case "foundation_bored":
      return withFoundation(abutmentBase(supportId, "inverted_t", station), "bored");
    case "foundation_steel":
      return withFoundation(abutmentBase(supportId, "inverted_t", station), "steel");
    case "combination": {
      const combo = SAMPLE_COMBOS[0];
      return generateCombo(combo.id)[0];
    }
  }
}

/** 組合せサンプルを生成。 */
export function generateCombo(comboId: string): Support[] {
  const combo = SAMPLE_COMBOS.find((c) => c.id === comboId) ?? SAMPLE_COMBOS[0];
  return combo.supports.map((s) => generateSample(s.kind, s.supportId, s.station));
}

/** 全サンプル種別の単一例を生成（テスト用）。 */
export function generateAllSingleSamples(): Support[] {
  const kinds: SampleKind[] = [
    "abutment_inverted_t",
    "abutment_cantilever",
    "pier_single",
    "pier_wall",
    "pier_portal",
    "foundation_spread",
    "foundation_bored",
    "foundation_steel",
  ];
  return kinds.map((k, i) => generateSample(k, `${k.toUpperCase().slice(0, 4)}-${i + 1}`, i * 10));
}

/** 重複する supportId を検出。 */
export function findDuplicateIds(supports: readonly Support[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const s of supports) {
    if (seen.has(s.supportId)) dups.add(s.supportId);
    seen.add(s.supportId);
  }
  return [...dups];
}

/** LINER 支点（station のみ）から下部工を自動生成（橋脚として配置）。 */
export function generateFromLinerSupports(
  linerSupports: readonly { id: string; station: number }[],
  kind: SampleKind = "pier_single",
): Support[] {
  return linerSupports.map((ls) => generateSample(kind, ls.id, ls.station));
}
