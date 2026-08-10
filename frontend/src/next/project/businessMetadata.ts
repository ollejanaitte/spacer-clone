import type { Project } from "./schema";

export const PROJECT_DESIGN_STAGES = [
  "road-preliminary",
  "road-detailed",
  "bridge-preliminary",
  "bridge-detailed",
  "other",
] as const;

export type ProjectDesignStage = (typeof PROJECT_DESIGN_STAGES)[number];

export const PROJECT_DESIGN_STAGE_LABELS: Readonly<Record<ProjectDesignStage, string>> = {
  "road-preliminary": "道路予備設計",
  "road-detailed": "道路詳細設計",
  "bridge-preliminary": "橋梁予備設計",
  "bridge-detailed": "橋梁詳細設計",
  other: "その他",
};

export function isProjectDesignStage(value: unknown): value is ProjectDesignStage {
  return typeof value === "string" && (PROJECT_DESIGN_STAGES as readonly string[]).includes(value);
}

export const BUSINESS_NUMBER_KEY = "businessNumber";
export const DESIGN_STAGE_KEY = "designStage";
export const DESIGN_STAGE_CUSTOM_LABEL_KEY = "designStageCustomLabel";

export function getBusinessNumber(project: Project): string {
  const value = project.metadata[BUSINESS_NUMBER_KEY];
  return typeof value === "string" ? value : "";
}

export function getDesignStage(project: Project): {
  id: ProjectDesignStage;
  customLabel: string | null;
} {
  const raw = project.metadata[DESIGN_STAGE_KEY];
  const id = isProjectDesignStage(raw) ? raw : "other";
  if (id !== "other") {
    return { id, customLabel: null };
  }
  const custom = project.metadata[DESIGN_STAGE_CUSTOM_LABEL_KEY];
  return { id, customLabel: typeof custom === "string" && custom.length > 0 ? custom : null };
}

export function designStageDisplayName(project: Project): string {
  const { id, customLabel } = getDesignStage(project);
  if (id === "other" && customLabel !== null) {
    return customLabel;
  }
  return PROJECT_DESIGN_STAGE_LABELS[id];
}

export interface BusinessMetadataInput {
  businessNumber: string;
  designStage: ProjectDesignStage;
  designStageCustomLabel?: string | null;
}

export function applyBusinessMetadata(project: Project, input: BusinessMetadataInput): Project {
  const customLabel =
    input.designStage === "other" && input.designStageCustomLabel !== undefined &&
    input.designStageCustomLabel !== null
      ? input.designStageCustomLabel
      : undefined;
  return {
    ...project,
    metadata: {
      ...project.metadata,
      [BUSINESS_NUMBER_KEY]: input.businessNumber,
      [DESIGN_STAGE_KEY]: input.designStage,
      ...(customLabel !== undefined ? { [DESIGN_STAGE_CUSTOM_LABEL_KEY]: customLabel } : {}),
    },
  };
}
