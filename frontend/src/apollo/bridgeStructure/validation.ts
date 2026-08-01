import {
  BRIDGE_STRUCTURE_INPUT_FIELD_KEYS,
  BRIDGE_STRUCTURE_INPUT_FIELDS,
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
    schemaVersion: "1.0.0",
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
    generatedAt: null,
  };
}

export function validateBridgeStructureInputDraft(
  draft: ApolloBridgeStructureInputDraft,
): BridgeStructureValidationResult {
  const fieldErrors: BridgeStructureFieldValidation[] = [];
  const diagnostics: string[] = [];

  for (const field of BRIDGE_STRUCTURE_INPUT_FIELDS) {
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
    draft.spanLength > draft.bridgeLength
  ) {
    const message = "径間長は橋長以下である必要があります。";
    fieldErrors.push({ key: "spanLength", message });
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
  const allowed = new Set<string>([...BRIDGE_STRUCTURE_INPUT_FIELD_KEYS, "schemaVersion", "generatedAt"]);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      diagnostics.push(`apolloBridgeStructureInput contains unsupported field: ${key}.`);
    }
  }

  if (raw.schemaVersion !== "1.0.0") {
    diagnostics.push("apolloBridgeStructureInput schemaVersion must be 1.0.0.");
  }

  for (const key of BRIDGE_STRUCTURE_INPUT_FIELD_KEYS) {
    const value = raw[key];
    if (value !== null && value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
      diagnostics.push(`apolloBridgeStructureInput.${key} must be a finite number or null.`);
    }
  }

  if (
    raw.generatedAt !== null &&
    raw.generatedAt !== undefined &&
    typeof raw.generatedAt !== "string"
  ) {
    diagnostics.push("apolloBridgeStructureInput.generatedAt must be a string or null.");
  }

  return diagnostics;
}

export function parseBridgeStructureInputDraft(raw: unknown): ApolloBridgeStructureInputDraft | null {
  if (!isRecord(raw)) {
    return null;
  }
  const empty = createEmptyBridgeStructureInputDraft();
  const draft: ApolloBridgeStructureInputDraft = {
    ...empty,
    schemaVersion: "1.0.0",
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
  return {
    ...draft,
    generatedAt:
      generatedAt === null || generatedAt === undefined
        ? null
        : typeof generatedAt === "string"
          ? generatedAt
          : null,
  };
}
