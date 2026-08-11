import { useState } from "react";
import { IntegrityCheckResult } from "../components/IntegrityCheckResult";
import { getProjectManager } from "../project/projectManagerInstance";
import {
  inspectPackageContent,
  extractProjectFromPackage,
} from "../persistence/package/projectPackageImporter";
import { hasUnsafePathInPackage } from "../persistence/package/packagePathSafety";
import { navigateTo, NEXT_BUSINESS_LIST_PATH, NEXT_PROJECT_HOME_PATH } from "../routes";
import type { IntegrityReport } from "../persistence/package/projectPackageInspector";
import type { SpacerProjPackage } from "../persistence/package/projectPackage";

export type LoadStage = "idle" | "inspecting" | "checked" | "importing" | "imported";

export function LoadBusinessPage() {
  const [stage, setStage] = useState<LoadStage>("idle");
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [pkg, setPkg] = useState<SpacerProjPackage | null>(null);
  const [rawContent, setRawContent] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSelectAndInspect() {
    setMessage(null);
    setStage("inspecting");
    try {
      const opened = await pickPackageFile();
      if (!opened) {
        setStage("idle");
        return;
      }
      setFileName(opened.fileName);
      setRawContent(opened.content);
      const result = inspectPackageContent(opened.fileName, opened.content);
      setReport(result.ok ? result.report : (result.report ?? null));
      setPkg(result.ok ? result.pkg : null);
      setStage("checked");
      if (!result.ok) {
        setMessage(`読込できません: ${result.reason}`);
      }
    } catch {
      setReport(null);
      setPkg(null);
      setStage("idle");
      setMessage("Packageを読み込めませんでした。");
    }
  }

  async function handleImport() {
    if (!pkg || !report) return;
    const project = extractProjectFromPackage(pkg);
    if (!project) {
      setMessage("PackageからProjectを抽出できませんでした。");
      return;
    }
    setStage("importing");
    // conflict check happens in Step D; for now, if ID exists we refuse overwrite
    const existing = getProjectManager().getProject(project.projectId);
    if (existing !== undefined) {
      setStage("checked");
      setMessage("同一Project IDが既に存在するため、読込を停止しました。（競合処理は後続Stepで実装）");
      return;
    }
    const registered = getProjectManager().importProject(project);
    if (!registered) {
      setStage("checked");
      setMessage("登録に失敗しました。");
      return;
    }
    await getProjectManager().flushPendingSaves();
    setStage("imported");
    navigateTo(`${NEXT_PROJECT_HOME_PATH}/${project.projectId}`);
  }

  return (
    <section className="next-page" data-testid="load-business-page">
      <h1 className="next-page-title">業務データ読込</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="load-back-list"
        onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
      >
        ← 業務一覧へ
      </button>
      <p className="next-hint">
        他のパソコンで作成した業務データ（.spacerproj）を読み込みます。
      </p>

      <div className="next-actions">
        <button type="button" data-testid="select-package-button" onClick={() => void handleSelectAndInspect()}>
          .spacerprojを選択して検査
        </button>
      </div>

      {message !== null && (
        <div className="next-error" data-testid="load-message">
          {message}
        </div>
      )}

      {stage === "inspecting" && <p className="next-hint">検査中...</p>}

      {stage === "checked" && report && (
        <>
          <IntegrityCheckResult report={report} />
          {report.verdict === "loadable" && pkg && !hasUnsafePathInPackage(pkg) && (
            <div className="next-actions">
              <button type="button" data-testid="confirm-import-button" onClick={() => void handleImport()}>
                読込
              </button>
            </div>
          )}
        </>
      )}

      {stage === "importing" && <p className="next-hint">読み込み中...</p>}
      {stage === "imported" && <p className="next-hint" data-testid="import-complete">登録しました。</p>}
    </section>
  );
}

async function pickPackageFile(): Promise<{ fileName: string; content: string } | null> {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".spacerproj,application/json";
  const file = await new Promise<File | undefined>((resolve) => {
    input.addEventListener("change", () => resolve(input.files?.[0]));
    document.body.appendChild(input);
    input.click();
  });
  input.remove();
  if (!file) return null;
  const content = await file.text();
  return { fileName: file.name, content };
}
