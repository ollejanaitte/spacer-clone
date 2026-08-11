import type { Project } from "../../project/schema";
import { buildProjectPackage, selfCheckPackage } from "./projectPackageBuilder";
import { saveSpacerProjFile } from "../../../desktop/projectFileDialog";
import { SPACER_PROJ_EXTENSION } from "./projectPackage";

export type ExportProjectResult =
  | { ok: true; filePath: string }
  | { ok: false; reason: "canceled" | "invalid-project" | "build-failed" | "save-failed" };

export function suggestedPackageFileName(project: Project): string {
  const safeName = project.name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
  return `${safeName}${SPACER_PROJ_EXTENSION}`;
}

export async function exportProjectToPackage(project: Project): Promise<ExportProjectResult> {
  const built = buildProjectPackage(project);
  if (!built.ok) {
    return { ok: false, reason: "build-failed" };
  }
  const selfCheck = selfCheckPackage(built.pkg);
  if (!selfCheck.ok) {
    return { ok: false, reason: "build-failed" };
  }
  const suggestedName = suggestedPackageFileName(project);
  const saveResult = await saveSpacerProjFile(built.json, suggestedName);
  if (saveResult.canceled) {
    return { ok: false, reason: "canceled" };
  }
  if (!saveResult.canceled && saveResult.filePath.length === 0) {
    return { ok: false, reason: "save-failed" };
  }
  return { ok: true, filePath: saveResult.filePath };
}
