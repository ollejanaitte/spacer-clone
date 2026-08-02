import type { GovernedQuantityAdoptionStatus } from "../../contracts";
import type {
  ApolloBridgeStructureInputDraft,
  BridgeStructureApproximateQuantity,
  BridgeStructureQuantityStatus,
} from "./types";
import { resolveSpanCount } from "./validation";
import { computeGirderSectionProperties } from "./sectionProperties";

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
  readonly stiffenerSpacing: number | null;
  readonly swayBracingInterval: number | null;
  readonly steelUnitWeight: number | null;
  readonly rcUnitWeight: number | null;
  readonly lateralBracingEnabled: boolean;
};

export type BridgeStructureUnitWeightAdoption = {
  readonly steel: GovernedQuantityAdoptionStatus;
  readonly rc: GovernedQuantityAdoptionStatus;
};

const DEFAULT_ADOPTION: BridgeStructureUnitWeightAdoption = {
  steel: "UNKNOWN",
  rc: "UNKNOWN",
};

/**
 * Documented geometric assumptions for approximate secondary-member quantities.
 * These are pure-geometry visualization assumptions only; they are never
 * adopted as design values.
 */
const STIFFENER_PLATE_WIDTH_M = 0.15;
const BRACING_MEMBER_DIAMETER_M = 0.08;

function resolveInput(draft: ApolloBridgeStructureInputDraft): ResolvedBridgeStructureInput | null {
  const coreValues = [
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
  if (coreValues.some((value) => value === null)) {
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
    stiffenerSpacing: draft.stiffenerSpacing,
    swayBracingInterval: draft.swayBracingInterval,
    steelUnitWeight: draft.steelUnitWeight,
    rcUnitWeight: draft.rcUnitWeight,
    lateralBracingEnabled: draft.lateralBracingEnabled,
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

function weightStatus(
  hasUnitWeight: boolean,
  adoption: GovernedQuantityAdoptionStatus,
): BridgeStructureQuantityStatus {
  if (!hasUnitWeight) {
    return "NOT_AUTHORIZED";
  }
  return adoption === "ADOPTED" ? "ADOPTED" : "USER_PROVIDED_UNVERIFIED";
}

function countStiffeners(input: ResolvedBridgeStructureInput): number {
  if (input.stiffenerSpacing === null) {
    return 0;
  }
  const stationsPerGirder = Math.floor(input.bridgeLength / input.stiffenerSpacing) + 1;
  return stationsPerGirder * input.girderCount;
}

function countSwayBracingStations(input: ResolvedBridgeStructureInput): number {
  if (input.swayBracingInterval === null) {
    return 0;
  }
  const crossBeamCount = Math.floor(input.bridgeLength / input.crossBeamSpacing) + 1;
  let count = 0;
  for (let index = 1; index <= crossBeamCount - 2; index += 1) {
    if (index % input.swayBracingInterval === 0) {
      count += 1;
    }
  }
  return count;
}

function stiffenerVolumeM3(input: ResolvedBridgeStructureInput, section: { webHeight: number }): number {
  const count = countStiffeners(input);
  if (count === 0) {
    return 0;
  }
  return (
    count *
    section.webHeight *
    STIFFENER_PLATE_WIDTH_M *
    input.webThickness
  );
}

function swayBracingVolumeM3(input: ResolvedBridgeStructureInput): number {
  const stations = countSwayBracingStations(input);
  if (stations === 0 || input.girderCount < 2) {
    return 0;
  }
  const diagonalLength = Math.sqrt(input.girderSpacing ** 2 + input.girderDepth ** 2);
  const memberArea = Math.PI * (BRACING_MEMBER_DIAMETER_M / 2) ** 2;
  return stations * (input.girderCount - 1) * 2 * memberArea * diagonalLength;
}

function lateralBracingVolumeM3(input: ResolvedBridgeStructureInput): number {
  if (!input.lateralBracingEnabled || input.girderCount < 2) {
    return 0;
  }
  const crossBeamCount = Math.floor(input.bridgeLength / input.crossBeamSpacing) + 1;
  const bays = crossBeamCount - 1;
  const diagonalLength = Math.sqrt(input.girderSpacing ** 2 + input.crossBeamSpacing ** 2);
  const memberArea = Math.PI * (BRACING_MEMBER_DIAMETER_M / 2) ** 2;
  return (input.girderCount - 1) * bays * 2 * memberArea * diagonalLength;
}

/**
 * Geometry-only approximate quantities. Mass is only produced when a unit
 * weight is provided by the user; adopted unit weights flip the row to ADOPTED.
 */
export function computeBridgeStructureApproximateQuantities(
  draft: ApolloBridgeStructureInputDraft,
  inputComplete: boolean,
  adoption: BridgeStructureUnitWeightAdoption = DEFAULT_ADOPTION,
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
  const section = computeGirderSectionProperties(resolved);

  const stiffenerCount = countStiffeners(resolved);
  const swayStationCount = countSwayBracingStations(resolved);

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

  if (resolved.stiffenerSpacing === null) {
    quantities.push(
      quantityEntry(
        "補剛材本数（概算）",
        null,
        "本",
        status,
        "補剛材間隔が未設定のため算出なし",
      ),
    );
  } else {
    quantities.push(quantityEntry("補剛材本数（概算）", stiffenerCount, "本", status));
  }

  if (resolved.swayBracingInterval === null) {
    quantities.push(
      quantityEntry(
        "対傾構箇所数（概算）",
        null,
        "箇所",
        status,
        "対傾構間隔が未設定のため算出なし",
      ),
    );
  } else {
    quantities.push(
      quantityEntry(
        "対傾構箇所数（概算）",
        swayStationCount,
        "箇所",
        status,
        "横桁N本ごとの簡易算出",
      ),
    );
  }

  quantities.push(
    quantityEntry(
      "横繋（概算）",
      resolved.lateralBracingEnabled ? 1 : 0,
      "有/無",
      status,
      resolved.lateralBracingEnabled ? "下フランジ水平ブレース有" : "下フランジ水平ブレース無",
    ),
  );

  if (sectionArea === null || section === null) {
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
    const stiffenerVolume = stiffenerVolumeM3(resolved, section);
    const swayVolume = swayBracingVolumeM3(resolved);
    const lateralVolume = lateralBracingVolumeM3(resolved);
    const steelVolume =
      girderVolumePerLine * resolved.girderCount + stiffenerVolume + swayVolume + lateralVolume;
    const hasSteelUnitWeight = resolved.steelUnitWeight !== null;

    quantities.push(
      quantityEntry("主桁断面積（概算）", sectionArea, "m²", status),
      quantityEntry(
        "主桁鋼体積（概算）",
        steelVolume,
        "m³",
        status,
        "補剛材・対傾構・横繋を含む概算",
      ),
      quantityEntry(
        "鋼重量（概算）",
        hasSteelUnitWeight ? steelVolume * resolved.steelUnitWeight! : null,
        "kN",
        weightStatus(hasSteelUnitWeight, adoption.steel),
        hasSteelUnitWeight
          ? adoption.steel === "ADOPTED"
            ? "鋼の単位体積重量は ADOPTED として採用済み"
            : "鋼の単位体積重量はユーザー入力（未採用）"
          : "鋼の単位体積重量が未設定のため重量未算出",
      ),
      quantityEntry(
        "RC床版重量（概算）",
        resolved.rcUnitWeight !== null
          ? resolved.width * resolved.bridgeLength * resolved.deckThickness * resolved.rcUnitWeight
          : null,
        "kN",
        weightStatus(resolved.rcUnitWeight !== null, adoption.rc),
        resolved.rcUnitWeight !== null
          ? adoption.rc === "ADOPTED"
            ? "RC床版の単位体積重量は ADOPTED として採用済み"
            : "RC床版の単位体積重量はユーザー入力（未採用）"
          : "RC床版の単位体積重量が未設定のため重量未算出",
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
