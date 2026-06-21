import type { ProjectModel } from "../../types";

export type Level0Template = {
  schemaVersion: string;
  level0_metadata: {
    templateId: string;
    presentationLabel: string;
    mode: string;
    createdBy: string;
    displayReference: { displacementCm: number };
  };
  project: ProjectModel;
  presentation: {
    nodes: Record<string, { kind: string; label_level0: string }>;
    members: Record<string, unknown>;
  };
  waveforms: Record<string, { dt: number; unit: string; values: number[] }>;
};

const TEMPLATE_CACHE = new Map<string, Level0Template>();

/**
 * テンプレートJSONを読み込む。
 * 同じテンプレートIDはキャッシュされる。
 */
export async function loadTemplate(templateId: string): Promise<Level0Template> {
  const cached = TEMPLATE_CACHE.get(templateId);
  if (cached) return cached;

  const response = await fetch(`/templates/${templateId}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load template: ${templateId}`);
  }
  const template = (await response.json()) as Level0Template;
  TEMPLATE_CACHE.set(templateId, template);
  return template;
}

/**
 * テンプレートからProjectModelを取得する。
 */
export async function loadTemplateProject(templateId: string): Promise<ProjectModel> {
  const template = await loadTemplate(templateId);
  return template.project;
}

/**
 * テンプレートの波形データを取得する。
 */
export async function loadTemplateWaveforms(
  templateId: string,
): Promise<Record<string, { dt: number; unit: string; values: number[] }>> {
  const template = await loadTemplate(templateId);
  return template.waveforms;
}

/**
 * キャッシュをクリアする（テスト用）。
 */
export function clearTemplateCache(): void {
  TEMPLATE_CACHE.clear();
}
