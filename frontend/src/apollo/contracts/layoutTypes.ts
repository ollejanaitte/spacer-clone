/** Continuous girder layout contracts (C1). User C1/C2 spec is source of truth over C0 equal-span docs. */

export const BridgeSystem = {
  SIMPLE_SINGLE: "SIMPLE_SINGLE",
  CONTINUOUS: "CONTINUOUS",
  SIMPLE_MULTIPLE: "SIMPLE_MULTIPLE",
} as const;

export type BridgeSystem = (typeof BridgeSystem)[keyof typeof BridgeSystem];

export const CONTINUOUS_SPAN_COUNT_MIN = 2;
export const CONTINUOUS_SPAN_COUNT_MAX = 5;

export const SupportLayoutRole = {
  ABUTMENT: "ABUTMENT",
  PIER: "PIER",
} as const;

export type SupportLayoutRole = (typeof SupportLayoutRole)[keyof typeof SupportLayoutRole];

export type BridgeLayoutSpan = {
  readonly id: string;
  readonly length: number;
};

export type BridgeLayoutSupport = {
  readonly id: string;
  readonly station: number;
  readonly role: SupportLayoutRole;
};

export type BridgeLayoutContract = {
  readonly bridgeSystem: BridgeSystem;
  readonly spans: readonly BridgeLayoutSpan[];
  readonly supports: readonly BridgeLayoutSupport[];
};
