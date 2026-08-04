/** WF-05 RC deck haunch builders, parsers, and validation (Step 4-B). */

import { stableEntitySeed, stableUuidFromSeed } from "./stableIds";
import {
  HAUNCH_SHAPE_TYPES,
  mainGirderKeyFromIndex,
  type ApolloHaunchConfigurationDraft,
  type ApolloHaunchGirderDraft,
  type ApolloHaunchItemDraft,
  type HaunchDiagnostic,
  type HaunchShapeType,
  type RcDeckHaunchModel,
} from "./haunchTypes";
import { PRESENCE_STATUS, isPresenceStatus, validatePresenceConsistency } from "./presence";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createEmptyHaunchItemDraft(haunchId: string): ApolloHaunchItemDraft {
  return {
    haunchId,
    startStation: null,
    endStation: null,
    shapeType: null,
    topWidth: null,
    bottomWidth: null,
    height: null,
    materialRef: null,
  };
}

export function createDefaultHaunchConfiguration(): ApolloHaunchConfigurationDraft {
  return { girders: [] };
}

export function stableHaunchId(projectScopeId: string, mainGirderKey: string): string {
  return stableUuidFromSeed(stableEntitySeed(projectScopeId, "RcDeckHaunch", mainGirderKey));
}

export function resolveMainGirderRefId(projectScopeId: string, mainGirderKey: string): string {
  return stableUuidFromSeed(stableEntitySeed(projectScopeId, "MainGirder", mainGirderKey));
}

function parseFiniteNumberOrNull(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return undefined;
}

function parseShapeType(value: unknown): HaunchShapeType | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && (HAUNCH_SHAPE_TYPES as readonly string[]).includes(value)) {
    return value as HaunchShapeType;
  }
  return undefined;
}

function parseHaunchItem(raw: unknown): ApolloHaunchItemDraft | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.haunchId !== "string" || raw.haunchId.length === 0) return null;
  const startStation = parseFiniteNumberOrNull(raw.startStation);
  const endStation = parseFiniteNumberOrNull(raw.endStation);
  const topWidth = parseFiniteNumberOrNull(raw.topWidth);
  const bottomWidth = parseFiniteNumberOrNull(raw.bottomWidth);
  const height = parseFiniteNumberOrNull(raw.height);
  const materialRef = parseOptionalString(raw.materialRef);
  const shapeType = parseShapeType(raw.shapeType);
  if (
    startStation === undefined ||
    endStation === undefined ||
    topWidth === undefined ||
    bottomWidth === undefined ||
    height === undefined ||
    materialRef === undefined ||
    shapeType === undefined
  ) {
    return null;
  }
  if (materialRef !== null && materialRef.trim() === "") return null;
  return {
    haunchId: raw.haunchId,
    startStation,
    endStation,
    shapeType,
    topWidth,
    bottomWidth,
    height,
    materialRef,
  };
}

export function parseHaunchConfiguration(raw: unknown): ApolloHaunchConfigurationDraft | null {
  if (raw === undefined || raw === null) {
    return createDefaultHaunchConfiguration();
  }
  if (!isRecord(raw) || !Array.isArray(raw.girders)) {
    return null;
  }
  const girders: ApolloHaunchGirderDraft[] = [];
  const seenKeys = new Set<string>();
  for (const entry of raw.girders) {
    if (!isRecord(entry)) return null;
    if (typeof entry.mainGirderKey !== "string" || entry.mainGirderKey.length === 0) return null;
    if (seenKeys.has(entry.mainGirderKey)) return null;
    seenKeys.add(entry.mainGirderKey);
    if (!isPresenceStatus(entry.presence)) return null;
    let item: ApolloHaunchItemDraft | null = null;
    if (entry.item !== null && entry.item !== undefined) {
      item = parseHaunchItem(entry.item);
      if (item === null) return null;
    }
    girders.push({
      mainGirderKey: entry.mainGirderKey,
      presence: entry.presence,
      item,
    });
  }
  return { girders };
}

export function validateHaunchConfigurationPersistence(raw: unknown): readonly string[] {
  if (raw === undefined || raw === null) return [];
  if (!isRecord(raw)) return ["apolloBridgeStructureInput.haunchConfiguration must be an object."];
  if (!Array.isArray(raw.girders)) {
    return ["apolloBridgeStructureInput.haunchConfiguration.girders must be an array."];
  }
  const diagnostics: string[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of raw.girders.entries()) {
    const path = `apolloBridgeStructureInput.haunchConfiguration.girders[${index}]`;
    if (!isRecord(entry)) {
      diagnostics.push(`${path} must be an object.`);
      continue;
    }
    if (typeof entry.mainGirderKey !== "string" || entry.mainGirderKey.length === 0) {
      diagnostics.push(`${path}.mainGirderKey must be a non-empty string.`);
    } else if (seen.has(entry.mainGirderKey)) {
      diagnostics.push(`${path}.mainGirderKey duplicates ${entry.mainGirderKey}.`);
    } else {
      seen.add(entry.mainGirderKey);
    }
    if (!isPresenceStatus(entry.presence)) {
      diagnostics.push(`${path}.presence must be NOT_PROVIDED | EXPLICIT_NONE | PROVIDED.`);
    }
    if (entry.item !== null && entry.item !== undefined && !isRecord(entry.item)) {
      diagnostics.push(`${path}.item must be an object or null.`);
    }
  }
  return diagnostics;
}

export type HaunchValidationContext = {
  readonly bridgeLength: number | null;
  readonly girderCount: number | null;
  readonly projectScopeId: string;
};

export type HaunchValidationResult = {
  readonly diagnostics: readonly HaunchDiagnostic[];
  readonly blockingDiagnostics: readonly HaunchDiagnostic[];
  readonly allPresenceDecided: boolean;
  readonly complete: boolean;
  readonly models: readonly RcDeckHaunchModel[];
};

function itemHasPayload(item: ApolloHaunchItemDraft | null): boolean {
  return item !== null;
}

function itemIsFullySpecified(item: ApolloHaunchItemDraft): boolean {
  return (
    item.startStation !== null &&
    item.endStation !== null &&
    item.shapeType !== null &&
    item.topWidth !== null &&
    item.height !== null &&
    (item.shapeType === "RECT" || item.bottomWidth !== null)
  );
}

export function expectedGirderKeys(girderCount: number): readonly string[] {
  return Array.from({ length: girderCount }, (_, index) => mainGirderKeyFromIndex(index));
}


function girderDisplayName(key: string): string {
  const match = /^girder-(\d+)$/.exec(key);
  if (!match) return key;
  return `主桁 ${Number(match[1]) + 1}`;
}

export function validateRcDeckHaunchConfiguration(
  configuration: ApolloHaunchConfigurationDraft,
  context: HaunchValidationContext,
): HaunchValidationResult {
  const diagnostics: HaunchDiagnostic[] = [];
  const models: RcDeckHaunchModel[] = [];
  const ids = new Set<string>();
  const keys = new Set<string>();
  let allPresenceDecided = true;

  if (context.girderCount === null || context.girderCount < 1) {
    if (configuration.girders.length === 0) {
      diagnostics.push({
        code: "HAUNCH_MISSING_GIRDER_COUNT",
        mainGirderKey: null,
        blocking: false,
        message: "主桁本数が未入力のためハンチの有無を完了判定できません。",
        remediation: "WF-02/WF-04 で主桁本数を入力してください。",
      });
      return {
        diagnostics,
        blockingDiagnostics: diagnostics.filter((d) => d.blocking),
        allPresenceDecided: false,
        complete: false,
        models: [],
      };
    }
  }

  const expectedKeys =
    context.girderCount !== null && context.girderCount >= 1
      ? expectedGirderKeys(context.girderCount)
      : configuration.girders.map((g) => g.mainGirderKey);

  const byKey = new Map(configuration.girders.map((g) => [g.mainGirderKey, g]));

  for (const key of expectedKeys) {
    const girder = byKey.get(key);
    if (!girder) {
      allPresenceDecided = false;
      diagnostics.push({
        code: "HAUNCH_GIRDER_UNDECIDED",
        mainGirderKey: key,
        blocking: false,
        message: `${girderDisplayName(key)} のハンチ有無が未入力です。`,
        remediation: "各主桁について「あり」「なし」を選択するか「全主桁に適用」を使ってください。",
      });
      continue;
    }

    if (keys.has(girder.mainGirderKey)) {
      diagnostics.push({
        code: "HAUNCH_DUPLICATE_GIRDER_REF",
        mainGirderKey: key,
        blocking: true,
        message: `${girderDisplayName(key)} の設定が重複しています。`,
        remediation: "ハンチ設定を一度未入力に戻して再設定してください。",
      });
      continue;
    }
    keys.add(girder.mainGirderKey);

    const presenceCheck = validatePresenceConsistency(
      girder.presence,
      itemHasPayload(girder.item),
      `主桁 ${key}`,
    );
    if (!presenceCheck.ok && presenceCheck.code && presenceCheck.message) {
      const code =
        presenceCheck.code === "PRESENCE_PROVIDED_WITHOUT_ITEM"
          ? "HAUNCH_PROVIDED_WITHOUT_ITEM"
          : "HAUNCH_EXPLICIT_NONE_WITH_ITEM";
      diagnostics.push({
        code,
        mainGirderKey: key,
        blocking: true,
        message: presenceCheck.message,
        remediation: "有無と項目内容を一致させてください。",
      });
      continue;
    }

    if (girder.presence === PRESENCE_STATUS.NOT_PROVIDED) {
      allPresenceDecided = false;
      diagnostics.push({
        code: "HAUNCH_PRESENCE_NOT_PROVIDED",
        mainGirderKey: key,
        blocking: false,
        message: `${girderDisplayName(key)} のハンチ有無が未入力です。`,
        remediation: "「あり」「なし」のいずれかを選択してください。",
      });
      continue;
    }

    if (girder.presence === PRESENCE_STATUS.EXPLICIT_NONE) {
      continue;
    }

    const item = girder.item;
    if (!item) continue;

    if (ids.has(item.haunchId)) {
      diagnostics.push({
        code: "HAUNCH_DUPLICATE_ID",
        mainGirderKey: key,
        blocking: true,
        message: `${girderDisplayName(key)}: ハンチ ID が重複しています。`,
        remediation: "当該主桁を一度未入力に戻して再設定してください。",
      });
      continue;
    }
    ids.add(item.haunchId);

    if (!itemIsFullySpecified(item)) {
      allPresenceDecided = false;
      diagnostics.push({
        code: "HAUNCH_INVALID_DIMENSION",
        mainGirderKey: key,
        blocking: false,
        message: `${girderDisplayName(key)}: ハンチ寸法が不足しています。`,
        remediation: "形状・測点・幅・高さを入力してください。",
      });
      continue;
    }

    if (context.bridgeLength === null) {
      diagnostics.push({
        code: "HAUNCH_MISSING_BRIDGE_LENGTH",
        mainGirderKey: key,
        blocking: true,
        message: `${girderDisplayName(key)}: 構造モデル長が未入力のため測点を検証できません。`,
        remediation: "WF-02 で構造モデル長を入力してください。",
      });
      continue;
    }

    const start = item.startStation!;
    const end = item.endStation!;
    if (!(start >= 0 && start < end)) {
      diagnostics.push({
        code: "HAUNCH_INVALID_STATION_RANGE",
        mainGirderKey: key,
        blocking: true,
        message: `${girderDisplayName(key)}: 測点範囲が不正です（0 ≤ 始点 < 終点）。`,
        remediation: "始点・終点測点を見直してください。",
      });
      continue;
    }
    if (end > context.bridgeLength) {
      diagnostics.push({
        code: "HAUNCH_OUTSIDE_BRIDGE_LENGTH",
        mainGirderKey: key,
        blocking: true,
        message: `${girderDisplayName(key)}: 終点測点が構造モデル長を超えています。`,
        remediation: `終点を ${context.bridgeLength} m 以下にしてください。`,
      });
      continue;
    }

    const shapeType = item.shapeType!;
    const topWidth = item.topWidth!;
    const height = item.height!;
    let bottomWidth = item.bottomWidth;

    if (!(topWidth > 0 && height > 0 && Number.isFinite(topWidth) && Number.isFinite(height))) {
      diagnostics.push({
        code: "HAUNCH_INVALID_DIMENSION",
        mainGirderKey: key,
        blocking: true,
        message: `${girderDisplayName(key)}: ハンチ寸法が不正です。`,
        remediation: "正の有限値を入力してください。",
      });
      continue;
    }

    if (shapeType === "RECT") {
      if (bottomWidth === null) {
        bottomWidth = topWidth;
      } else if (Math.abs(bottomWidth - topWidth) > 1e-12) {
        diagnostics.push({
          code: "HAUNCH_INVALID_RECT",
          mainGirderKey: key,
          blocking: true,
          message: `${girderDisplayName(key)}: 矩形では上幅と下幅を一致させてください。`,
          remediation: "下幅を上幅と同じにするか、TRAPEZOID を選択してください。",
        });
        continue;
      }
    } else {
      if (bottomWidth === null || !(bottomWidth > 0) || !Number.isFinite(bottomWidth)) {
        diagnostics.push({
          code: "HAUNCH_INVALID_TRAPEZOID",
          mainGirderKey: key,
          blocking: true,
          message: `${girderDisplayName(key)}: 台形では下幅 > 0 が必要です。`,
          remediation: "下幅を正の値で入力してください。",
        });
        continue;
      }
    }

    if (item.materialRef !== null && item.materialRef.trim() === "") {
      diagnostics.push({
        code: "HAUNCH_INVALID_MATERIAL_REF",
        mainGirderKey: key,
        blocking: true,
        message: `${girderDisplayName(key)}: 材料参照に空文字は使えません。`,
        remediation: "材料参照を削除するか非空の識別子を入力してください。",
      });
      continue;
    }

    models.push({
      haunchId: item.haunchId,
      mainGirderKey: key,
      mainGirderRefId: resolveMainGirderRefId(context.projectScopeId, key),
      startStation: start,
      endStation: end,
      shapeType,
      topWidth,
      bottomWidth: bottomWidth!,
      height,
      materialRef: item.materialRef,
      status: "UNVERIFIED_DEVELOPMENT_ONLY",
      designAuthorization: "NOT_AUTHORIZED",
      provenance: {
        source: "user_input",
        generatedBy: "buildRcDeckHaunchModels",
        datum: "top_flange_upper_face_to_deck_soffit",
      },
    });
  }

  // Dangling refs: entries that do not map to current girder count.
  if (context.girderCount !== null && context.girderCount >= 1) {
    const expected = new Set(expectedKeys);
    for (const girder of configuration.girders) {
      if (!expected.has(girder.mainGirderKey)) {
        diagnostics.push({
          code: "HAUNCH_DANGLING_GIRDER_REF",
          mainGirderKey: girder.mainGirderKey,
          blocking: true,
          message: `主桁参照 ${girder.mainGirderKey} は現行の主桁本数に存在しません。`,
          remediation: "主桁本数変更後はハンチを再設定してください（自動 remap はしません）。",
        });
      }
    }
    if (configuration.girders.length > 0 && configuration.girders.length !== context.girderCount) {
      const hasDangling = configuration.girders.some((g) => !expected.has(g.mainGirderKey));
      const hasMissing = expectedKeys.some((k) => !byKey.has(k));
      if (hasDangling || hasMissing) {
        diagnostics.push({
          code: "HAUNCH_GIRDER_COUNT_MISMATCH",
          mainGirderKey: null,
          blocking: hasDangling,
          message: "ハンチ設定の主桁数が現行の主桁本数と一致しません。",
          remediation: "「全主桁に適用」または各主桁の有無を再設定してください。",
        });
      }
    }
  }

  const blockingDiagnostics = diagnostics.filter((d) => d.blocking);
  const complete =
    allPresenceDecided &&
    blockingDiagnostics.length === 0 &&
    expectedKeys.length > 0 &&
    expectedKeys.every((key) => {
      const girder = byKey.get(key);
      if (!girder || girder.presence === PRESENCE_STATUS.NOT_PROVIDED) return false;
      if (girder.presence === PRESENCE_STATUS.EXPLICIT_NONE) return true;
      return girder.item !== null && itemIsFullySpecified(girder.item);
    });

  return {
    diagnostics,
    blockingDiagnostics,
    allPresenceDecided,
    complete,
    models,
  };
}

export function buildRcDeckHaunchModels(
  configuration: ApolloHaunchConfigurationDraft,
  context: HaunchValidationContext,
): HaunchValidationResult {
  return validateRcDeckHaunchConfiguration(configuration, context);
}

export function withHaunchGirderPresence(
  configuration: ApolloHaunchConfigurationDraft,
  mainGirderKey: string,
  presence: ApolloHaunchGirderDraft["presence"],
  projectScopeId: string,
): ApolloHaunchConfigurationDraft {
  const existing = configuration.girders.find((g) => g.mainGirderKey === mainGirderKey);
  const others = configuration.girders.filter((g) => g.mainGirderKey !== mainGirderKey);
  if (presence === PRESENCE_STATUS.NOT_PROVIDED) {
    return { girders: [...others, { mainGirderKey, presence, item: null }] };
  }
  if (presence === PRESENCE_STATUS.EXPLICIT_NONE) {
    return { girders: [...others, { mainGirderKey, presence, item: null }] };
  }
  const id = existing?.item?.haunchId ?? stableHaunchId(projectScopeId, mainGirderKey);
  return {
    girders: [
      ...others,
      {
        mainGirderKey,
        presence,
        item: existing?.item ?? createEmptyHaunchItemDraft(id),
      },
    ],
  };
}

export function withHaunchGirderItem(
  configuration: ApolloHaunchConfigurationDraft,
  mainGirderKey: string,
  item: ApolloHaunchItemDraft,
): ApolloHaunchConfigurationDraft {
  const others = configuration.girders.filter((g) => g.mainGirderKey !== mainGirderKey);
  return {
    girders: [...others, { mainGirderKey, presence: PRESENCE_STATUS.PROVIDED, item }],
  };
}

/** Explicit user action: mark every current main girder as EXPLICIT_NONE. */
export function applyHaunchExplicitNoneAll(
  girderCount: number,
): ApolloHaunchConfigurationDraft {
  return {
    girders: expectedGirderKeys(girderCount).map((mainGirderKey) => ({
      mainGirderKey,
      presence: PRESENCE_STATUS.EXPLICIT_NONE,
      item: null,
    })),
  };
}

/** Explicit user action: apply the same PROVIDED template to all girders. */
export function applyHaunchToAllGirders(
  girderCount: number,
  projectScopeId: string,
  template: Omit<ApolloHaunchItemDraft, "haunchId">,
): ApolloHaunchConfigurationDraft {
  return {
    girders: expectedGirderKeys(girderCount).map((mainGirderKey) => ({
      mainGirderKey,
      presence: PRESENCE_STATUS.PROVIDED,
      item: {
        ...template,
        haunchId: stableHaunchId(projectScopeId, mainGirderKey),
      },
    })),
  };
}

export function setHaunchFullLength(
  item: ApolloHaunchItemDraft,
  bridgeLength: number,
): ApolloHaunchItemDraft {
  return {
    ...item,
    startStation: 0,
    endStation: bridgeLength,
  };
}

export function resetHaunchConfiguration(): ApolloHaunchConfigurationDraft {
  return createDefaultHaunchConfiguration();
}
