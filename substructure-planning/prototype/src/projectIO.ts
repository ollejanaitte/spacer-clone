// JSON入出力とエクスポート方式の実装
import type { Project } from "./model";
import { validateProject, ValidationError } from "./validation";

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function parseProject(text: string): Project {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    throw new ValidationError([{ code: "PARSE", path: "ROOT", message: "JSON の構文エラー" }]);
  }
  const issues = validateProject(obj);
  if (issues.length > 0) {
    throw new ValidationError(issues);
  }
  return obj as Project;
}

export function download(name: string, text: string, mime = "application/json"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}
