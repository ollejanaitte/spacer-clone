/** WF-03 appurtenance builders, parsers, and validation (Step 4-B). */

import { stableEntitySeed, stableUuidFromSeed } from "./stableIds";
import {
  APPURTENANCE_CROSS_SECTION_SHAPES,
  APPURTENANCE_SLOT_LABELS,
  APPURTENANCE_SLOT_TYPE_SIDE,
  APPURTENANCE_SLOTS,
  type ApolloAppurtenanceConfigurationDraft,
  type ApolloAppurtenanceItemDraft,
  type ApolloAppurtenanceSlotDraft,
  type AppurtenanceCrossSectionShape,
  type AppurtenanceDiagnostic,
  type AppurtenanceSlot,
  type BridgeAppurtenanceModel,
} from "./appurtenanceTypes";
import { PRESENCE_STATUS, isPresenceStatus, validatePresenceConsistency } from "./presence";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createEmptyAppurtenanceItemDraft(appurtenanceId: string): ApolloAppurtenanceItemDraft {
  return {
    appurtenanceId,
    startStation: null,
    endStation: null,
    transverseOffset: null,
    crossSectionShape: null,
    width: null,
    height: null,
    materialRef: null,
    unitWeight: null,
  };
}

export function createDefaultAppurtenanceConfiguration(): ApolloAppurtenanceConfigurationDraft {
  return {
    slots: APPURTENANCE_SLOTS.map((slot) => ({
      slot,
      presence: PRESENCE_STATUS.NOT_PROVIDED,
      item: null,
    })),
  };
}

export function stableAppurtenanceId(projectScopeId: string, slot: AppurtenanceSlot): string {
  return stableUuidFromSeed(stableEntitySeed(projectScopeId, "BridgeAppurtenance", slot));
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

function parseCrossSectionShape(value: unknown): AppurtenanceCrossSectionShape | null | undefined {
  if (value === null || value === undefined) return null;
  if (
    typeof value === "string" &&
    (APPURTENANCE_CROSS_SECTION_SHAPES as readonly string[]).includes(value)
  ) {
    return value as AppurtenanceCrossSectionShape;
  }
  return undefined;
}

function parseAppurtenanceItem(raw: unknown): ApolloAppurtenanceItemDraft | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.appurtenanceId !== "string" || raw.appurtenanceId.length === 0) return null;
  const startStation = parseFiniteNumberOrNull(raw.startStation);
  const endStation = parseFiniteNumberOrNull(raw.endStation);
  const transverseOffset = parseFiniteNumberOrNull(raw.transverseOffset);
  const width = parseFiniteNumberOrNull(raw.width);
  const height = parseFiniteNumberOrNull(raw.height);
  const unitWeight = parseFiniteNumberOrNull(raw.unitWeight);
  const materialRef = parseOptionalString(raw.materialRef);
  const crossSectionShape = parseCrossSectionShape(raw.crossSectionShape);
  if (
    startStation === undefined ||
    endStation === undefined ||
    transverseOffset === undefined ||
    width === undefined ||
    height === undefined ||
    unitWeight === undefined ||
    materialRef === undefined ||
    crossSectionShape === undefined
  ) {
    return null;
  }
  if (materialRef !== null && materialRef.trim() === "") return null;
  return {
    appurtenanceId: raw.appurtenanceId,
    startStation,
    endStation,
    transverseOffset,
    crossSectionShape,
    width,
    height,
    materialRef,
    unitWeight,
  };
}

export function parseAppurtenanceConfiguration(
  raw: unknown,
): ApolloAppurtenanceConfigurationDraft | null {
  if (raw === undefined || raw === null) {
    return createDefaultAppurtenanceConfiguration();
  }
  if (!isRecord(raw) || !Array.isArray(raw.slots)) {
    return null;
  }
  const bySlot = new Map<AppurtenanceSlot, ApolloAppurtenanceSlotDraft>();
  for (const [index, entry] of raw.slots.entries()) {
    if (!isRecord(entry)) return null;
    const slot = entry.slot;
    if (typeof slot !== "string" || !(APPURTENANCE_SLOTS as readonly string[]).includes(slot)) {
      return null;
    }
    if (!isPresenceStatus(entry.presence)) return null;
    const itemRaw = entry.item;
    let item: ApolloAppurtenanceItemDraft | null = null;
    if (itemRaw !== null && itemRaw !== undefined) {
      item = parseAppurtenanceItem(itemRaw);
      if (item === null) return null;
    }
    if (bySlot.has(slot as AppurtenanceSlot)) return null;
    bySlot.set(slot as AppurtenanceSlot, {
      slot: slot as AppurtenanceSlot,
      presence: entry.presence,
      item,
    });
    void index;
  }
  const slots: ApolloAppurtenanceSlotDraft[] = APPURTENANCE_SLOTS.map((slot) => {
    const existing = bySlot.get(slot);
    if (existing) return existing;
    return { slot, presence: PRESENCE_STATUS.NOT_PROVIDED, item: null };
  });
  return { slots };
}

export function validateAppurtenanceConfigurationPersistence(raw: unknown): readonly string[] {
  if (raw === undefined || raw === null) return [];
  if (!isRecord(raw)) return ["apolloBridgeStructureInput.appurtenanceConfiguration must be an object."];
  if (!Array.isArray(raw.slots)) {
    return ["apolloBridgeStructureInput.appurtenanceConfiguration.slots must be an array."];
  }
  const diagnostics: string[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of raw.slots.entries()) {
    const path = `apolloBridgeStructureInput.appurtenanceConfiguration.slots[${index}]`;
    if (!isRecord(entry)) {
      diagnostics.push(`${path} must be an object.`);
      continue;
    }
    if (typeof entry.slot !== "string" || !(APPURTENANCE_SLOTS as readonly string[]).includes(entry.slot)) {
      diagnostics.push(`${path}.slot must be a known AppurtenanceSlot.`);
    } else if (seen.has(entry.slot)) {
      diagnostics.push(`${path}.slot duplicates ${entry.slot}.`);
    } else {
      seen.add(entry.slot);
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

export type AppurtenanceValidationContext = {
  readonly bridgeLength: number | null;
  readonly width: number | null;
  readonly projectScopeId: string;
};

export type AppurtenanceValidationResult = {
  readonly diagnostics: readonly AppurtenanceDiagnostic[];
  readonly blockingDiagnostics: readonly AppurtenanceDiagnostic[];
  readonly allPresenceDecided: boolean;
  readonly complete: boolean;
  readonly models: readonly BridgeAppurtenanceModel[];
};

function itemHasPayload(item: ApolloAppurtenanceItemDraft | null): boolean {
  return item !== null;
}

function itemIsFullySpecified(item: ApolloAppurtenanceItemDraft): boolean {
  return (
    item.startStation !== null &&
    item.endStation !== null &&
    item.transverseOffset !== null &&
    item.crossSectionShape !== null &&
    item.width !== null &&
    item.height !== null
  );
}

export function validateBridgeAppurtenanceConfiguration(
  configuration: ApolloAppurtenanceConfigurationDraft,
  context: AppurtenanceValidationContext,
): AppurtenanceValidationResult {
  const diagnostics: AppurtenanceDiagnostic[] = [];
  const models: BridgeAppurtenanceModel[] = [];
  const ids = new Set<string>();
  let allPresenceDecided = true;

  for (const slotDraft of configuration.slots) {
    const label = APPURTENANCE_SLOT_LABELS[slotDraft.slot];
    const presenceCheck = validatePresenceConsistency(
      slotDraft.presence,
      itemHasPayload(slotDraft.item),
      label,
    );
    if (!presenceCheck.ok && presenceCheck.code && presenceCheck.message) {
      const code =
        presenceCheck.code === "PRESENCE_PROVIDED_WITHOUT_ITEM"
          ? "APPURTENANCE_PROVIDED_WITHOUT_ITEM"
          : presenceCheck.code === "PRESENCE_EXPLICIT_NONE_WITH_ITEM"
            ? "APPURTENANCE_EXPLICIT_NONE_WITH_ITEM"
            : "APPURTENANCE_PROVIDED_WITHOUT_ITEM";
      diagnostics.push({
        code,
        slot: slotDraft.slot,
        blocking: true,
        message: presenceCheck.message,
        remediation: "スロットの有無と項目内容を一致させてください。",
      });
      continue;
    }

    if (slotDraft.presence === PRESENCE_STATUS.NOT_PROVIDED) {
      allPresenceDecided = false;
      diagnostics.push({
        code: "APPURTENANCE_PRESENCE_NOT_PROVIDED",
        slot: slotDraft.slot,
        blocking: false,
        message: `${label}の有無が未入力です。`,
        remediation: `「あり」「なし」のいずれかを選択してください。`,
      });
      continue;
    }

    if (slotDraft.presence === PRESENCE_STATUS.EXPLICIT_NONE) {
      continue;
    }

    const item = slotDraft.item;
    if (!item) continue;

    if (ids.has(item.appurtenanceId)) {
      diagnostics.push({
        code: "APPURTENANCE_DUPLICATE_ID",
        slot: slotDraft.slot,
        blocking: true,
        message: `${label}: 付属物 ID が重複しています。`,
        remediation: "プロジェクトを再保存するか、当該スロットを一度未入力に戻して再設定してください。",
      });
      continue;
    }
    ids.add(item.appurtenanceId);

    const expected = APPURTENANCE_SLOT_TYPE_SIDE[slotDraft.slot];
    void expected;

    if (!itemIsFullySpecified(item)) {
      allPresenceDecided = false;
      diagnostics.push({
        code: "APPURTENANCE_SLOT_INCOMPLETE",
        slot: slotDraft.slot,
        blocking: false,
        message: `${label}: 寸法・測点が不足しています。`,
        remediation: "始終点測点、横断オフセット、幅・高さを入力してください。",
      });
      continue;
    }

    if (context.bridgeLength === null) {
      diagnostics.push({
        code: "APPURTENANCE_MISSING_BRIDGE_LENGTH",
        slot: slotDraft.slot,
        blocking: true,
        message: `${label}: 構造モデル長が未入力のため測点を検証できません。`,
        remediation: "WF-02 で構造モデル長を入力してください。",
      });
      continue;
    }

    const start = item.startStation!;
    const end = item.endStation!;
    if (!(start >= 0 && start < end)) {
      diagnostics.push({
        code: "APPURTENANCE_INVALID_STATION_RANGE",
        slot: slotDraft.slot,
        blocking: true,
        message: `${label}: 測点範囲が不正です（0 ≤ 始点 < 終点）。`,
        remediation: "始点・終点測点を見直してください。",
      });
      continue;
    }
    if (end > context.bridgeLength) {
      diagnostics.push({
        code: "APPURTENANCE_OUTSIDE_BRIDGE_LENGTH",
        slot: slotDraft.slot,
        blocking: true,
        message: `${label}: 終点測点が構造モデル長を超えています。`,
        remediation: `終点を ${context.bridgeLength} m 以下にしてください。`,
      });
      continue;
    }

    const offset = item.transverseOffset!;
    if (!Number.isFinite(offset)) {
      diagnostics.push({
        code: "APPURTENANCE_INVALID_OFFSET",
        slot: slotDraft.slot,
        blocking: true,
        message: `${label}: 横断オフセットが不正です。`,
        remediation: "有限の数値を入力してください（橋梁ローカル座標系、+Y＝右）。",
      });
      continue;
    }

    diagnostics.push({
      code: "APPURTENANCE_LOCAL_CRS_WARNING",
      slot: slotDraft.slot,
      blocking: false,
      message: `${label}: 横断オフセットは橋梁ローカル座標系（+Y＝右）です。道路線形の接続は将来工程待ちです。`,
      remediation: "橋梁ローカル座標系のまま入力を続けてください。",
    });

    if (context.width === null) {
      diagnostics.push({
        code: "APPURTENANCE_MISSING_DECK_WIDTH",
        slot: slotDraft.slot,
        blocking: true,
        message: `${label}: 幅員が未入力のため横断位置を検証できません。`,
        remediation: "WF-02 で幅員を入力してください。",
      });
      continue;
    }

    const halfWidth = context.width / 2;
    if (Math.abs(offset) > halfWidth + 1e-9) {
      diagnostics.push({
        code: "APPURTENANCE_OUTSIDE_DECK_WIDTH",
        slot: slotDraft.slot,
        blocking: true,
        message: `${label}: 横断オフセットが床版幅の半分を超えています。`,
        remediation: `オフセットを ±${halfWidth} m の範囲にしてください。`,
      });
      continue;
    }

    const width = item.width!;
    const height = item.height!;
    if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) {
      diagnostics.push({
        code: "APPURTENANCE_INVALID_CROSS_SECTION",
        slot: slotDraft.slot,
        blocking: true,
        message: `${label}: 断面寸法が不正です（幅・高さ > 0）。`,
        remediation: "正の有限値を入力してください。",
      });
      continue;
    }

    if (item.unitWeight !== null && (!(item.unitWeight >= 0) || !Number.isFinite(item.unitWeight))) {
      diagnostics.push({
        code: "APPURTENANCE_INVALID_UNIT_WEIGHT",
        slot: slotDraft.slot,
        blocking: true,
        message: `${label}: 単位重量は null または 0 以上の有限値です。`,
        remediation: "単位重量を修正するか空にしてください。",
      });
      continue;
    }

    if (item.materialRef !== null && item.materialRef.trim() === "") {
      diagnostics.push({
        code: "APPURTENANCE_INVALID_MATERIAL_REF",
        slot: slotDraft.slot,
        blocking: true,
        message: `${label}: 材料参照に空文字は使えません。`,
        remediation: "材料参照を削除するか非空の識別子を入力してください。",
      });
      continue;
    }

    models.push({
      appurtenanceId: item.appurtenanceId,
      slot: slotDraft.slot,
      type: expected.type,
      side: expected.side,
      startStation: start,
      endStation: end,
      transverseOffset: offset,
      crossSection: {
        shape: item.crossSectionShape!,
        width,
        height,
      },
      materialRef: item.materialRef,
      unitWeight: item.unitWeight,
      unitWeightStatus:
        item.unitWeight === null ? "NOT_PROVIDED" : "USER_PROVIDED_UNVERIFIED",
      status: "UNVERIFIED_DEVELOPMENT_ONLY",
      designAuthorization: "NOT_AUTHORIZED",
      provenance: {
        source: "user_input",
        generatedBy: "buildBridgeAppurtenanceModels",
      },
    });
  }

  const blockingDiagnostics = diagnostics.filter((d) => d.blocking);
  const complete =
    allPresenceDecided &&
    blockingDiagnostics.length === 0 &&
    configuration.slots.every((slot) => slot.presence !== PRESENCE_STATUS.NOT_PROVIDED) &&
    configuration.slots.every((slot) => {
      if (slot.presence !== PRESENCE_STATUS.PROVIDED) return true;
      return slot.item !== null && itemIsFullySpecified(slot.item);
    });

  return {
    diagnostics,
    blockingDiagnostics,
    allPresenceDecided,
    complete,
    models,
  };
}

export function buildBridgeAppurtenanceModels(
  configuration: ApolloAppurtenanceConfigurationDraft,
  context: AppurtenanceValidationContext,
): AppurtenanceValidationResult {
  return validateBridgeAppurtenanceConfiguration(configuration, context);
}

export function withAppurtenanceSlotPresence(
  configuration: ApolloAppurtenanceConfigurationDraft,
  slot: AppurtenanceSlot,
  presence: ApolloAppurtenanceSlotDraft["presence"],
  projectScopeId: string,
): ApolloAppurtenanceConfigurationDraft {
  return {
    slots: configuration.slots.map((entry) => {
      if (entry.slot !== slot) return entry;
      if (presence === PRESENCE_STATUS.NOT_PROVIDED) {
        return { slot, presence, item: null };
      }
      if (presence === PRESENCE_STATUS.EXPLICIT_NONE) {
        return { slot, presence, item: null };
      }
      const id = entry.item?.appurtenanceId ?? stableAppurtenanceId(projectScopeId, slot);
      return {
        slot,
        presence,
        item: entry.item ?? createEmptyAppurtenanceItemDraft(id),
      };
    }),
  };
}

export function withAppurtenanceSlotItem(
  configuration: ApolloAppurtenanceConfigurationDraft,
  slot: AppurtenanceSlot,
  item: ApolloAppurtenanceItemDraft,
): ApolloAppurtenanceConfigurationDraft {
  return {
    slots: configuration.slots.map((entry) =>
      entry.slot === slot
        ? { slot, presence: PRESENCE_STATUS.PROVIDED, item }
        : entry,
    ),
  };
}

export function setAppurtenanceFullLength(
  item: ApolloAppurtenanceItemDraft,
  bridgeLength: number,
): ApolloAppurtenanceItemDraft {
  return {
    ...item,
    startStation: 0,
    endStation: bridgeLength,
  };
}
