import {
  BridgeSystem,
  resolveEffectiveLayout,
  validateBridgeLayoutContract,
} from "../contracts";
import {
  parseBridgeLayoutSpans,
  parseBridgeLayoutSupports,
  parseBridgeSystemField,
} from "../contracts/layoutParser";
import {
  createDefaultAppurtenanceConfiguration,
  parseAppurtenanceConfiguration,
  validateAppurtenanceConfigurationPersistence,
} from "./appurtenanceModel";
import {
  createDefaultHaunchConfiguration,
  parseHaunchConfiguration,
  validateHaunchConfigurationPersistence,
} from "./haunchModel";
import {
  APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION,
  APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION_LEGACY,
  BRIDGE_STRUCTURE_BOOLEAN_INPUT_KEYS,
  BRIDGE_STRUCTURE_CONFIGURATION_FIELD_KEYS,
  BRIDGE_STRUCTURE_INPUT_FIELD_KEYS,
  BRIDGE_STRUCTURE_INPUT_FIELDS,
  BRIDGE_STRUCTURE_LAYOUT_FIELD_KEYS,
  DEFAULT_BRIDGE_SYSTEM,
  type ApolloBridgeStructureInputDraft,
  type BridgeStructureInputFieldKey,
} from "./types";

export type BridgeStructureFieldValidation = {
  readonly key: BridgeStructureInputFieldKey;
  readonly message: string | null;
};

export type BridgeStructureValidationResult = {
  readonly fieldErrors: readonly BridgeStructureFieldValidation[];
  readonly diagnostics: readonly string[];
  readonly complete: boolean;
};

/** Tolerance for bridgeLength / spanLength integer divisibility checks. */
export const SPAN_LENGTH_RATIO_TOLERANCE = 1e-9;

export function resolveSpanCount(bridgeLength: number, spanLength: number): number | null {
  const ratio = bridgeLength / spanLength;
  const spanCount = Math.round(ratio);
  if (spanCount < 1 || Math.abs(ratio - spanCount) > SPAN_LENGTH_RATIO_TOLERANCE) {
    return null;
  }
  return spanCount;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validatePositiveNumber(
  value: unknown,
  label: string,
  options: { readonly integer?: boolean; readonly min?: number } = {},
): string | null {
  if (value === null || value === undefined) {
    return `${label}を入力してください。`;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return `${label}は数値で入力してください。`;
  }
  const min = options.min ?? 0;
  if (options.integer && !Number.isInteger(value)) {
    return `${label}は整数で入力してください。`;
  }
  if (value <= min) {
    return `${label}は ${min} より大きい値を入力してください。`;
  }
  return null;
}

export function createEmptyBridgeStructureInputDraft(): ApolloBridgeStructureInputDraft {
  return {
    schemaVersion: APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION,
    spanLength: null,
    bridgeLength: null,
    width: null,
    girderCount: null,
    girderSpacing: null,
    girderDepth: null,
    topFlangeWidth: null,
    topFlangeThickness: null,
    bottomFlangeWidth: null,
    bottomFlangeThickness: null,
    webThickness: null,
    deckThickness: null,
    crossBeamSpacing: null,
    stiffenerSpacing: null,
    swayBracingInterval: null,
    steelUnitWeight: null,
    rcUnitWeight: null,
    lateralBracingEnabled: false,
    upperLateralBracingEnabled: false,
    bridgeSystem: DEFAULT_BRIDGE_SYSTEM,
    spans: [],
    supports: [],
    appurtenanceConfiguration: createDefaultAppurtenanceConfiguration(),
    haunchConfiguration: createDefaultHaunchConfiguration(),
    generatedAt: null,
  };
}

export function validateBridgeStructureInputDraft(
  draft: ApolloBridgeStructureInputDraft,
): BridgeStructureValidationResult {
  const fieldErrors: BridgeStructureFieldValidation[] = [];
  const diagnostics: string[] = [];

  for (const field of BRIDGE_STRUCTURE_INPUT_FIELDS) {
    if (
      field.key === "spanLength" &&
      draft.bridgeSystem === BridgeSystem.CONTINUOUS &&
      draft.spans.length > 0
    ) {
      fieldErrors.push({ key: field.key, message: null });
      continue;
    }
    if (field.optional && draft[field.key] === null) {
      fieldErrors.push({ key: field.key, message: null });
      continue;
    }
    const message = validatePositiveNumber(draft[field.key], field.label, {
      integer: field.integer,
      min: field.min,
    });
    fieldErrors.push({ key: field.key, message });
    if (message) {
      diagnostics.push(message);
    }
  }

  if (
    draft.spanLength !== null &&
    draft.bridgeLength !== null &&
    draft.bridgeSystem === BridgeSystem.SIMPLE_SINGLE &&
    draft.spanLength > draft.bridgeLength
  ) {
    const message = "支間長は構造モデル長以下である必要があります。";
    fieldErrors.push({ key: "spanLength", message });
    diagnostics.push(message);
  }

  if (
    draft.bridgeSystem === BridgeSystem.SIMPLE_SINGLE &&
    draft.spanLength !== null &&
    draft.bridgeLength !== null &&
    draft.spanLength <= draft.bridgeLength &&
    resolveSpanCount(draft.bridgeLength, draft.spanLength) === null
  ) {
    const message = "構造モデル長を支間長で割り切れる値を入力してください。";
    fieldErrors.push({ key: "spanLength", message });
    diagnostics.push(message);
  }

  diagnostics.push(
    ...validateBridgeLayoutContract({
      bridgeSystem: draft.bridgeSystem,
      bridgeLength: draft.bridgeLength,
      spanLength: draft.spanLength,
      spans: draft.spans,
      supports: draft.supports,
    }),
  );

  if (
    draft.girderCount !== null &&
    draft.girderSpacing !== null &&
    draft.width !== null &&
    draft.girderCount > 1 &&
    (draft.girderCount - 1) * draft.girderSpacing > draft.width
  ) {
    const message = "主桁配置幅が床版幅を超えています。";
    fieldErrors.push({ key: "girderSpacing", message });
    diagnostics.push(message);
  }

  if (
    draft.girderDepth !== null &&
    draft.topFlangeThickness !== null &&
    draft.bottomFlangeThickness !== null &&
    draft.girderDepth <= draft.topFlangeThickness + draft.bottomFlangeThickness
  ) {
    const message = "主桁高は上下フランジ厚の合計より大きい必要があります。";
    fieldErrors.push({ key: "girderDepth", message });
    diagnostics.push(message);
  }

  return {
    fieldErrors,
    diagnostics,
    complete: diagnostics.length === 0,
  };
}

export function validateBridgeStructureInputPersistence(raw: unknown): readonly string[] {
  if (!isRecord(raw)) {
    return ["apolloBridgeStructureInput must be an object."];
  }

  const diagnostics: string[] = [];
  const allowed = new Set<string>([
    ...BRIDGE_STRUCTURE_INPUT_FIELD_KEYS,
    ...BRIDGE_STRUCTURE_BOOLEAN_INPUT_KEYS,
    ...BRIDGE_STRUCTURE_LAYOUT_FIELD_KEYS,
    ...BRIDGE_STRUCTURE_CONFIGURATION_FIELD_KEYS,
    "schemaVersion",
    "generatedAt",
  ]);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      diagnostics.push(`apolloBridgeStructureInput contains unsupported field: ${key}.`);
    }
  }

  if (
    raw.schemaVersion !== APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION &&
    raw.schemaVersion !== APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION_LEGACY
  ) {
    diagnostics.push(
      `apolloBridgeStructureInput schemaVersion must be ${APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION_LEGACY} or ${APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION}.`,
    );
  }

  for (const key of BRIDGE_STRUCTURE_INPUT_FIELD_KEYS) {
    const value = raw[key];
    if (value !== null && value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
      diagnostics.push(`apolloBridgeStructureInput.${key} must be a finite number or null.`);
    }
  }

  if (
    raw.lateralBracingEnabled !== null &&
    raw.lateralBracingEnabled !== undefined &&
    typeof raw.lateralBracingEnabled !== "boolean"
  ) {
    diagnostics.push("apolloBridgeStructureInput.lateralBracingEnabled must be a boolean or null.");
  }

  if (
    raw.upperLateralBracingEnabled !== null &&
    raw.upperLateralBracingEnabled !== undefined &&
    typeof raw.upperLateralBracingEnabled !== "boolean"
  ) {
    diagnostics.push("apolloBridgeStructureInput.upperLateralBracingEnabled must be a boolean or null.");
  }

  if (
    raw.generatedAt !== null &&
    raw.generatedAt !== undefined &&
    typeof raw.generatedAt !== "string"
  ) {
    diagnostics.push("apolloBridgeStructureInput.generatedAt must be a string or null.");
  }

  if (
    raw.bridgeSystem !== undefined &&
    raw.bridgeSystem !== null &&
    raw.bridgeSystem !== BridgeSystem.SIMPLE_SINGLE &&
    raw.bridgeSystem !== BridgeSystem.CONTINUOUS &&
    raw.bridgeSystem !== BridgeSystem.SIMPLE_MULTIPLE
  ) {
    diagnostics.push(
      "apolloBridgeStructureInput.bridgeSystem must be SIMPLE_SINGLE, CONTINUOUS, or SIMPLE_MULTIPLE.",
    );
  }

  if (raw.spans !== undefined && raw.spans !== null) {
    if (!Array.isArray(raw.spans)) {
      diagnostics.push("apolloBridgeStructureInput.spans must be an array.");
    } else {
      for (const [index, entry] of raw.spans.entries()) {
        if (!isRecord(entry)) {
          diagnostics.push(`apolloBridgeStructureInput.spans[${index}] must be an object.`);
          continue;
        }
        if (typeof entry.id !== "string") {
          diagnostics.push(`apolloBridgeStructureInput.spans[${index}].id must be a string.`);
        }
        if (typeof entry.length !== "number" || !Number.isFinite(entry.length)) {
          diagnostics.push(`apolloBridgeStructureInput.spans[${index}].length must be a finite number.`);
        }
      }
    }
  }

  if (raw.supports !== undefined && raw.supports !== null) {
    if (!Array.isArray(raw.supports)) {
      diagnostics.push("apolloBridgeStructureInput.supports must be an array.");
    } else {
      for (const [index, entry] of raw.supports.entries()) {
        if (!isRecord(entry)) {
          diagnostics.push(`apolloBridgeStructureInput.supports[${index}] must be an object.`);
          continue;
        }
        if (typeof entry.id !== "string") {
          diagnostics.push(`apolloBridgeStructureInput.supports[${index}].id must be a string.`);
        }
        if (typeof entry.station !== "number" || !Number.isFinite(entry.station)) {
          diagnostics.push(`apolloBridgeStructureInput.supports[${index}].station must be a finite number.`);
        }
        if (entry.role !== "ABUTMENT" && entry.role !== "PIER") {
          diagnostics.push(`apolloBridgeStructureInput.supports[${index}].role must be ABUTMENT or PIER.`);
        }
      }
    }
  }

  diagnostics.push(...validateAppurtenanceConfigurationPersistence(raw.appurtenanceConfiguration));
  diagnostics.push(...validateHaunchConfigurationPersistence(raw.haunchConfiguration));

  return diagnostics;
}

/**
 * Parse + migrate 1.0.0 → 1.1.0-development.
 * Missing appurtenance/haunch fields become NOT_PROVIDED / empty — never EXPLICIT_NONE,
 * never auto-created entities, never null→0.
 */
export function parseBridgeStructureInputDraft(raw: unknown): ApolloBridgeStructureInputDraft | null {
  if (!isRecord(raw)) {
    return null;
  }
  const empty = createEmptyBridgeStructureInputDraft();
  const draft: ApolloBridgeStructureInputDraft = {
    ...empty,
    schemaVersion: APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION,
  };

  for (const key of BRIDGE_STRUCTURE_INPUT_FIELD_KEYS) {
    const value = raw[key];
    if (value === null || value === undefined) {
      (draft as Record<string, unknown>)[key] = null;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      (draft as Record<string, unknown>)[key] = value;
    } else {
      return null;
    }
  }

  const generatedAt = raw.generatedAt;
  const lateralBracingRaw = raw.lateralBracingEnabled;
  const upperLateralBracingRaw = raw.upperLateralBracingEnabled;
  const spans = parseBridgeLayoutSpans(raw.spans);
  if (spans === null) {
    return null;
  }
  const supports = parseBridgeLayoutSupports(raw.supports);
  if (supports === null) {
    return null;
  }

  const appurtenanceConfiguration = parseAppurtenanceConfiguration(raw.appurtenanceConfiguration);
  if (appurtenanceConfiguration === null) {
    return null;
  }
  const haunchConfiguration = parseHaunchConfiguration(raw.haunchConfiguration);
  if (haunchConfiguration === null) {
    return null;
  }

  // Legacy 1.0.0 → 1.1.0-development: new fields are NOT_PROVIDED; mark generation STALE.
  const migratedFromLegacy = raw.schemaVersion === APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION_LEGACY;
  const preservedGeneratedAt =
    generatedAt === null || generatedAt === undefined
      ? null
      : typeof generatedAt === "string"
        ? generatedAt
        : null;

  return {
    ...draft,
    schemaVersion: APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION,
    lateralBracingEnabled: typeof lateralBracingRaw === "boolean" ? lateralBracingRaw : false,
    upperLateralBracingEnabled:
      typeof upperLateralBracingRaw === "boolean" ? upperLateralBracingRaw : false,
    bridgeSystem: parseBridgeSystemField(raw.bridgeSystem),
    spans,
    supports,
    appurtenanceConfiguration,
    haunchConfiguration,
    generatedAt: migratedFromLegacy ? null : preservedGeneratedAt,
  };
}
