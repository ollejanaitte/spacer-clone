import { openProjectFile } from "../../../desktop/projectFileDialog";
import type { Project } from "../../project/schema";
import { parseProject } from "../../project/projectDataCore";
import { inspectProjectPackage, type IntegrityReport } from "./projectPackageInspector";
import { hasUnsafePathInPackage } from "./packagePathSafety";
import { PROJECT_JSON_ENTRY, type SpacerProjPackage } from "./projectPackage";

export type ImportStep = "select" | "inspect" | "ready" | "imported";

export interface ImportedPackage {
  readonly pkg: SpacerProjPackage;
  readonly project: Project;
  readonly report: IntegrityReport;
}

export type InspectFileResult =
  | { ok: true; report: IntegrityReport; pkg: SpacerProjPackage }
  | { ok: false; reason: string; report?: IntegrityReport };

export async function selectAndInspectPackage(availableBytes?: number): Promise<InspectFileResult> {
  const opened = await openProjectFile();
  if (opened.canceled) {
    return { ok: false, reason: "canceled" };
  }
  return inspectPackageContent(opened.fileName, opened.content, availableBytes);
}

export function inspectPackageContent(
  fileName: string,
  rawJson: string,
  availableBytes?: number,
): InspectFileResult {
  const result = inspectProjectPackage({ fileName, rawJson, availableBytes });
  if (!result.ok) {
    return { ok: false, reason: result.reason, report: result.report };
  }
  if (hasUnsafePathInPackage(result.pkg)) {
    const unsafeReport: IntegrityReport = {
      ...result.report,
      fileIntegrity: "ng",
      verdict: "not-loadable",
      reasons: [...result.report.reasons, "unsafe-path-in-package"],
    };
    return { ok: false, reason: "unsafe-path-in-package", report: unsafeReport };
  }
  return { ok: true, report: result.report, pkg: result.pkg };
}

export function extractProjectFromPackage(pkg: SpacerProjPackage): Project | undefined {
  const projectJsonEntry = pkg.files.find((f) => f.path === PROJECT_JSON_ENTRY);
  if (!projectJsonEntry) return undefined;
  try {
    const raw = JSON.parse(projectJsonEntry.content);
    const parsed = parseProject(raw);
    return parsed.ok ? parsed.project : undefined;
  } catch {
    return undefined;
  }
}
