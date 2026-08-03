/** Pavement / road-marking draft helpers (Step 5-3 P3). */

import { PRESENCE_STATUS, validatePresenceConsistency, type PresenceStatus, isPresenceStatus } from "./presence";
import {
  DEFAULT_PAVEMENT_UNIT_WEIGHT_KN_M3,
  ROAD_MARKING_DASH_PATTERNS,
  ROAD_MARKING_KINDS,
  type ApolloPavementConfigurationDraft,
  type ApolloPavementItemDraft,
  type ApolloRoadMarkingDraft,
  type ApolloRoadMarkingsConfigurationDraft,
  type PavementDiagnostic,
  type RoadMarkingDashPattern,
  type RoadMarkingKind,
} from "./pavementTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createDefaultPavementConfiguration(): ApolloPavementConfigurationDraft {
  return { presence: PRESENCE_STATUS.NOT_PROVIDED, item: null };
}

export function createDefaultRoadMarkingsConfiguration(): ApolloRoadMarkingsConfigurationDraft {
  return {
    enabled: false,
    markings: [
      {
        markingId: "marking-center",
        kind: "CENTER_LINE",
        enabled: true,
        width: 0.15,
        offsetFromCenter: 0,
        dashPattern: "DASHED",
      },
      {
        markingId: "marking-edge-left",
        kind: "EDGE_LINE_LEFT",
        enabled: true,
        width: 0.15,
        offsetFromCenter: null,
        dashPattern: "SOLID",
      },
      {
        markingId: "marking-edge-right",
        kind: "EDGE_LINE_RIGHT",
        enabled: true,
        width: 0.15,
        offsetFromCenter: null,
        dashPattern: "SOLID",
      },
    ],
  };
}

export function createEmptyPavementItem(): ApolloPavementItemDraft {
  return {
    thickness: null,
    unitWeight: DEFAULT_PAVEMENT_UNIT_WEIGHT_KN_M3,
    startStation: null,
    endStation: null,
  };
}

export function parsePavementConfiguration(raw: unknown): ApolloPavementConfigurationDraft | null {
  if (raw === undefined || raw === null) {
    return createDefaultPavementConfiguration();
  }
  if (!isRecord(raw) || !isPresenceStatus(raw.presence)) {
    return null;
  }
  if (raw.item === null || raw.item === undefined) {
    return { presence: raw.presence, item: null };
  }
  if (!isRecord(raw.item)) return null;
  const thickness = raw.item.thickness;
  const unitWeight = raw.item.unitWeight;
  const startStation = raw.item.startStation;
  const endStation = raw.item.endStation;
  if (
    (thickness !== null && (typeof thickness !== "number" || !Number.isFinite(thickness))) ||
    (unitWeight !== null && (typeof unitWeight !== "number" || !Number.isFinite(unitWeight))) ||
    (startStation !== null && (typeof startStation !== "number" || !Number.isFinite(startStation))) ||
    (endStation !== null && (typeof endStation !== "number" || !Number.isFinite(endStation)))
  ) {
    return null;
  }
  return {
    presence: raw.presence,
    item: {
      thickness: thickness === undefined ? null : thickness,
      unitWeight: unitWeight === undefined ? null : unitWeight,
      startStation: startStation === undefined ? null : startStation,
      endStation: endStation === undefined ? null : endStation,
    },
  };
}

export function parseRoadMarkingsConfiguration(raw: unknown): ApolloRoadMarkingsConfigurationDraft | null {
  if (raw === undefined || raw === null) {
    return createDefaultRoadMarkingsConfiguration();
  }
  if (!isRecord(raw) || typeof raw.enabled !== "boolean") return null;
  if (raw.markings === undefined || raw.markings === null) {
    return { enabled: raw.enabled, markings: createDefaultRoadMarkingsConfiguration().markings };
  }
  if (!Array.isArray(raw.markings)) return null;
  const markings: ApolloRoadMarkingDraft[] = [];
  for (const entry of raw.markings) {
    if (!isRecord(entry)) return null;
    if (typeof entry.markingId !== "string") return null;
    if (!(ROAD_MARKING_KINDS as readonly string[]).includes(String(entry.kind))) return null;
    if (typeof entry.enabled !== "boolean") return null;
    if (!(ROAD_MARKING_DASH_PATTERNS as readonly string[]).includes(String(entry.dashPattern))) return null;
    const width = entry.width;
    const offset = entry.offsetFromCenter;
    if (width !== null && (typeof width !== "number" || !Number.isFinite(width))) return null;
    if (offset !== null && offset !== undefined && (typeof offset !== "number" || !Number.isFinite(offset))) {
      return null;
    }
    markings.push({
      markingId: entry.markingId,
      kind: entry.kind as RoadMarkingKind,
      enabled: entry.enabled,
      width: width === undefined ? null : width,
      offsetFromCenter: offset === undefined ? null : offset,
      dashPattern: entry.dashPattern as RoadMarkingDashPattern,
    });
  }
  return { enabled: raw.enabled, markings };
}

export function validatePavementConfigurationPersistence(raw: unknown): readonly string[] {
  if (raw === undefined || raw === null) return [];
  if (parsePavementConfiguration(raw) === null) {
    return ["apolloBridgeStructureInput.pavementConfiguration is invalid."];
  }
  return [];
}

export function validateRoadMarkingsConfigurationPersistence(raw: unknown): readonly string[] {
  if (raw === undefined || raw === null) return [];
  if (parseRoadMarkingsConfiguration(raw) === null) {
    return ["apolloBridgeStructureInput.roadMarkingsConfiguration is invalid."];
  }
  return [];
}

export function validatePavementConfiguration(
  configuration: ApolloPavementConfigurationDraft,
  bridgeLength: number | null,
): readonly PavementDiagnostic[] {
  const diagnostics: PavementDiagnostic[] = [];
  const consistency = validatePresenceConsistency(configuration.presence, configuration.item !== null, "舗装");
  if (!consistency.ok && consistency.message) {
    diagnostics.push({
      code: "PAVEMENT_PRESENCE_INCONSISTENT",
      blocking: true,
      message: consistency.message,
      remediation: "presence と item の整合を取ってください。",
    });
  }
  if (configuration.presence !== PRESENCE_STATUS.PROVIDED || !configuration.item) {
    return diagnostics;
  }
  const item = configuration.item;
  if (item.thickness === null || item.thickness <= 0) {
    diagnostics.push({
      code: "PAVEMENT_INVALID_THICKNESS",
      blocking: true,
      message: "舗装厚は正の値で入力してください。",
      remediation: "thickness > 0 を設定してください。",
    });
  }
  if (item.unitWeight !== null && item.unitWeight <= 0) {
    diagnostics.push({
      code: "PAVEMENT_INVALID_UNIT_WEIGHT",
      blocking: true,
      message: "舗装単位体積重量は正の値で入力してください。",
      remediation: "unitWeight > 0 を設定してください。",
    });
  }
  if (bridgeLength === null) {
    diagnostics.push({
      code: "PAVEMENT_MISSING_BRIDGE_LENGTH",
      blocking: true,
      message: "舗装範囲の検証には橋長が必要です。",
      remediation: "橋長を入力してください。",
    });
  } else {
    const start = item.startStation ?? 0;
    const end = item.endStation ?? bridgeLength;
    if (!(start >= 0 && end <= bridgeLength + 1e-9 && end > start)) {
      diagnostics.push({
        code: "PAVEMENT_INVALID_STATION_RANGE",
        blocking: true,
        message: "舗装の始終点駅が橋長範囲外です。",
        remediation: "0 ≤ start < end ≤ bridgeLength にしてください。",
      });
    }
  }
  return diagnostics;
}

export function withPavementPresence(
  configuration: ApolloPavementConfigurationDraft,
  presence: PresenceStatus,
): ApolloPavementConfigurationDraft {
  if (presence === PRESENCE_STATUS.PROVIDED) {
    return { presence, item: configuration.item ?? createEmptyPavementItem() };
  }
  return { presence, item: null };
}

export function withPavementItem(
  configuration: ApolloPavementConfigurationDraft,
  item: ApolloPavementItemDraft | null,
): ApolloPavementConfigurationDraft {
  return {
    presence: item ? PRESENCE_STATUS.PROVIDED : configuration.presence === PRESENCE_STATUS.PROVIDED
      ? PRESENCE_STATUS.NOT_PROVIDED
      : configuration.presence,
    item,
  };
}
