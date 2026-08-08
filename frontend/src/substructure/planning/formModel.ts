// Phase C1 (M2-03) フォーム ↔ Support モデル変換 + 検証（純粋ロジック）
// UI 境界での degree/radian 変換を含む。Model の構造は M1 のまま保つ。

import type { Support } from "../model";
import type { AbutmentFormState } from "./forms/AbutmentInputForm";
import type { PierFormState } from "./forms/PierInputForm";
import type { FoundationFormState } from "./forms/FoundationInputForm";
import type { PlacementFormState } from "./forms/PlacementFields";
import { radToDeg } from "./forms/PlacementFields";

export interface SupportFormState {
  supportId: string;
  supportType: "pier" | "abutment";
  placement: PlacementFormState;
  pier: PierFormState | null;
  abutment: AbutmentFormState | null;
  foundation: FoundationFormState;
}

/** Support モデル → フォーム状態。 */
export function supportToForm(support: Support): SupportFormState {
  const skewDeg = radToDeg(support.skewRad);
  const placement: PlacementFormState = {
    alignmentId: support.placement.alignmentId ?? "",
    station: support.placement.station ?? null,
    offset: support.placement.offset ?? null,
    skewDeg,
    z: support.zOverride ?? null,
  };

  let pier: PierFormState | null = null;
  if (support.pier) {
    const c = support.pier.column;
    const cap = support.pier.cap;
    const cols = support.pier.columns ?? [];
    const beam = support.pier.beam;
    pier = {
      formType: support.pier.formType,
      column: {
        width: c?.width ?? null,
        depth: c?.depth ?? null,
        height: c?.height ?? null,
        transverseOffset: c?.transverseOffset ?? null,
      },
      cap: {
        width: cap?.width ?? null,
        depth: cap?.depth ?? null,
        height: cap?.height ?? null,
        overhangL: cap?.overhangL ?? null,
        overhangR: cap?.overhangR ?? null,
      },
      columns: [
        {
          width: cols[0]?.width ?? null,
          depth: cols[0]?.depth ?? null,
          height: cols[0]?.height ?? null,
          transverseOffset: cols[0]?.transverseOffset ?? null,
        },
        {
          width: cols[1]?.width ?? null,
          depth: cols[1]?.depth ?? null,
          height: cols[1]?.height ?? null,
          transverseOffset: cols[1]?.transverseOffset ?? null,
        },
      ],
      beam: {
        width: beam?.width ?? null,
        depth: beam?.depth ?? null,
        height: beam?.height ?? null,
      },
    };
  }

  let abutment: AbutmentFormState | null = null;
  if (support.abutment) {
    const a = support.abutment;
    abutment = {
      formType: a.formType,
      backwall: {
        width: a.backwall.width,
        height: a.backwall.height,
        thickness: a.backwall.thickness,
        seatElevation: a.backwall.seatElevation,
      },
      wingL: {
        length: a.wingWallL.length,
        height: a.wingWallL.height,
        thickness: a.wingWallL.thickness,
      },
      wingR: {
        length: a.wingWallR.length,
        height: a.wingWallR.height,
        thickness: a.wingWallR.thickness,
      },
    };
  }

  const foundation: FoundationFormState = {
    footing: {
      length: null,
      width: null,
      thickness: null,
      topElevation: null,
    },
    pile: {
      pileType: "bored_pile",
      diameter: null,
      length: null,
      pileCount: null,
    },
    isSpread: true,
  };
  const f = support.pier?.footing ?? support.abutment?.footing;
  if (f) {
    foundation.footing = {
      length: f.length,
      width: f.width,
      thickness: f.thickness,
      topElevation: f.topElevation,
    };
  }
  const pg = support.pier?.pileGroup ?? support.abutment?.pileGroup;
  if (pg) {
    foundation.isSpread = false;
    foundation.pile = {
      pileType: pg.pileType,
      diameter: pg.diameter,
      length: pg.length,
      pileCount: pg.pileCount,
    };
  }

  return {
    supportId: support.supportId,
    supportType: support.supportType,
    placement,
    pier,
    abutment,
    foundation,
  };
}

export interface FormValidation {
  issues: {
    fatal: string[];
    warning: string[];
    info: string[];
  };
  hasFatal: boolean;
}

/** フォーム状態の検証（fail-closed）。 */
export function validateForm(state: SupportFormState): FormValidation {
  const fatal: string[] = [];
  const warning: string[] = [];
  const info: string[] = [];

  const dims: Array<[string, number | null]> = [
    ["測点", state.placement.station],
    ["オフセット", state.placement.offset],
  ];
  if (state.pier) {
    if (state.pier.formType === "portal_frame") {
      state.pier.columns.forEach((c, i) => {
        dims.push([`柱${i + 1}幅`, c.width], [`柱${i + 1}奥行`, c.depth], [`柱${i + 1}高`, c.height]);
      });
      dims.push(["梁幅", state.pier.beam.width], ["梁奥行", state.pier.beam.depth], ["梁高", state.pier.beam.height]);
    } else {
      dims.push(
        ["柱幅", state.pier.column.width],
        ["柱奥行", state.pier.column.depth],
        ["柱高", state.pier.column.height],
        ["梁幅", state.pier.cap.width],
        ["梁奥行", state.pier.cap.depth],
        ["梁高", state.pier.cap.height],
      );
    }
  }
  if (state.abutment) {
    dims.push(
      ["背壁幅", state.abutment.backwall.width],
      ["背壁高", state.abutment.backwall.height],
      ["背壁厚", state.abutment.backwall.thickness],
    );
  }
  dims.push(
    ["フーチング長", state.foundation.footing.length],
    ["フーチング幅", state.foundation.footing.width],
    ["フーチング厚", state.foundation.footing.thickness],
  );
  if (!state.foundation.isSpread) {
    dims.push(
      ["杭径", state.foundation.pile.diameter],
      ["杭長", state.foundation.pile.length],
      ["杭本数", state.foundation.pile.pileCount],
    );
  }

  for (const [name, v] of dims) {
    if (v !== null && (!Number.isFinite(v) || v <= 0)) {
      fatal.push(`${name} は 0 より大きい値が必要です`);
    }
  }

  if (state.placement.skewDeg !== null && Math.abs(state.placement.skewDeg) > 30) {
    warning.push("斜角 30° を超えています（要確認）");
  }

  if (state.supportType === "pier" && !state.pier) {
    info.push("橋脚データが未定義です");
  }

  return {
    issues: { fatal, warning, info },
    hasFatal: fatal.length > 0,
  };
}
