// Phase C1 (M2-09A) フォーム状態パッチ → Support モデル変換（純粋ロジック）
// supportToForm（M2-03）の逆変換。UI 境界の degree → radian 変換を含む。
// null 値は「変更なし」として既存値を保持し、M1 Model 構造を壊さない。

import type { PileGroup, Support } from "../model";
import type { FormDataBundle } from "./SubstructureFormPanel";
import { degToRad } from "./forms/PlacementFields";

/** フォームパッチを適用した新しい Support を返す（変更のみ適用）。 */
export function applyFormPatchToSupport(support: Support, patch: Partial<FormDataBundle>): Support {
  let next: Support = { ...support };

  if (patch.supportId !== undefined && patch.supportId.trim() !== "" && patch.supportId !== support.supportId) {
    next = { ...next, supportId: patch.supportId };
  }

  if (patch.placement) {
    const p = patch.placement;
    const skewRad = p.skewDeg !== null && p.skewDeg !== undefined ? degToRad(p.skewDeg) : null;
    next = {
      ...next,
      placement: {
        source: support.placement.source,
        alignmentId: p.alignmentId || support.placement.alignmentId,
        station: p.station ?? support.placement.station,
        offset: p.offset ?? support.placement.offset,
        position: support.placement.position,
      },
      skewRad: skewRad ?? support.skewRad,
      zOverride: p.z ?? support.zOverride,
    };
  }

  if (patch.pier && next.pier) {
    const f = patch.pier;
    const pier = { ...next.pier, formType: f.formType ?? next.pier.formType };
    if (f.column) {
      const c = f.column;
      pier.column = {
        ...next.pier.column!,
        width: c.width ?? next.pier.column?.width ?? 0,
        depth: c.depth ?? next.pier.column?.depth ?? 0,
        height: c.height ?? next.pier.column?.height ?? 0,
        transverseOffset: c.transverseOffset ?? next.pier.column?.transverseOffset,
      };
    }
    if (f.cap) {
      const c = f.cap;
      pier.cap = {
        ...next.pier.cap!,
        width: c.width ?? next.pier.cap?.width ?? 0,
        depth: c.depth ?? next.pier.cap?.depth ?? 0,
        height: c.height ?? next.pier.cap?.height ?? 0,
        overhangL: c.overhangL ?? next.pier.cap?.overhangL ?? 0,
        overhangR: c.overhangR ?? next.pier.cap?.overhangR ?? 0,
      };
    }
    if (f.columns) {
      const existing = next.pier.columns ?? [];
      pier.columns = f.columns.map((c, i) => ({
        ...(existing[i] ?? {}),
        id: existing[i]?.id ?? `${next.supportId}-C${i + 1}`,
        width: c.width ?? existing[i]?.width ?? 0,
        depth: c.depth ?? existing[i]?.depth ?? 0,
        height: c.height ?? existing[i]?.height ?? 0,
        transverseOffset: c.transverseOffset ?? existing[i]?.transverseOffset,
      }));
    }
    if (f.beam) {
      const b = f.beam;
      pier.beam = {
        ...next.pier.beam!,
        width: b.width ?? next.pier.beam?.width ?? 0,
        depth: b.depth ?? next.pier.beam?.depth ?? 0,
        height: b.height ?? next.pier.beam?.height ?? 0,
      };
    }
    next = { ...next, pier };
  }

  if (patch.abutment && next.abutment) {
    const a = patch.abutment;
    const abutment = { ...next.abutment, formType: a.formType ?? next.abutment.formType };
    if (a.backwall) {
      const bw = a.backwall;
      abutment.backwall = {
        ...next.abutment.backwall,
        width: bw.width ?? next.abutment.backwall.width,
        height: bw.height ?? next.abutment.backwall.height,
        thickness: bw.thickness ?? next.abutment.backwall.thickness,
        seatElevation: bw.seatElevation ?? next.abutment.backwall.seatElevation,
      };
    }
    if (a.wingL) {
      abutment.wingWallL = { ...next.abutment.wingWallL, ...applyWingPatch(a.wingL) };
    }
    if (a.wingR) {
      abutment.wingWallR = { ...next.abutment.wingWallR, ...applyWingPatch(a.wingR) };
    }
    next = { ...next, abutment };
  }

  if (patch.foundation) {
    const f = patch.foundation;
    if (next.pier) {
      const pier = { ...next.pier };
      pier.footing = {
        ...pier.footing,
        length: f.footing.length ?? pier.footing.length,
        width: f.footing.width ?? pier.footing.width,
        thickness: f.footing.thickness ?? pier.footing.thickness,
        topElevation: f.footing.topElevation ?? pier.footing.topElevation,
      };
      pier.pileGroup = applyPileGroupPatch(pier.pileGroup, f, next.supportId);
      next = { ...next, pier };
    } else if (next.abutment) {
      const abutment = { ...next.abutment };
      abutment.footing = {
        ...abutment.footing,
        length: f.footing.length ?? abutment.footing.length,
        width: f.footing.width ?? abutment.footing.width,
        thickness: f.footing.thickness ?? abutment.footing.thickness,
        topElevation: f.footing.topElevation ?? abutment.footing.topElevation,
      };
      abutment.pileGroup = applyPileGroupPatch(abutment.pileGroup, f, next.supportId);
      next = { ...next, abutment };
    }
  }

  return next;
}

function applyPileGroupPatch(
  current: PileGroup | null | undefined,
  f: FormDataBundle["foundation"],
  supportId: string,
): PileGroup | null | undefined {
  if (f.isSpread) {
    return null;
  }
  if (!f.pile) {
    return current;
  }
  const pg = current;
  return {
    id: pg?.id ?? `${supportId}-PILES`,
    pileType: f.pile.pileType ?? pg?.pileType ?? "bored_pile",
    diameter: f.pile.diameter ?? pg?.diameter ?? 1.0,
    length: f.pile.length ?? pg?.length ?? 15,
    pileCount: f.pile.pileCount ?? pg?.pileCount ?? 4,
    spacing: pg?.spacing ?? { x: 3.6, y: 3.6 },
  };
}

function applyWingPatch(w: AbutmentFormDataWing) {
  return {
    length: w.length ?? 0,
    height: w.height ?? 0,
    thickness: w.thickness ?? 0,
  };
}

type AbutmentFormDataWing = NonNullable<FormDataBundle["abutment"]>["wingL"];
