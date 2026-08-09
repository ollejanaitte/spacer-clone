import { generateUuid, isValidUuid, type UuidString } from "../../contracts/uuid";

export const BUSINESS_LIST_STORAGE_KEY = "spacer.designPlatform.businessList.v1";

export const DESIGN_STAGES = [
  "road_design",
  "superstructure",
  "substructure",
  "analysis",
  "complete",
] as const;

export type DesignStage = (typeof DESIGN_STAGES)[number];

export function isDesignStage(value: string): value is DesignStage {
  return (DESIGN_STAGES as readonly string[]).includes(value);
}

export interface BusinessSummary {
  readonly businessId: UuidString;
  readonly projectNumber: string;
  readonly projectName: string;
  readonly designStage: DesignStage;
  readonly updatedAt: string;
}

export interface NewBusinessInput {
  readonly projectNumber: string;
  readonly projectName: string;
  readonly designStage: DesignStage;
}

export interface BusinessRegistryPort {
  list(): readonly BusinessSummary[];
  create(input: NewBusinessInput): BusinessSummary;
  find(businessId: string): BusinessSummary | undefined;
  touch(businessId: string): void;
}

function nowIso(): string {
  return new Date().toISOString();
}

export type RegistryClock = () => string;

function normalizeProjectNumber(value: string): string {
  return value.trim();
}

export function createDefaultBusinessSummary(businessId: UuidString): BusinessSummary {
  return {
    businessId,
    projectNumber: "",
    projectName: "",
    designStage: "road_design",
    updatedAt: nowIso(),
  };
}

export function createInMemoryBusinessRegistry(
  initial: readonly BusinessSummary[] = [],
  clock: RegistryClock = nowIso,
): BusinessRegistryPort {
  const entries = new Map<string, BusinessSummary>(
    initial.map((entry) => [entry.businessId, entry]),
  );

  return {
    list(): readonly BusinessSummary[] {
      return Array.from(entries.values()).sort((a, b) =>
        a.updatedAt < b.updatedAt
          ? 1
          : a.updatedAt > b.updatedAt
            ? -1
            : a.businessId < b.businessId
              ? 1
              : -1,
      );
    },
    create(input: NewBusinessInput): BusinessSummary {
      const businessId = generateUuid();
      const summary: BusinessSummary = {
        businessId,
        projectNumber: normalizeProjectNumber(input.projectNumber),
        projectName: input.projectName.trim(),
        designStage: input.designStage,
        updatedAt: clock(),
      };
      entries.set(businessId, summary);
      return summary;
    },
    find(businessId: string): BusinessSummary | undefined {
      return entries.get(businessId);
    },
    touch(businessId: string): void {
      const entry = entries.get(businessId);
      if (entry !== undefined) {
        entries.set(businessId, { ...entry, updatedAt: clock() });
      }
    },
  };
}

export function parseBusinessList(raw: string): readonly BusinessSummary[] {
  if (raw.trim().length === 0) {
    return [];
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isBusinessSummary);
}

export function serializeBusinessList(list: readonly BusinessSummary[]): string {
  return JSON.stringify(list, null, 2);
}

function isBusinessSummary(value: unknown): value is BusinessSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.businessId === "string" &&
    isValidUuid(record.businessId) &&
    typeof record.projectNumber === "string" &&
    typeof record.projectName === "string" &&
    typeof record.designStage === "string" &&
    isDesignStage(record.designStage) &&
    typeof record.updatedAt === "string"
  );
}

export function createLocalStorageBusinessRegistry(
  storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage,
): BusinessRegistryPort {
  const load = (): readonly BusinessSummary[] => {
    try {
      const raw = storage.getItem(BUSINESS_LIST_STORAGE_KEY);
      return raw === null ? [] : parseBusinessList(raw);
    } catch {
      return [];
    }
  };

  const persist = (list: readonly BusinessSummary[]): void => {
    storage.setItem(BUSINESS_LIST_STORAGE_KEY, serializeBusinessList(list));
  };

  const registry = createInMemoryBusinessRegistry(load());

  return {
    list(): readonly BusinessSummary[] {
      return registry.list();
    },
    create(input: NewBusinessInput): BusinessSummary {
      const summary = registry.create(input);
      persist(registry.list());
      return summary;
    },
    find(businessId: string): BusinessSummary | undefined {
      return registry.find(businessId);
    },
    touch(businessId: string): void {
      registry.touch(businessId);
      persist(registry.list());
    },
  };
}
