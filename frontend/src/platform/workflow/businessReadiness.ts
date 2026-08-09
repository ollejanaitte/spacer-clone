import type { WorkspaceSection } from "../workspace/sections";

/**
 * Value-level status vocabulary aligned with BridgeProjectValueStatus.
 * The workspace binds existing statuses to the UI; it never fabricates or
 * auto-promotes INFERRED/MISSING to CONFIRMED.
 */
export const VALUE_STATUSES = [
  "CONFIRMED",
  "DERIVED",
  "INFERRED",
  "MISSING",
  "DEFERRED",
  "NOT_AUTHORIZED",
] as const;

export type ValueStatus = (typeof VALUE_STATUSES)[number];

export interface SectionStatusSummary {
  readonly section: WorkspaceSection;
  readonly status: ValueStatus;
}

export interface BusinessReadiness {
  readonly sections: readonly SectionStatusSummary[];
  readonly statusFor: (section: WorkspaceSection) => ValueStatus | null;
}

export interface SectionStatusSource {
  readonly sections: Readonly<Partial<Record<WorkspaceSection, ValueStatus>>>;
}

export function isValueStatus(value: string): value is ValueStatus {
  return (VALUE_STATUSES as readonly string[]).includes(value);
}

const WORKSPACE_SECTIONS: readonly WorkspaceSection[] = [
  "overview",
  "road",
  "superstructure",
  "substructure",
  "analysis",
  "main3d",
  "deliverables",
  "data",
];

/**
 * Maps a BusinessProject status.sections record to a workspace-ready summary.
 * Missing sections surface as MISSING (never silently CONFIRMED).
 */
export function bindBusinessReadiness(
  source: SectionStatusSource,
): BusinessReadiness {
  const sections: readonly SectionStatusSummary[] = WORKSPACE_SECTIONS.map((section) => {
    const value = source.sections[section];
    const status = value !== undefined && isValueStatus(value) ? value : "MISSING";
    return { section, status };
  });

  const bySection = new Map<WorkspaceSection, ValueStatus>(
    sections.map((entry) => [entry.section, entry.status]),
  );

  return {
    sections,
    statusFor(section: WorkspaceSection): ValueStatus | null {
      return bySection.get(section) ?? null;
    },
  };
}

export function isAuthoritative(status: ValueStatus): boolean {
  return status === "CONFIRMED";
}
