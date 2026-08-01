import type {
  ApolloBridgeStructureInputDraft,
  BridgeStructureApproximateQuantity,
  BridgeStructureQuantityStatus,
} from "./types";
import { resolveSpanCount } from "./validation";

type ResolvedBridgeStructureInput = {
  readonly spanLength: number;
  readonly bridgeLength: number;
  readonly width: number;
  readonly girderCount: number;
  readonly girderSpacing: number;
  readonly girderDepth: number;
  readonly topFlangeWidth: number;
  readonly topFlangeThickness: number;
  readonly bottomFlangeWidth: number;
  readonly bottomFlangeThickness: number;
  readonly webThickness: number;
  readonly deckThickness: number;
  readonly crossBeamSpacing: number;
};

function resolveInput(draft: ApolloBridgeStructureInputDraft): ResolvedBridgeStructureInput | null {
  const values = [
    draft.spanLength,
    draft.bridgeLength,
    draft.width,
    draft.girderCount,
    draft.girderSpacing,
    draft.girderDepth,
    draft.topFlangeWidth,
    draft.topFlangeThickness,
    draft.bottomFlangeWidth,
    draft.bottomFlangeThickness,
    draft.webThickness,
    draft.deckThickness,
    draft.crossBeamSpacing,
  ];
  if (values.some((value) => value === null)) {
    return null;
  }
  return {
    spanLength: draft.spanLength!,
    bridgeLength: draft.bridgeLength!,
    width: draft.width!,
    girderCount: draft.girderCount!,
    girderSpacing: draft.girderSpacing!,
    girderDepth: draft.girderDepth!,
    topFlangeWidth: draft.topFlangeWidth!,
    topFlangeThickness: draft.topFlangeThickness!,
    bottomFlangeWidth: draft.bottomFlangeWidth!,
    bottomFlangeThickness: draft.bottomFlangeThickness!,
    webThickness: draft.webThickness!,
    deckThickness: draft.deckThickness!,
    crossBeamSpacing: draft.crossBeamSpacing!,
  };
}

function girderSectionArea(input: ResolvedBridgeStructureInput): number | null {
  const webHeight =
    input.girderDepth - input.topFlangeThickness - input.bottomFlangeThickness;
  if (webHeight <= 0) {
    return null;
  }
  return (
    input.topFlangeWidth * input.topFlangeThickness +
    input.bottomFlangeWidth * input.bottomFlangeThickness +
    input.webThickness * webHeight
  );
}

function quantityEntry(
  label: string,
  value: number | null,
  units: string,
  status: BridgeStructureQuantityStatus,
  note?: string,
): BridgeStructureApproximateQuantity {
  return { label, value, units, status, ...(note ? { note } : {}) };
}

/**
 * Geometry-only approximate quantities. Mass is omitted because unit-weight authority is not adopted.
 */
export function computeBridgeStructureApproximateQuantities(
  draft: ApolloBridgeStructureInputDraft,
  inputComplete: boolean,
): readonly BridgeStructureApproximateQuantity[] {
  const status: BridgeStructureQuantityStatus = inputComplete ? "NOT_AUTHORIZED" : "INCOMPLETE";
  const resolved = resolveInput(draft);
  if (!resolved) {
    return [
      quantityEntry(
        "概算数量",
        null,
        "—",
        "INCOMPLETE",
        "入力が不完全のため数量を算出できません。",
      ),
    ];
  }

  const spanCount = resolveSpanCount(resolved.bridgeLength, resolved.spanLength);
  if (spanCount === null) {
    return [
      quantityEntry(
        "概算数量",
        null,
        "—",
        "INCOMPLETE",
        "橋長を径間長で割り切れる値を入力してください。",
      ),
    ];
  }
  const crossBeamCount = Math.floor(resolved.bridgeLength / resolved.crossBeamSpacing) + 1;
  const sectionArea = girderSectionArea(resolved);
  const crossBeamLength =
    resolved.girderCount > 1 ? (resolved.girderCount - 1) * resolved.girderSpacing : 0;

  const quantities: BridgeStructureApproximateQuantity[] = [
    quantityEntry("径間数（概算）", spanCount, "径間", status),
    quantityEntry("横桁本数（概算）", crossBeamCount, "本", status),
    quantityEntry(
      "床版体積（概算）",
      resolved.width * resolved.bridgeLength * resolved.deckThickness,
      "m³",
      status,
      "単位重量は未採用のため体積のみ表示",
    ),
  ];

  if (sectionArea === null) {
    quantities.push(
      quantityEntry(
        "主桁鋼体積（概算）",
        null,
        "m³",
        "INCOMPLETE",
        "主桁断面寸法が不整合のため算出不可",
      ),
    );
  } else {
    const girderVolumePerLine = sectionArea * resolved.bridgeLength;
    quantities.push(
      quantityEntry(
        "主桁断面積（概算）",
        sectionArea,
        "m²",
        status,
      ),
      quantityEntry(
        "主桁鋼体積（概算）",
        girderVolumePerLine * resolved.girderCount,
        "m³",
        status,
        "単位重量は未採用のため体積のみ表示",
      ),
    );

    if (crossBeamLength > 0) {
      const crossBeamSectionArea = resolved.webThickness * resolved.girderDepth;
      quantities.push(
        quantityEntry(
          "横桁鋼体積（概算）",
          crossBeamCount * crossBeamSectionArea * crossBeamLength,
          "m³",
          status,
          "簡易断面（ウェブ厚×主桁高）による概算",
        ),
      );
    }
  }

  return quantities;
}
