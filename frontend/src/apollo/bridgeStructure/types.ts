/** Persisted bridge structure input draft for Visible Vertical Slice 01 (Block B). */

export const APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION = "1.0.0";

export const BRIDGE_STRUCTURE_INPUT_FIELD_KEYS = [
  "spanLength",
  "bridgeLength",
  "width",
  "girderCount",
  "girderSpacing",
  "girderDepth",
  "topFlangeWidth",
  "topFlangeThickness",
  "bottomFlangeWidth",
  "bottomFlangeThickness",
  "webThickness",
  "deckThickness",
  "crossBeamSpacing",
] as const;

export type BridgeStructureInputFieldKey = (typeof BRIDGE_STRUCTURE_INPUT_FIELD_KEYS)[number];

export type BridgeStructureNumericFieldState = {
  readonly value: number | null;
};

export type ApolloBridgeStructureInputDraft = {
  readonly schemaVersion: typeof APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION;
  readonly spanLength: number | null;
  readonly bridgeLength: number | null;
  readonly width: number | null;
  readonly girderCount: number | null;
  readonly girderSpacing: number | null;
  readonly girderDepth: number | null;
  readonly topFlangeWidth: number | null;
  readonly topFlangeThickness: number | null;
  readonly bottomFlangeWidth: number | null;
  readonly bottomFlangeThickness: number | null;
  readonly webThickness: number | null;
  readonly deckThickness: number | null;
  readonly crossBeamSpacing: number | null;
  readonly generatedAt: string | null;
};

export type BridgeStructureInputFieldDefinition = {
  readonly key: BridgeStructureInputFieldKey;
  readonly label: string;
  readonly units: string;
  readonly integer?: boolean;
  readonly min?: number;
};

export const BRIDGE_STRUCTURE_INPUT_FIELDS: readonly BridgeStructureInputFieldDefinition[] = [
  { key: "spanLength", label: "径間長", units: "m", min: 0 },
  { key: "bridgeLength", label: "橋長", units: "m", min: 0 },
  { key: "width", label: "幅員", units: "m", min: 0 },
  { key: "girderCount", label: "主桁本数", units: "本", integer: true, min: 1 },
  { key: "girderSpacing", label: "主桁間隔", units: "m", min: 0 },
  { key: "girderDepth", label: "主桁高", units: "m", min: 0 },
  { key: "topFlangeWidth", label: "上フランジ幅", units: "m", min: 0 },
  { key: "topFlangeThickness", label: "上フランジ厚", units: "m", min: 0 },
  { key: "bottomFlangeWidth", label: "下フランジ幅", units: "m", min: 0 },
  { key: "bottomFlangeThickness", label: "下フランジ厚", units: "m", min: 0 },
  { key: "webThickness", label: "ウェブ厚", units: "m", min: 0 },
  { key: "deckThickness", label: "床版厚", units: "m", min: 0 },
  { key: "crossBeamSpacing", label: "横桁間隔", units: "m", min: 0 },
];

export type BridgeStructureQuantityStatus = "NOT_AUTHORIZED" | "INCOMPLETE";

export type BridgeStructureApproximateQuantity = {
  readonly label: string;
  readonly value: number | null;
  readonly units: string;
  readonly status: BridgeStructureQuantityStatus;
  readonly note?: string;
};

export type BridgeStructureGenerationResult =
  | {
      readonly ok: true;
      readonly project: import("../../types").ProjectModel;
      readonly quantities: readonly BridgeStructureApproximateQuantity[];
    }
  | { readonly ok: false; readonly diagnostics: readonly string[] };
